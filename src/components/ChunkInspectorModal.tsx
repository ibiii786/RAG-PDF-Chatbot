import React, { useState, useEffect } from 'react';
import { X, Layers, Search, FileText } from 'lucide-react';
import { DocumentMetadata, SearchResult } from '../types';

interface ChunkInspectorModalProps {
  document: DocumentMetadata | null;
  onClose: () => void;
}

export const ChunkInspectorModal: React.FC<ChunkInspectorModalProps> = ({ document, onClose }) => {
  const [chunks, setChunks] = useState<SearchResult[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!document) return;

    const fetchChunks = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/chunks?docId=${document.id}&limit=50`);
        if (res.ok) {
          const data = await res.json();
          setChunks(data);
        }
      } catch (err) {
        console.error('Failed to load chunks:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChunks();
  }, [document]);

  if (!document) return null;

  const filteredChunks = chunks.filter(c =>
    c.text.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Layers className="w-5 h-5 text-indigo-600 shrink-0" />
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm truncate">{document.name}</h3>
              <p className="text-[11px] text-gray-500">
                {document.pageCount} pages • {document.chunkCount} semantic text chunks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-lg transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3 bg-white border-b border-gray-200">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Filter chunks in this PDF..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Chunks List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          {isLoading ? (
            <div className="text-center py-12 text-xs text-gray-500">Loading document chunks...</div>
          ) : filteredChunks.length === 0 ? (
            <div className="text-center py-12 text-xs text-gray-500">No matching chunks found.</div>
          ) : (
            filteredChunks.map((chunk, idx) => (
              <div key={idx} className="p-3 bg-white rounded-xl border border-gray-200 text-xs space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                  <span className="font-semibold text-indigo-900 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    Chunk #{chunk.chunkIndex + 1}
                  </span>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-md border border-indigo-100">
                    Page {chunk.pageNumber}
                  </span>
                </div>
                <p className="text-gray-700 leading-relaxed font-mono text-[11px] whitespace-pre-wrap">
                  {chunk.text}
                </p>
                <div className="text-[10px] text-gray-400 text-right pt-0.5">
                  {chunk.text.length} characters
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium text-xs rounded-xl transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
