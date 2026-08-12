import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DocumentSidebar } from './components/DocumentSidebar';
import { ChatWindow } from './components/ChatWindow';
import { SettingsModal } from './components/SettingsModal';
import { ChunkInspectorModal } from './components/ChunkInspectorModal';
import { SystemStatus, DocumentMetadata, ChatMessage } from './types';

export default function App() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals & Drawers
  const [isOpenSidebarMobile, setIsOpenSidebarMobile] = useState(false);
  const [isOpenSettings, setIsOpenSettings] = useState(false);
  const [inspectingDoc, setInspectingDoc] = useState<DocumentMetadata | null>(null);

  // Settings
  const [providerPref, setProviderPref] = useState<'auto' | 'gemini' | 'ollama'>('auto');
  const [retrievalK, setRetrievalK] = useState<number>(4);
  const [ollamaUrl, setOllamaUrl] = useState<string>('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState<string>('qwen2.5:1.5b');
  const [isTestingOllama, setIsTestingOllama] = useState(false);
  const [ollamaTestResult, setOllamaTestResult] = useState<{ available: boolean; models: string[] } | null>(null);

  // Fetch System Health
  const fetchHealth = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (data.ollamaUrl) setOllamaUrl(data.ollamaUrl);
        if (data.ollamaModel) setOllamaModel(data.ollamaModel);
      }
    } catch (err) {
      console.error('Health check error:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Fetch Document List
  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const docs: DocumentMetadata[] = await res.json();
        setDocuments(docs);

        // Keep newly uploaded docs in selected scope
        setSelectedDocIds(prev => {
          const validPrev = prev.filter(id => docs.some(d => d.id === id));
          if (validPrev.length === 0 && docs.length > 0) {
            return docs.map(d => d.id);
          }
          return validPrev;
        });
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchDocuments();
  }, []);

  // Upload PDFs
  const handleUploadPdfs = async (files: FileList | File[]) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('pdfFiles', file);
      });

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        await fetchDocuments();
        await fetchHealth();
      } else {
        let errorMsg = 'Failed to upload PDF document(s).';
        try {
          const errData = await res.json();
          errorMsg = errData.error || errorMsg;
        } catch {
          const text = await res.text();
          errorMsg = text || errorMsg;
        }
        alert(errorMsg);
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      alert(`Upload failed: ${err?.message || 'Network or server error.'}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Load Demo PDF
  const handleLoadDemoPdf = async () => {
    setIsUploading(true);
    try {
      const res = await fetch('/api/documents/demo', { method: 'POST' });
      if (res.ok) {
        await fetchDocuments();
        await fetchHealth();
      }
    } catch (err) {
      console.error('Failed to load demo PDF:', err);
    } finally {
      setIsUploading(false);
    }
  };

  // Delete Document
  const handleDeleteDoc = async (docId: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchDocuments();
        await fetchHealth();
      }
    } catch (err) {
      console.error('Delete doc error:', err);
    }
  };

  // Clear All Documents
  const handleClearAllDocs = async () => {
    if (!confirm('Are you sure you want to remove all indexed PDF documents?')) return;
    try {
      const res = await fetch('/api/documents', { method: 'DELETE' });
      if (res.ok) {
        setDocuments([]);
        setSelectedDocIds([]);
        await fetchHealth();
      }
    } catch (err) {
      console.error('Clear docs error:', err);
    }
  };

  // Toggle Selection
  const handleToggleDocSelection = (docId: string) => {
    setSelectedDocIds(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  // Select All Docs
  const handleSelectAllDocs = () => {
    if (selectedDocIds.length === documents.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(documents.map(d => d.id));
    }
  };

  // Test Ollama Connection
  const handleTestOllama = async () => {
    setIsTestingOllama(true);
    try {
      const res = await fetch('/api/ollama/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: ollamaUrl, model: ollamaModel }),
      });
      if (res.ok) {
        const data = await res.json();
        setOllamaTestResult({ available: data.available, models: data.models || [] });
        await fetchHealth();
      } else {
        setOllamaTestResult({ available: false, models: [] });
      }
    } catch (err) {
      setOllamaTestResult({ available: false, models: [] });
    } finally {
      setIsTestingOllama(false);
    }
  };

  // Send RAG Query
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsGenerating(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          docIds: selectedDocIds,
          retrievalK,
          providerPreference: providerPref,
          ollamaUrl,
          ollamaModel,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMsg: ChatMessage = {
          id: 'msg-' + Date.now() + '-reply',
          role: 'assistant',
          content: data.content,
          citations: data.citations,
          provider: data.provider,
          latencyMs: data.latencyMs,
          retrievedCount: data.retrievedCount,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        const errData = await res.json();
        const errorMsg: ChatMessage = {
          id: 'msg-' + Date.now() + '-err',
          role: 'assistant',
          content: `**Error processing query:** ${errData.error || 'Server error occurred.'}`,
          error: true,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: 'msg-' + Date.now() + '-err',
        role: 'assistant',
        content: `**Network Error:** Could not connect to RAG server backend. Please ensure the server is running.`,
        error: true,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div id="app-root" className="min-h-screen h-screen flex flex-col bg-slate-100 font-sans text-gray-900 overflow-hidden">
      {/* Top Header */}
      <Header
        status={status}
        onOpenSidebar={() => setIsOpenSidebarMobile(true)}
        onOpenSettings={() => setIsOpenSettings(true)}
        onRefreshStatus={fetchHealth}
        isRefreshing={isRefreshing}
      />

      {/* Main Content Split Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Document Knowledge Base Sidebar */}
        <DocumentSidebar
          documents={documents}
          selectedDocIds={selectedDocIds}
          onToggleDocSelection={handleToggleDocSelection}
          onSelectAllDocs={handleSelectAllDocs}
          onUploadPdfs={handleUploadPdfs}
          onLoadDemoPdf={handleLoadDemoPdf}
          onDeleteDoc={handleDeleteDoc}
          onClearAllDocs={handleClearAllDocs}
          onInspectChunks={doc => setInspectingDoc(doc)}
          isUploading={isUploading}
          isOpenMobile={isOpenSidebarMobile}
          onCloseMobile={() => setIsOpenSidebarMobile(false)}
        />

        {/* Primary RAG Chat Window */}
        <ChatWindow
          messages={messages}
          onSendMessage={handleSendMessage}
          isGenerating={isGenerating}
          documents={documents}
          selectedDocIds={selectedDocIds}
          onOpenSidebar={() => setIsOpenSidebarMobile(true)}
          onLoadDemoPdf={handleLoadDemoPdf}
        />
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isOpenSettings}
        onClose={() => setIsOpenSettings(false)}
        status={status}
        providerPref={providerPref}
        setProviderPref={setProviderPref}
        retrievalK={retrievalK}
        setRetrievalK={setRetrievalK}
        ollamaUrl={ollamaUrl}
        setOllamaUrl={setOllamaUrl}
        ollamaModel={ollamaModel}
        setOllamaModel={setOllamaModel}
        onTestOllama={handleTestOllama}
        isTestingOllama={isTestingOllama}
        ollamaTestResult={ollamaTestResult}
      />

      {/* Chunk Inspector Modal */}
      <ChunkInspectorModal
        document={inspectingDoc}
        onClose={() => setInspectingDoc(null)}
      />
    </div>
  );
}
