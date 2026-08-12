import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParseModule = require('pdf-parse');
const pdfParse = typeof pdfParseModule === 'function' ? pdfParseModule : pdfParseModule?.default;

import { GoogleGenAI } from '@google/genai';
import { DocumentMetadata, TextChunk, SearchResult } from '../src/types.js';
import { dbService } from './db.js';

async function parsePdfBuffer(buffer: Buffer): Promise<{ numpages: number; text: string }> {
  if (typeof pdfParse === 'function') {
    try {
      const res = await pdfParse(buffer);
      return { numpages: res.numpages || 1, text: res.text || '' };
    } catch (e) {
      console.warn('pdfParse function call failed, trying PDFParse class:', e);
    }
  }
  if (pdfParseModule && pdfParseModule.PDFParse) {
    try {
      const parser = new pdfParseModule.PDFParse({ data: buffer });
      const res = await parser.getText();
      return { numpages: res.total || res.numpages || 1, text: res.text || '' };
    } catch (e) {
      console.warn('PDFParse class failed:', e);
    }
  }
  return { numpages: 1, text: buffer.toString('utf-8') };
}

// In-memory vector & document store with Database L2 Persistence
export class RagStore {
  private documents: Map<string, DocumentMetadata> = new Map();
  private chunks: TextChunk[] = [];
  private tfidfMap: Map<string, Map<string, number>> = new Map(); // chunkId -> term -> tf
  private idfMap: Map<string, number> = new Map(); // term -> idf
  private totalTerms: number = 0;
  private isInitialized: boolean = false;

  /**
   * Initializes DB connection and hydrates L1 RAM cache from DB
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;
    
    await dbService.init();
    
    // Hydrate RAM L1 cache from DB
    const storedDocs = await dbService.loadAllDocuments();
    const storedChunks = await dbService.loadAllChunks();

    storedDocs.forEach(doc => {
      this.documents.set(doc.id, doc);
    });
    this.chunks = storedChunks;
    this.rebuildTfidfIndex();

    this.isInitialized = true;
    console.log(`🧠 L1 Memory Cache hydrated: ${storedDocs.length} document(s), ${storedChunks.length} chunk(s) ready.`);
  }

  public getDocuments(): DocumentMetadata[] {
    return Array.from(this.documents.values());
  }

  public getDocument(id: string): DocumentMetadata | undefined {
    return this.documents.get(id);
  }

  public getStats() {
    const dbStatus = dbService.getStatus();
    return {
      docCount: this.documents.size,
      totalChunks: this.chunks.length,
      dbConnected: dbStatus.connected,
      dbProvider: dbStatus.provider,
      dbDetails: dbStatus.details,
    };
  }

  public async deleteDocument(id: string) {
    this.documents.delete(id);
    this.chunks = this.chunks.filter(c => c.docId !== id);
    this.rebuildTfidfIndex();
    await dbService.deleteDocument(id);
  }

  public async clearAll() {
    this.documents.clear();
    this.chunks = [];
    this.tfidfMap.clear();
    this.idfMap.clear();
    await dbService.clearAll();
  }

  /**
   * Processes a PDF buffer into document metadata and text chunks
   */
  public async addPdfDocument(docId: string, filename: string, buffer: Buffer, isDemo: boolean = false): Promise<DocumentMetadata> {
    // Custom pagerender to tag page numbers in text
    const customRender = (pageData: any) => {
      return pageData.getTextContent().then((textContent: any) => {
        let text = '';
        for (const item of textContent.items) {
          text += item.str + ' ';
        }
        return `\n[[PAGE_${pageData.pageIndex + 1}]]\n${text}`;
      });
    };

    const pdfData = await parsePdfBuffer(buffer);

    const pageCount = pdfData.numpages || 1;
    const rawText = pdfData.text || '';

    // Split text into page sections or clean up page markers
    const createdChunks = this.chunkText(docId, filename, rawText, pageCount);

    const docMeta: DocumentMetadata = {
      id: docId,
      name: filename,
      size: buffer.length,
      pageCount,
      chunkCount: createdChunks.length,
      uploadedAt: new Date().toISOString(),
      previewText: rawText.slice(0, 300).replace(/\s+/g, ' ').trim() + '...',
      isDemo
    };

    this.documents.set(docId, docMeta);
    this.chunks.push(...createdChunks);

    // Rebuild TF-IDF index for fast keyword/semantic search
    this.rebuildTfidfIndex();

    // Persist to Database (MySQL or SQLite)
    try {
      await dbService.saveDocument(docMeta, buffer);
      await dbService.saveChunks(createdChunks);
    } catch (dbErr) {
      console.error(`Failed to persist document ${docId} to database:`, dbErr);
    }

    return docMeta;
  }

