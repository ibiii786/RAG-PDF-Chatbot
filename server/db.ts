import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { DocumentMetadata, TextChunk } from '../src/types.js';

const require = createRequire(import.meta.url);
const mysql = require('mysql2/promise');

export interface DbStatus {
  connected: boolean;
  provider: 'MySQL' | 'SQLite' | 'Local File DB' | 'Disconnected';
  details: string;
}

interface JsonDbData {
  documents: DocumentMetadata[];
  chunks: TextChunk[];
}

class DatabaseService {
  private mysqlPool: any = null;
  private jsonDbPath: string = '';
  private status: DbStatus = {
    connected: false,
    provider: 'Disconnected',
    details: 'Database not initialized',
  };

  /**
   * Initializes the database connection (MySQL or Local File DB fallback)
   */
  public async init(): Promise<DbStatus> {
    const mysqlHost = process.env.MYSQL_HOST || '127.0.0.1';
    const mysqlUser = process.env.MYSQL_USER || 'root';
    const mysqlPassword = process.env.MYSQL_PASSWORD || '';
    const mysqlDatabase = process.env.MYSQL_DATABASE || 'rag_chatbot';
    
    // Auto-detect port (check configured MYSQL_PORT first, then standard XAMPP ports 3306 and 3307)
    const candidatePorts = process.env.MYSQL_PORT 
      ? [parseInt(process.env.MYSQL_PORT, 10)] 
      : [3306, 3307, 3308];

    // 1. Try MySQL Connection (e.g. XAMPP MySQL server at 127.0.0.1)
    for (const port of candidatePorts) {
      try {
        console.log(`🔌 Connecting to XAMPP MySQL server at ${mysqlHost}:${port} (user: ${mysqlUser})...`);
        
        const rootConnection = await mysql.createConnection({
          host: mysqlHost,
          port: port,
          user: mysqlUser,
          password: mysqlPassword,
        });

        await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${mysqlDatabase}\`;`);
        await rootConnection.end();

        this.mysqlPool = mysql.createPool({
          host: mysqlHost,
          port: port,
          user: mysqlUser,
          password: mysqlPassword,
          database: mysqlDatabase,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
        });

        await this.createMysqlTables();
        this.status = {
          connected: true,
          provider: 'MySQL',
          details: `Connected to XAMPP MySQL database "${mysqlDatabase}" at ${mysqlHost}:${port}`,
        };
        console.log(`✅ ${this.status.details}`);
        return this.status;
      } catch (err: any) {
        // If not a connection refused on candidate port, log warning
        if (err.code !== 'ECONNREFUSED') {
          console.warn(`⚠️ MySQL connection error on port ${port}:`, err.message || err);
        }
      }
    }

    console.warn(`⚠️ Could not connect to MySQL on ports ${candidatePorts.join(', ')}. Using local persistent file database fallback.`);
    this.mysqlPool = null;

    // 2. Local Persistent Storage Fallback (data/rag_store.json)
    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      this.jsonDbPath = path.join(dataDir, 'rag_store.json');
      if (!fs.existsSync(this.jsonDbPath)) {
        fs.writeFileSync(this.jsonDbPath, JSON.stringify({ documents: [], chunks: [] }, null, 2), 'utf-8');
      }

