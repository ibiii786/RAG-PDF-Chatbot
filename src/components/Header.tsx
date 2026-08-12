import React from 'react';
import { FileText, Cpu, Database, Settings, Menu, Sparkles, RefreshCw, Layers } from 'lucide-react';
import { SystemStatus } from '../types';

interface HeaderProps {
  status: SystemStatus | null;
  onOpenSidebar: () => void;
  onOpenSettings: () => void;
  onRefreshStatus: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  onOpenSidebar,
  onOpenSettings,
  onRefreshStatus,
  isRefreshing,
}) => {
  const getProviderBadge = () => {
    if (!status) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          <RefreshCw className="w-3 h-3 animate-spin" /> Checking Engine...
        </span>
      );
    }

    if (status.activeProvider === 'gemini') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          Gemini 3.6 Flash Active
        </span>
      );
    }

    if (status.activeProvider === 'ollama') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          <Cpu className="w-3.5 h-3.5 text-blue-600" />
          Ollama ({status.ollamaModel})
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
        <Layers className="w-3.5 h-3.5 text-amber-600" />
        Local Grounded RAG
      </span>
    );
  };

  const getDbBadge = () => {
    if (!status?.dbConnected) return null;
    const provider = status.dbProvider || 'DB';
    const isMysql = provider === 'MySQL';
    return (
      <span
        className={`hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
          isMysql
            ? 'bg-blue-50 text-blue-700 border-blue-200'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}
        title={status.dbDetails || `Persistent ${provider} database active with L1 RAM cache`}
      >
        <Database className="w-3 h-3" />
        ⚡ RAM + {provider}
      </span>
    );
  };

  return (
    <header id="app-header" className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 py-3 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left branding */}
        <div className="flex items-center gap-3">
          <button
            id="btn-toggle-mobile-menu"
            onClick={onOpenSidebar}
            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Toggle Documents Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-gray-900 text-base leading-tight">RAG PDF Chatbot</h1>
                <span className="hidden sm:inline-block text-[10px] font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-md">
                  v2.5 RAG
                </span>
              </div>
              <p className="text-xs text-gray-500 hidden sm:block">Search & query uploaded PDFs with exact citations</p>
            </div>
          </div>
        </div>

        {/* Center / Right status & controls */}
        <div className="flex items-center gap-2.5">
          {/* Provider & DB Badges */}
          <div className="hidden md:flex items-center gap-2">
            {getProviderBadge()}
            {getDbBadge()}
          </div>

          {/* Stats pill */}
          <div className="hidden lg:flex items-center gap-3 text-xs text-gray-600 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
            <div className="flex items-center gap-1.5" title="Indexed Documents">
              <Database className="w-3.5 h-3.5 text-indigo-600" />
              <span>
                <strong className="text-gray-900 font-semibold">{status?.docCount || 0}</strong> PDFs
              </span>
            </div>
            <div className="h-3 w-px bg-gray-300"></div>
            <div className="flex items-center gap-1.5" title="Indexed Text Chunks">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>
                <strong className="text-gray-900 font-semibold">{status?.totalChunks || 0}</strong> Chunks
              </span>
            </div>
          </div>

          {/* Refresh status button */}
          <button
            id="btn-refresh-status"
            onClick={onRefreshStatus}
            disabled={isRefreshing}
            className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh System Status"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          {/* Settings button */}
          <button
            id="btn-open-settings"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border border-gray-200"
            title="Model & RAG Settings"
          >
            <Settings className="w-3.5 h-3.5 text-gray-600" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};