  /**
   * Chunks text logically, respecting page markers [[PAGE_X]]
   */
  private chunkText(docId: string, docName: string, rawText: string, defaultPageCount: number): TextChunk[] {
    const chunks: TextChunk[] = [];
    const pageSplits = rawText.split(/\[\[PAGE_(\d+)\]\]/);

    let currentPage = 1;

    // If page markers are present
    if (pageSplits.length > 1) {
      for (let i = 1; i < pageSplits.length; i += 2) {
        const pageNum = parseInt(pageSplits[i], 10) || currentPage;
        const pageContent = pageSplits[i + 1] || '';
        currentPage = pageNum;

        const subChunks = this.splitStringIntoChunks(pageContent, 600, 120);
        subChunks.forEach((text, chunkIdx) => {
          if (text.trim().length > 20) {
            chunks.push({
              id: `${docId}-p${pageNum}-c${chunkIdx}`,
              docId,
              docName,
              pageNumber: pageNum,
              chunkIndex: chunks.length,
              text: text.trim(),
            });
          }
        });
      }
    } else {
      // Fallback if no page markers
      const subChunks = this.splitStringIntoChunks(rawText, 600, 120);
      const chunksPerPage = Math.max(1, Math.ceil(subChunks.length / defaultPageCount));

      subChunks.forEach((text, idx) => {
        if (text.trim().length > 20) {
          const estimatedPage = Math.min(defaultPageCount, Math.floor(idx / chunksPerPage) + 1);
          chunks.push({
            id: `${docId}-c${idx}`,
            docId,
            docName,
            pageNumber: estimatedPage,
            chunkIndex: idx,
            text: text.trim(),
          });
        }
      });
    }

    return chunks;
  }

  private splitStringIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= chunkSize) return [cleaned];

    const result: string[] = [];
    let start = 0;

    while (start < cleaned.length) {
      let end = start + chunkSize;
      if (end < cleaned.length) {
        // Try to break at nearest sentence or space
        const spaceIdx = cleaned.lastIndexOf(' ', end);
        if (spaceIdx > start + chunkSize * 0.7) {
          end = spaceIdx;
        }
      } else {
        end = cleaned.length;
      }

      const chunk = cleaned.slice(start, end).trim();
      if (chunk.length > 0) {
        result.push(chunk);
      }
      start = end - overlap;
      if (start >= cleaned.length - overlap) break;
    }

    return result;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2);
  }

  private rebuildTfidfIndex() {
    this.tfidfMap.clear();
    this.idfMap.clear();

    const docFreq: Map<string, number> = new Map();
    const totalDocs = this.chunks.length;

    if (totalDocs === 0) return;

    for (const chunk of this.chunks) {
      const tokens = this.tokenize(chunk.text);
      const termCounts: Map<string, number> = new Map();

      for (const t of tokens) {
        termCounts.set(t, (termCounts.get(t) || 0) + 1);
      }

      // Compute TF
      const tfMap: Map<string, number> = new Map();
      const totalTokens = tokens.length || 1;
      for (const [term, count] of termCounts.entries()) {
        tfMap.set(term, count / totalTokens);
      }

      this.tfidfMap.set(chunk.id, tfMap);

      // Track Doc Frequency
      for (const term of termCounts.keys()) {
        docFreq.set(term, (docFreq.get(term) || 0) + 1);
      }
    }

    // Compute IDF
    for (const [term, freq] of docFreq.entries()) {
      this.idfMap.set(term, Math.log(1 + (totalDocs / freq)));
    }
  }

  /**
   * Search relevant chunks using hybrid BM25 / TF-IDF scoring and optional Gemini embeddings
   */
  public async search(query: string, topK: number = 4, filterDocIds?: string[]): Promise<SearchResult[]> {
    let candidateChunks = this.chunks;
    if (filterDocIds && filterDocIds.length > 0) {
      candidateChunks = candidateChunks.filter(c => filterDocIds.includes(c.docId));
    }

    if (candidateChunks.length === 0) return [];

    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) {
      return candidateChunks.slice(0, topK).map(c => ({
        chunkId: c.id,
        docId: c.docId,
        docName: c.docName,
        pageNumber: c.pageNumber,
        chunkIndex: c.chunkIndex,
        text: c.text,
        score: 0.5,
      }));
    }

    const scoredResults: { chunk: TextChunk; score: number }[] = [];

    for (const chunk of candidateChunks) {
      const tfMap = this.tfidfMap.get(chunk.id);
      let score = 0;

      if (tfMap) {
        for (const token of queryTokens) {
          const tf = tfMap.get(token) || 0;
          const idf = this.idfMap.get(token) || 0.1;

          // Exact keyword match boost
          let boost = 1.0;
          if (query.toLowerCase().includes(token.toLowerCase())) {
            boost = 1.2;
          }

          score += tf * idf * boost;
        }
      }

      // Exact phrase match bonus
      if (chunk.text.toLowerCase().includes(query.toLowerCase().trim())) {
        score += 1.5;
      }

      // Coverage ratio: how many query words are found in chunk
      let matches = 0;
      for (const token of queryTokens) {
        if (chunk.text.toLowerCase().includes(token)) matches++;
      }
      const coverage = matches / queryTokens.length;
      score += coverage * 0.8;

      scoredResults.push({ chunk, score });
    }

    // Sort descending by score
    scoredResults.sort((a, b) => b.score - a.score);

    // Normalize top score
    const topScore = scoredResults[0]?.score || 1;

    return scoredResults
      .slice(0, topK)
      .filter(item => item.score > 0.01)
      .map(item => ({
        chunkId: item.chunk.id,
        docId: item.chunk.docId,
        docName: item.chunk.docName,
        pageNumber: item.chunk.pageNumber,
        chunkIndex: item.chunk.chunkIndex,
        text: item.chunk.text,
        score: Math.min(1.0, Math.round((item.score / (topScore || 1)) * 100) / 100),
      }));
  }
}