      this.status = {
        connected: true,
        provider: 'Local File DB',
        details: `Persistent store active at ${this.jsonDbPath}`,
      };
      console.log(`✅ ${this.status.details}`);
      return this.status;
    } catch (err: any) {
      console.error('❌ Failed to initialize local persistent database:', err);
      this.status = {
        connected: false,
        provider: 'Disconnected',
        details: err.message || 'Storage initialization error',
      };
      return this.status;
    }
  }

  public getStatus(): DbStatus {
    return this.status;
  }

  // --- MySQL Schema Creation ---
  private async createMysqlTables(): Promise<void> {
    if (!this.mysqlPool) return;

    await this.mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id VARCHAR(128) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        size INT NOT NULL,
        page_count INT NOT NULL,
        chunk_count INT NOT NULL,
        uploaded_at VARCHAR(64) NOT NULL,
        preview_text TEXT,
        is_demo TINYINT(1) DEFAULT 0
      );
    `);

    await this.mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS chunks (
        id VARCHAR(128) PRIMARY KEY,
        doc_id VARCHAR(128) NOT NULL,
        doc_name VARCHAR(255) NOT NULL,
        page_number INT NOT NULL,
        chunk_index INT NOT NULL,
        text LONGTEXT NOT NULL,
        INDEX idx_doc_id (doc_id)
      );
    `);

    await this.mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS pdf_files (
        doc_id VARCHAR(128) PRIMARY KEY,
        buffer LONGBLOB NOT NULL
      );
    `);
  }

  // --- Helper for Local JSON Store ---
  private readJsonDb(): JsonDbData {
    if (!this.jsonDbPath || !fs.existsSync(this.jsonDbPath)) {
      return { documents: [], chunks: [] };
    }
    try {
      const content = fs.readFileSync(this.jsonDbPath, 'utf-8');
      return JSON.parse(content || '{"documents":[],"chunks":[]}');
    } catch (e) {
      return { documents: [], chunks: [] };
    }
  }

  private writeJsonDb(data: JsonDbData): void {
    if (!this.jsonDbPath) return;
    try {
      fs.writeFileSync(this.jsonDbPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write local database file:', e);
    }
  }

  // --- CRUD Operations ---

  public async loadAllDocuments(): Promise<DocumentMetadata[]> {
    if (this.mysqlPool) {
      const [rows] = await this.mysqlPool.query('SELECT * FROM documents ORDER BY uploaded_at DESC');
      return (rows as any[]).map(r => ({
        id: r.id,
        name: r.name,
        size: r.size,
        pageCount: r.page_count,
        chunkCount: r.chunk_count,
        uploadedAt: r.uploaded_at,
        previewText: r.preview_text || '',
        isDemo: Boolean(r.is_demo),
      }));
    } else {
      const data = this.readJsonDb();
      return data.documents || [];
    }
  }

  public async loadAllChunks(): Promise<TextChunk[]> {
    if (this.mysqlPool) {
      const [rows] = await this.mysqlPool.query('SELECT * FROM chunks ORDER BY chunk_index ASC');
      return (rows as any[]).map(r => ({
        id: r.id,
        docId: r.doc_id,
        docName: r.doc_name,
        pageNumber: r.page_number,
        chunkIndex: r.chunk_index,
        text: r.text,
      }));
    } else {
      const data = this.readJsonDb();
      return data.chunks || [];
    }
  }

  public async saveDocument(doc: DocumentMetadata, buffer?: Buffer): Promise<void> {
    if (this.mysqlPool) {
      await this.mysqlPool.query(
        `INSERT INTO documents (id, name, size, page_count, chunk_count, uploaded_at, preview_text, is_demo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=?, size=?, page_count=?, chunk_count=?, preview_text=?`,
        [
          doc.id,
          doc.name,
          doc.size,
          doc.pageCount,
          doc.chunkCount,
          doc.uploadedAt,
          doc.previewText,
          doc.isDemo ? 1 : 0,
          doc.name,
          doc.size,
          doc.pageCount,
          doc.chunkCount,
          doc.previewText,
        ]
      );

      if (buffer) {
        await this.mysqlPool.query(
          `INSERT INTO pdf_files (doc_id, buffer) VALUES (?, ?) ON DUPLICATE KEY UPDATE buffer=?`,
          [doc.id, buffer, buffer]
        );
      }
    } else {
      const data = this.readJsonDb();
      const existingIdx = data.documents.findIndex(d => d.id === doc.id);
      if (existingIdx >= 0) {
        data.documents[existingIdx] = doc;
      } else {
        data.documents.unshift(doc);
      }
      this.writeJsonDb(data);
    }
  }

  public async saveChunks(chunks: TextChunk[]): Promise<void> {
    if (chunks.length === 0) return;

    if (this.mysqlPool) {
      const connection = await this.mysqlPool.getConnection();
      try {
        await connection.beginTransaction();
        for (const c of chunks) {
          await connection.query(
            `INSERT INTO chunks (id, doc_id, doc_name, page_number, chunk_index, text)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE text=?`,
            [c.id, c.docId, c.docName, c.pageNumber, c.chunkIndex, c.text, c.text]
          );
        }
        await connection.commit();
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    } else {
      const data = this.readJsonDb();
      const chunkMap = new Map<string, TextChunk>(data.chunks.map(c => [c.id, c]));
      chunks.forEach(c => chunkMap.set(c.id, c));
      data.chunks = Array.from(chunkMap.values());
      this.writeJsonDb(data);
    }
  }

  public async deleteDocument(docId: string): Promise<void> {
    if (this.mysqlPool) {
      await this.mysqlPool.query('DELETE FROM documents WHERE id = ?', [docId]);
      await this.mysqlPool.query('DELETE FROM chunks WHERE doc_id = ?', [docId]);
      await this.mysqlPool.query('DELETE FROM pdf_files WHERE doc_id = ?', [docId]);
    } else {
      const data = this.readJsonDb();
      data.documents = data.documents.filter(d => d.id !== docId);
      data.chunks = data.chunks.filter(c => c.docId !== docId);
      this.writeJsonDb(data);
    }
  }

  public async clearAll(): Promise<void> {
    if (this.mysqlPool) {
      await this.mysqlPool.query('TRUNCATE TABLE documents');
      await this.mysqlPool.query('TRUNCATE TABLE chunks');
      await this.mysqlPool.query('TRUNCATE TABLE pdf_files');
    } else {
      this.writeJsonDb({ documents: [], chunks: [] });
    }
  }
}

export const dbService = new DatabaseService();
