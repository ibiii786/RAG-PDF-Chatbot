import React, { useState } from 'react';
import { X, Cpu, Sparkles, Sliders, CheckCircle2, AlertTriangle, RefreshCw, Layers } from 'lucide-react';
import { SystemStatus } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: SystemStatus | null;
  providerPref: 'auto' | 'gemini' | 'ollama';
  setProviderPref: (pref: 'auto' | 'gemini' | 'ollama') => void;
  retrievalK: number;
  setRetrievalK: (k: number) => void;
  ollamaUrl: string;
  setOllamaUrl: (url: string) => void;
  ollamaModel: string;
  setOllamaModel: (model: string) => void;
  onTestOllama: () => Promise<void>;
  isTestingOllama: boolean;
  ollamaTestResult: { available: boolean; models: string[] } | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  status,
  providerPref,
  setProviderPref,
  retrievalK,
  setRetrievalK,
  ollamaUrl,
  setOllamaUrl,
  ollamaModel,
  setOllamaModel,
  onTestOllama,
  isTestingOllama,
  ollamaTestResult,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-900 text-sm">RAG & Model Configuration</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-5 text-xs text-gray-700 max-h-[80vh] overflow-y-auto">
          {/* Active Model Provider Preference */}
          <div className="space-y-2">
            <label className="font-semibold text-gray-900 block">AI Provider Preference</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setProviderPref('auto')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  providerPref === 'auto'
                    ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-500 font-semibold text-indigo-900'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="font-medium text-xs">Auto Select</div>
                <div className="text-[10px] text-gray-500 mt-0.5">Gemini → Ollama → Local</div>
              </button>

              <button
                onClick={() => setProviderPref('gemini')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  providerPref === 'gemini'
                    ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-500 font-semibold text-indigo-900'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="font-medium text-xs flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" /> Gemini
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">3.6 Flash</div>
              </button>

              <button
                onClick={() => setProviderPref('ollama')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  providerPref === 'ollama'
                    ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-500 font-semibold text-indigo-900'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="font-medium text-xs flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-blue-600" /> Ollama
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">qwen2.5:1.5b</div>
              </button>
            </div>
          </div>

          {/* Gemini API Key Status */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="flex items-center justify-between font-medium text-slate-800">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Gemini API Key
              </span>
              {status?.geminiAvailable ? (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Configured
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Not Found
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {status?.geminiAvailable
                ? 'Your Gemini API key is loaded from runtime secrets and will be prioritized.'
                : 'No GEMINI_API_KEY detected. The app will use local Ollama or high-speed grounded RAG.'}
            </p>
          </div>

          {/* Ollama Local LLM Config */}
          <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between font-medium text-blue-900">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-600" /> Ollama Local LLM Settings
              </span>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-[11px] text-gray-600 block mb-1">Ollama Server Base URL</label>
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={e => setOllamaUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-gray-600 block mb-1">Local Model Identifier</label>
                <input
                  type="text"
                  value={ollamaModel}
                  onChange={e => setOllamaModel(e.target.value)}
                  placeholder="qwen2.5:1.5b"
                  className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="pt-1 flex items-center justify-between">
                <button
                  onClick={onTestOllama}
                  disabled={isTestingOllama}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isTestingOllama ? 'animate-spin' : ''}`} />
                  Test Ollama Connection
                </button>

                {ollamaTestResult && (
                  <span className={`text-[11px] font-medium ${ollamaTestResult.available ? 'text-emerald-700' : 'text-red-600'}`}>
                    {ollamaTestResult.available ? 'Connected!' : 'Offline / Unreachable'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* RAG Parameters */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-gray-900">Retrieval Context (Top-K Chunks)</label>
              <span className="font-bold text-indigo-600">{retrievalK} Chunks</span>
            </div>
            <input
              type="range"
              min={1}
              max={8}
              value={retrievalK}
              onChange={e => setRetrievalK(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <p className="text-[11px] text-gray-500">
              Higher K provides more complete context across PDF pages but increases prompt tokens.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-xl transition-colors shadow-xs"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
