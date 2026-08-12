import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Trash2,
  Eye,
  Sparkles,
  Plus,
  CheckSquare,
  Square,
  Search,
  BookOpen,
  X,
  FileCode2,
  HardDriveUpload,
} from 'lucide-react';
import { DocumentMetadata } from '../types';

interface DocumentSidebarProps {
  documents: DocumentMetadata[];
  selectedDocIds: string[];
  onToggleDocSelection: (docId: string) => void;
  onSelectAllDocs: () => void;
  onUploadPdfs: (files: FileList | File[]) => Promise<void>;
  onLoadDemoPdf: () => Promise<void>;
  onDeleteDoc: (docId: string) => Promise<void>;
  onClearAllDocs: () => Promise<void>;
  onInspectChunks: (doc: DocumentMetadata) => void;
  isUploading: boolean;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const DocumentSidebar: React.FC<DocumentSidebarProps> = ({
  documents,
  selectedDocIds,
  onToggleDocSelection,
  onSelectAllDocs,
  onUploadPdfs,
  onLoadDemoPdf,
  onDeleteDoc,
  onClearAllDocs,
  onInspectChunks,
  isUploading,
  isOpenMobile,
  onCloseMobile,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await onUploadPdfs(e.dataTransfer.files);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await onUploadPdfs(e.target.files);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const filteredDocs = documents.filter(d =>
    d.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const allSelected = documents.length > 0 && selectedDocIds.length === documents.length;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="document-sidebar"
        className={`fixed md:static inset-y-0 left-0 z-50 w-80 bg-slate-50 border-r border-gray-200 flex flex-col transition-transform duration-200 ease-in-out ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-gray-900 text-sm">PDF Knowledge Base</h2>
          </div>
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Upload Zone */}
        <div className="p-4 space-y-3 bg-white border-b border-gray-200">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,application/pdf"
            multiple
            className="hidden"
          />

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition-all ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/80 scale-[0.99]'
                : 'border-gray-300 hover:border-indigo-400 bg-gray-50/50 hover:bg-indigo-50/30'
            }`}
          >
            <div className="mx-auto w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-2">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-gray-800">
              {isUploading ? 'Indexing PDF Documents...' : 'Upload PDF Documents'}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">Drag & drop or click to browse</p>
          </div>

          <button
            id="btn-load-demo-pdf"
            onClick={onLoadDemoPdf}
            disabled={isUploading}
            className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-medium text-xs rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Load Sample AI & RAG PDF
          </button>
        </div>

        {/* Document Search & Bulk Controls */}
        {documents.length > 0 && (
          <div className="p-3 bg-slate-100/80 border-b border-gray-200 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Filter documents..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-gray-600 px-1 pt-1">
              <button
                onClick={onSelectAllDocs}
                className="flex items-center gap-1.5 hover:text-indigo-600 font-medium transition-colors"
              >
                {allSelected ? (
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-gray-400" />
                )}
                <span>{allSelected ? 'Unselect All' : 'Select All'} ({selectedDocIds.length}/{documents.length})</span>
              </button>

              <button
                onClick={onClearAllDocs}
                className="text-gray-400 hover:text-red-600 transition-colors"
                title="Remove All PDFs"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Document List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {documents.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 mx-auto flex items-center justify-center mb-3">
                <FileCode2 className="w-6 h-6" />
              </div>
              <p className="text-xs font-medium text-gray-700">No PDF documents indexed</p>
              <p className="text-[11px] text-gray-400 mt-1 max-w-[200px] mx-auto">
                Upload your research papers, specs, or manuals to begin searching with RAG.
              </p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <p className="text-xs text-center text-gray-500 py-6">No PDFs match your search filter.</p>
          ) : (
            filteredDocs.map(doc => {
              const isSelected = selectedDocIds.includes(doc.id);
              return (
                <div
                  key={doc.id}
                  className={`group rounded-xl p-3 border transition-all ${
                    isSelected
                      ? 'bg-white border-indigo-300 shadow-xs ring-1 ring-indigo-200'
                      : 'bg-white/60 border-gray-200 hover:border-gray-300 hover:bg-white'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Checkbox toggle */}
                    <button
                      onClick={() => onToggleDocSelection(doc.id)}
                      className="mt-0.5 text-gray-400 hover:text-indigo-600 focus:outline-none"
                      title={isSelected ? 'Exclude from current search' : 'Include in current search'}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-300" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="text-xs font-semibold text-gray-800 truncate" title={doc.name}>
                          {doc.name}
                        </h3>
                        {doc.isDemo && (
                          <span className="shrink-0 text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded-md">
                            Demo
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-1">
                        <span>{doc.pageCount} {doc.pageCount === 1 ? 'page' : 'pages'}</span>
                        <span>•</span>
                        <span>{doc.chunkCount} chunks</span>
                        <span>•</span>
                        <span>{formatBytes(doc.size)}</span>
                      </div>

                      {/* Action icons */}
                      <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-gray-100 text-[11px]">
                        <button
                          onClick={() => onInspectChunks(doc)}
                          className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" /> Inspect Chunks
                        </button>
                        <span className="text-gray-300">•</span>
                        <button
                          onClick={() => onDeleteDoc(doc.id)}
                          className="text-gray-400 hover:text-red-600 flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-white border-t border-gray-200 text-[11px] text-gray-500 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <HardDriveUpload className="w-3.5 h-3.5 text-gray-400" /> Ephemeral In-Memory Store
          </span>
          <span className="font-mono text-[10px] text-gray-400">PDF-Parse + RAG</span>
        </div>
      </aside>
    </>
  );
};
