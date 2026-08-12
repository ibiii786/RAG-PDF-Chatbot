export interface DocumentMetadata {
  id: string;
  name: string;
  size: number;
  pageCount: number;
  chunkCount: number;
  uploadedAt: string;
  previewText?: string;
  isDemo?: boolean;
}

export interface TextChunk {
  id: string;
  docId: string;
  docName: string;
  pageNumber: number;
  chunkIndex: number;
  text: string;
  vector?: number[];
}

export interface SearchResult {
  chunkId: string;
  docId: string;
  docName: string;
  pageNumber: number;
  chunkIndex: number;
  text: string;
  score: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  citations?: SearchResult[];
  provider?: string;
  latencyMs?: number;
  retrievedCount?: number;
  error?: boolean;
}

export interface SystemStatus {
  geminiAvailable: boolean;
  ollamaAvailable: boolean;
  activeProvider: 'gemini' | 'ollama' | 'local-rag';
  docCount: number;
  totalChunks: number;
  ollamaUrl: string;
  ollamaModel: string;
  dbConnected?: boolean;
  dbProvider?: 'MySQL' | 'SQLite' | 'Local File DB' | 'Disconnected';
  dbDetails?: string;
}

export interface ChatRequestOptions {
  message: string;
  docIds?: string[];
  retrievalK?: number;
  providerPreference?: 'auto' | 'gemini' | 'ollama';
  ollamaUrl?: string;
  ollamaModel?: string;
}
