import React, { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import {
  Send,
  Bot,
  User,
  Sparkles,
  FileText,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Clock,
  Search,
  BookOpen,
  ArrowRight,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { ChatMessage, SearchResult, DocumentMetadata } from '../types';

interface ChatWindowProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  isGenerating: boolean;
  documents: DocumentMetadata[];
  selectedDocIds: string[];
  onOpenSidebar: () => void;
  onLoadDemoPdf: () => Promise<void>;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  onSendMessage,
  isGenerating,
  documents,
  selectedDocIds,
  onOpenSidebar,
  onLoadDemoPdf,
}) => {
  const [inputQuery, setInputQuery] = useState('');
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [expandedCitationMsgId, setExpandedCitationMsgId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim() || isGenerating) return;
    const text = inputQuery;
    setInputQuery('');
    onSendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const suggestedQuestions = [
    'Summarize the core findings and key metrics across the PDF documents.',
    'What hardware specs and throughput numbers are reported?',
    'What quantization formats (FP16 vs INT4) are discussed?',
    'How does RAG lower LLM hallucination rates according to the report?',
  ];

  const getDocScopeLabel = () => {
    if (documents.length === 0) return 'No PDFs Loaded';
    if (selectedDocIds.length === documents.length) return `All ${documents.length} PDFs Active`;
    if (selectedDocIds.length === 0) return 'No PDFs Selected (Select in sidebar)';
    return `${selectedDocIds.length} of ${documents.length} PDFs Active`;
  };

  return (
    <div id="chat-window-container" className="flex-1 flex flex-col h-full bg-slate-50/50 overflow-hidden">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.length === 0 ? (
          /* Welcome View */
          <div className="max-w-2xl mx-auto py-8 sm:py-12 px-4 text-center space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-500 to-blue-600 text-white mx-auto flex items-center justify-center shadow-md">
              <Bot className="w-9 h-9" />
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">RAG PDF Intelligence Assistant</h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed">
                Ask complex questions across your uploaded PDF documents. The system uses hybrid vector retrieval and precise citation matching to provide grounded, verifiable answers.
              </p>
            </div>

            {/* Knowledge Status Card */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs text-left max-w-lg mx-auto">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                <span className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" /> Active Knowledge Base
                </span>
                <span className="text-xs text-indigo-600 font-medium">{documents.length} PDF(s)</span>
              </div>

              {documents.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-xs text-gray-500 mb-3">No PDF documents are currently indexed.</p>
                  <button
                    onClick={onLoadDemoPdf}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Load Demo PDF Report
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">
                      <span className="font-medium text-gray-800 truncate max-w-[240px]">{doc.name}</span>
                      <span className="text-gray-400 text-[11px] shrink-0">{doc.pageCount} pgs • {doc.chunkCount} chunks</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Suggested Prompts */}
            <div className="space-y-2 pt-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Suggested Queries</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left max-w-xl mx-auto">
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSendMessage(q)}
                    className="p-3 bg-white hover:bg-indigo-50/50 border border-gray-200 hover:border-indigo-300 rounded-xl text-xs text-gray-700 hover:text-indigo-900 transition-all flex items-start justify-between group shadow-2xs"
                  >
                    <span>{q}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-600 shrink-0 mt-0.5 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Message List */
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 shadow-xs ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-xs'
                    : msg.error
                    ? 'bg-red-50 border border-red-200 text-gray-800 rounded-bl-xs'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-xs'
                }`}>
                  {/* Message Header for Assistant */}
                  {msg.role === 'assistant' && (
                    <div className="flex items-center justify-between text-[11px] text-gray-500 pb-2 mb-2 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-700 flex items-center gap-1">
                          <Cpu className="w-3 h-3 text-indigo-600" /> {msg.provider || 'RAG Assistant'}
                        </span>
                        {msg.latencyMs && (
                          <span className="text-gray-400 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" /> {msg.latencyMs}ms
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyText(msg.id, msg.content)}
                          className="text-gray-400 hover:text-gray-700 transition-colors"
                          title="Copy Answer"
                        >
                          {copiedMsgId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Message Body */}
                  {msg.role === 'user' ? (
                    <p className="text-sm font-medium whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="text-xs sm:text-sm leading-relaxed prose prose-indigo max-w-none">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  )}

                  {/* Citations & Source Chunks */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <button
                        onClick={() =>
                          setExpandedCitationMsgId(
                            expandedCitationMsgId === msg.id ? null : msg.id
                          )
                        }
                        className="w-full flex items-center justify-between text-xs font-medium text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100/80 p-2 rounded-lg transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Retrieved PDF Passages ({msg.citations.length})</span>
                        </span>
                        {expandedCitationMsgId === msg.id ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {expandedCitationMsgId === msg.id && (
                        <div className="mt-2.5 space-y-2">
                          {msg.citations.map((cite, cIdx) => (
                            <div
                              key={cIdx}
                              className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-700 space-y-1"
                            >
                              <div className="flex items-center justify-between font-semibold text-gray-900 border-b border-gray-200/60 pb-1">
                                <span className="flex items-center gap-1.5 text-indigo-900 truncate max-w-[260px]">
                                  <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                  {cite.docName}
                                </span>
                                <span className="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded-md text-gray-600 shrink-0">
                                  Page {cite.pageNumber} • Match {Math.round(cite.score * 100)}%
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-600 italic leading-relaxed pt-1">
                                "{cite.text}"
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-gray-200 text-gray-700 flex items-center justify-center shrink-0 shadow-xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {/* Generating Typing Indicator */}
            {isGenerating && (
              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 animate-bounce" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-3.5 text-xs text-gray-500 flex items-center gap-2 shadow-xs">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse delay-150"></span>
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse delay-300"></span>
                  </div>
                  <span>Performing vector search & reasoning across PDF context...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Input Form Bar */}
      <div className="bg-white border-t border-gray-200 p-3 sm:p-4 shadow-lg">
        <div className="max-w-3xl mx-auto space-y-2">
          {/* Scope indicator */}
          <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
            <span className="flex items-center gap-1.5">
              <Search className="w-3 h-3 text-indigo-600" />
              <span>Scope: <strong className="text-gray-800">{getDocScopeLabel()}</strong></span>
            </span>

            {documents.length === 0 && (
              <button
                onClick={onOpenSidebar}
                className="text-indigo-600 hover:underline font-medium"
              >
                + Upload PDF
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="relative flex items-center">
            <textarea
              id="chat-input-textarea"
              rows={2}
              value={inputQuery}
              onChange={e => setInputQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                documents.length === 0
                  ? 'Ask a question or load a PDF document to begin...'
                  : 'Ask any question about your uploaded PDF documents...'
              }
              className="w-full pr-12 pl-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none transition-all placeholder:text-gray-400"
            />

            <button
              id="btn-send-message"
              type="submit"
              disabled={!inputQuery.trim() || isGenerating}
              className="absolute right-2.5 bottom-2.5 p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-lg transition-colors disabled:cursor-not-allowed shadow-xs"
              title="Send Query"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <p className="text-[10px] text-center text-gray-400">
            Press Enter to submit query, Shift + Enter for new line. Answers are strictly grounded in retrieved PDF passages.
          </p>
        </div>
      </div>
    </div>
  );
};
