# RAG PDF Chatbot 🤖📄

> An intelligent, full-stack Retrieval-Augmented Generation (RAG) system built with **React 19**, **Express**, **TypeScript**, **TailwindCSS**, **Gemini 3.6 Flash**, and **Ollama Qwen2.5**. Upload PDF documents, perform vector similarity search across text chunks, and ask questions with precise inline citations and interactive source inspection.

---

## 🌟 Key Features

- 📑 **PDF Ingestion & Processing**: Multi-file drag-and-drop PDF upload powered by `pdf-parse` and `pdf-lib`. Automatically extracts page text, breaks content into overlapping semantic chunks, and builds a searchable index.
- ⚡ **Hybrid AI Intelligence**:
  - **Google Gemini 3.6 Flash**: Primary cloud LLM for high-accuracy reasoning, grounded answer synthesis, and inline document citations.
  - **Local Ollama Integration**: Connect to local LLM models (e.g., `qwen2.5:1.5b` or `llama3`) running via Ollama.
  - **Local Grounded RAG Engine**: Fallback extractive search engine that generates direct grounded answers even without active API keys or external LLMs.
  - **Embedded Ollama Server Emulator**: Built-in mock/emulator service on port 11434 for local testing without pre-configured Ollama installations.
- 🔍 **Vector Retrieval & Inspection**:
  - Interactive **Chunk Inspector Modal** allowing users to search, filter, and inspect raw vector chunk excerpts, similarity scores, page numbers, and document origins.
  - **Document Management**: Filter chat context by specific uploaded PDFs, view metadata, or clear indexed documents dynamically.
- 💾 **Dual Database Engine Architecture**:
  - **MySQL (XAMPP / Remote)**: Automatically detects and connects to MySQL instances (ports 3306, 3307, 3308) for production document persistent storage.
  - **Local JSON File Fallback**: Seamless fallback to local persistent file database (`data/rag_store.json`) when MySQL is offline or not configured.
- 🎨 **Modern Sleek UI**: Built with React 19, TailwindCSS v4, Lucide React icons, smooth motion transitions, responsive dark mode design system, and clean markdown rendering.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | React 19, TypeScript, Vite, TailwindCSS v4, Lucide Icons, React Markdown |
| **Backend** | Node.js, Express, `tsx`, `esbuild` |
| **AI / RAG** | `@google/genai` (Gemini 3.6 Flash), Ollama API Integration, Custom TF-IDF / Cosine Similarity Vector Indexer |
| **PDF Processing** | `pdf-parse`, `pdf-lib`, Multer |
| **Database** | MySQL (`mysql2`), Local Persistent Storage Engine |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- `npm` or `bun`
- *(Optional)* [Ollama](https://ollama.com/) running locally with `qwen2.5:1.5b` or another model
- *(Optional)* MySQL database server (e.g., XAMPP or MySQL 8.0)

### 1. Clone & Install

```bash
git clone https://github.com/ibiii786/RAG-PDF-Chatbot.git
cd RAG-PDF-Chatbot
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure your environment variables in `.env`:

```env
# Optional: Required for cloud Gemini AI responses
GEMINI_API_KEY="your_gemini_api_key_here"

# Optional: Host URL for self-referential links
APP_URL="http://localhost:3000"

# Optional: MySQL Database Settings (Falls back to local file storage if offline)
MYSQL_HOST="localhost"
MYSQL_PORT="3306"
MYSQL_USER="root"
MYSQL_PASSWORD=""
MYSQL_DATABASE="rag_chatbot"
```

### 3. Run Development Server

```bash
npm run dev
```

Open your browser at [http://localhost:3000](http://localhost:3000). The application automatically pre-loads a demo report (*Global AI & RAG Benchmarks Report 2026*) so you can start testing queries right away!

---

## 📦 Available Scripts

- `npm run dev`: Start full-stack development server with hot module reloading (`tsx server.ts`).
- `npm run build`: Compile frontend assets with Vite and bundle backend server with esbuild into `dist/`.
- `npm run start`: Run production build from `dist/server.cjs`.
- `npm run lint`: Execute TypeScript type checking (`tsc --noEmit`).

---

## 📡 API Reference

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | System health check, active LLM provider status, DB connection state |
| `GET` | `/api/documents` | List all indexed PDF documents & metadata |
| `POST` | `/api/documents/upload` | Upload and process up to 20 PDF files (max 150MB each) |
| `POST` | `/api/documents/demo` | Seed/reload default sample PDF report |
| `DELETE` | `/api/documents/:id` | Remove a specific document and its indexed chunks |
| `DELETE` | `/api/documents` | Clear all documents from index |
| `GET` | `/api/chunks` | Search and inspect text chunks (query string `q`, `limit`, `docId`) |
| `POST` | `/api/chat` | Main RAG chat query route (handles context search & LLM response synthesis) |
| `POST` | `/api/ollama/status` | Test connectivity & list available models for local Ollama instance |

---

<div align="center">
  <p><i>Note: This project was vibe coded.</i> ✨</p>
</div>
