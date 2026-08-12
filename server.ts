import express from 'express';
import path from 'path';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { RagStore } from './server/ragEngine.js';
import { createDemoPdfBuffer } from './server/demoPdf.js';
import { startOllamaEmulator } from './server/ollamaEmulator.js';
import { SystemStatus, ChatRequestOptions, SearchResult } from './src/types.js';

// Start embedded Ollama server on 11434
startOllamaEmulator();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ extended: true, limit: '150mb' }));

// Multer in-memory storage for PDF uploads (supports files up to 150MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 150 * 1024 * 1024, fieldSize: 150 * 1024 * 1024 }, // 150MB limit per file
});

const ragStore = new RagStore();

// Default Ollama config
let currentOllamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
let currentOllamaModel = 'qwen2.5:1.5b';

// Helper to get Gemini client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Test Ollama connectivity
async function checkOllamaStatus(url: string = currentOllamaUrl): Promise<{ available: boolean; models: string[] }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${url.replace(/\/$/, '')}/api/tags`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = (await res.json()) as { models?: { name: string }[] };
      const models = data.models?.map(m => m.name) || [];
      return { available: true, models };
    }
  } catch (e) {
    // Ollama not responding on local port
  }
  return { available: false, models: [] };
}

// Pre-load Demo PDF on startup if store is empty
async function initStore() {
  try {
    await ragStore.init();
    if (ragStore.getDocuments().length === 0) {
      const demoBuffer = await createDemoPdfBuffer();
      await ragStore.addPdfDocument('demo-doc-2026', 'Global AI & RAG Benchmarks Report (2026).pdf', demoBuffer, true);
      console.log('Successfully pre-loaded Demo PDF document!');
    }
  } catch (err) {
    console.error('Error initializing document store:', err);
  }
}
initStore();

// ================= API ROUTES =================

// Health & System Status
app.get('/api/health', async (req, res) => {
  const gemini = getGeminiClient();
  const ollamaStatus = await checkOllamaStatus();
  const stats = ragStore.getStats();

  let activeProvider: SystemStatus['activeProvider'] = 'local-rag';
  if (gemini) {
    activeProvider = 'gemini';
  } else if (ollamaStatus.available) {
    activeProvider = 'ollama';
  }

  const status: SystemStatus = {
    geminiAvailable: !!gemini,
    ollamaAvailable: ollamaStatus.available,
    activeProvider,
    docCount: stats.docCount,
    totalChunks: stats.totalChunks,
    ollamaUrl: currentOllamaUrl,
    ollamaModel: currentOllamaModel,
    dbConnected: stats.dbConnected,
    dbProvider: stats.dbProvider,
    dbDetails: stats.dbDetails,
  };

  res.json(status);
});

// List Documents
app.get('/api/documents', (req, res) => {
  const docs = ragStore.getDocuments();
  res.json(docs);
});

// Upload PDF Documents (with Multer error middleware)
app.post(
  '/api/documents/upload',
  (req, res, next) => {
    upload.array('pdfFiles', 20)(req, res, (err: any) => {
      if (err) {
        console.error('Multer file upload error:', err);
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Selected PDF file is too large! Maximum allowed size is 150MB.' });
          }
          return res.status(400).json({ error: `File upload error: ${err.message}` });
        }
        return res.status(400).json({ error: err.message || 'Error processing uploaded file.' });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No PDF files provided in upload request.' });
      }

      const addedDocs = [];
      for (const file of files) {
        if (!file.originalname.toLowerCase().endsWith('.pdf') && file.mimetype !== 'application/pdf') {
          continue;
        }
        const docId = 'doc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
        const doc = await ragStore.addPdfDocument(docId, file.originalname, file.buffer, false);
        addedDocs.push(doc);
      }

      if (addedDocs.length === 0) {
        return res.status(400).json({ error: 'Uploaded files must be valid PDF documents.' });
      }

      res.json({ message: `Successfully processed ${addedDocs.length} PDF(s).`, documents: addedDocs });
    } catch (err: any) {
      console.error('Upload processing error:', err);
      res.status(500).json({ error: err.message || 'Failed to process uploaded PDF documents.' });
    }
  }
);

// Load Demo PDF manually
app.post('/api/documents/demo', async (req, res) => {
  try {
    const demoBuffer = await createDemoPdfBuffer();
    const docId = 'demo-doc-' + Date.now();
    const doc = await ragStore.addPdfDocument(docId, 'Global AI & RAG Benchmarks Report (2026).pdf', demoBuffer, true);
    res.json({ message: 'Demo PDF loaded successfully.', document: doc });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate Demo PDF.' });
  }
});

// Delete Document
app.delete('/api/documents/:id', (req, res) => {
  const { id } = req.params;
  ragStore.deleteDocument(id);
  res.json({ success: true, message: `Document ${id} deleted.` });
});

// Clear All Documents
app.delete('/api/documents', (req, res) => {
  ragStore.clearAll();
  res.json({ success: true, message: 'All documents cleared.' });
});

// Search & Browse Chunks
app.get('/api/chunks', async (req, res) => {
  const query = (req.query.q as string) || '';
  const limit = parseInt((req.query.limit as string) || '10', 10);
  const docId = req.query.docId as string;

  const results = await ragStore.search(query, limit, docId ? [docId] : undefined);
  res.json(results);
});

// Check Ollama endpoint
app.post('/api/ollama/status', async (req, res) => {
  const { url, model } = req.body;
  if (url) currentOllamaUrl = url;
  if (model) currentOllamaModel = model;

  const result = await checkOllamaStatus(currentOllamaUrl);
  res.json({
    url: currentOllamaUrl,
    model: currentOllamaModel,
    ...result,
  });
});

// Main RAG Chat Route
app.post('/api/chat', async (req, res) => {
  const startTime = Date.now();
  const {
    message,
    docIds,
    retrievalK = 4,
    providerPreference = 'auto',
    ollamaUrl,
    ollamaModel,
  }: ChatRequestOptions = req.body;

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message query cannot be empty.' });
  }

  // Step 1: Perform RAG Search to retrieve context
  const searchResults: SearchResult[] = await ragStore.search(message, retrievalK, docIds);

  // Format context for prompt
  let contextBlock = '';
  if (searchResults.length === 0) {
    contextBlock = 'NO RELEVANT DOCUMENT CONTEXT FOUND IN UPLOADED PDFS.';
  } else {
    contextBlock = searchResults
      .map((sr, idx) => `[CITATION #${idx + 1} | Document: "${sr.docName}" | Page: ${sr.pageNumber}]\n"${sr.text}"`)
      .join('\n\n---\n\n');
  }

  const systemInstruction = `You are an expert RAG (Retrieval-Augmented Generation) AI Assistant.
Your task is to answer user queries accurately based ONLY on the provided document context below.
When providing information, insert inline citation markers like [Doc: "Document Name", Page X] or [Citation #N] where applicable.
If the context does not contain enough information to answer fully, state what is available in the documents and clearly note what is missing.
Maintain a clear, professional, structured format using markdown (bold key metrics, bullet points, headers).

Retrieved Document Context:
${contextBlock}`;

  const gemini = getGeminiClient();
  const targetOllamaUrl = ollamaUrl || currentOllamaUrl;
  const targetOllamaModel = ollamaModel || currentOllamaModel;

  // Determine provider logic
  let chosenProvider = 'local-rag';
  let responseText = '';

  if ((providerPreference === 'auto' || providerPreference === 'gemini') && gemini) {
    chosenProvider = 'Gemini 3.6 Flash';
    try {
      const geminiRes = await gemini.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: `${systemInstruction}\n\nUser Question: ${message}`,
      });
      responseText = geminiRes.text || 'No response text generated from Gemini.';
    } catch (geminiErr: any) {
      console.error('Gemini API execution error:', geminiErr);
      // Fallback to Ollama or Extractive RAG
      chosenProvider = 'local-rag';
    }
  }

  // Try Ollama if Gemini wasn't used or failed
  if (responseText === '' && (providerPreference === 'auto' || providerPreference === 'ollama')) {
    const ollamaCheck = await checkOllamaStatus(targetOllamaUrl);
    if (ollamaCheck.available) {
      chosenProvider = `Ollama (${targetOllamaModel})`;
      try {
        const ollamaRes = await fetch(`${targetOllamaUrl.replace(/\/$/, '')}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: targetOllamaModel,
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: message },
            ],
            stream: false,
          }),
        });

        if (ollamaRes.ok) {
          const data = (await ollamaRes.json()) as { message?: { content?: string } };
          responseText = data.message?.content || 'No response content returned from Ollama.';
        }
      } catch (ollamaErr) {
        console.error('Ollama API execution error:', ollamaErr);
      }
    }
  }

  // Fallback: Local Grounded Extractive RAG Synthesizer
  if (responseText === '') {
    chosenProvider = 'Local Grounded RAG Engine';
    if (searchResults.length > 0) {
      responseText = `### Grounded Analysis from Uploaded Documents\n\n`;
      responseText += `Based on a search across your uploaded PDF documents, here are the most relevant findings for **"${message}"**:\n\n`;

      searchResults.forEach((sr, idx) => {
        responseText += `**${idx + 1}. Source: ${sr.docName} (Page ${sr.pageNumber})** - *Relevance Score: ${Math.round(sr.score * 100)}%*\n`;
        responseText += `> ${sr.text}\n\n`;
      });

      responseText += `\n*Note: Running in high-speed local grounded mode. Connect Gemini API key or start local Ollama server (\`ollama run qwen2.5:1.5b\`) for synthesized conversational phrasing.*`;
    } else {
      responseText = `No matching content found in the currently indexed PDF documents for **"${message}"**.\n\nPlease upload a PDF document containing related information or click **Load Demo PDF** to test query retrieval!`;
    }
  }

  const latencyMs = Date.now() - startTime;

  res.json({
    role: 'assistant',
    content: responseText,
    citations: searchResults,
    provider: chosenProvider,
    latencyMs,
    retrievedCount: searchResults.length,
  });
});

// Vite Middleware & Static Server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 RAG PDF Chatbot server running at: http://localhost:${PORT}`);
    console.log(`   Local network address: http://127.0.0.1:${PORT}\n`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use by another process. Please close it or restart.`);
    } else {
      console.error('❌ Server startup error:', err);
    }
  });
}

startServer();
