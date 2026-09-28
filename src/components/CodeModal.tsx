import React, { useState } from 'react';
import { X, Copy, Check, Terminal, Play, FileCode } from 'lucide-react';
import { CODE_SNIPPETS } from '../data/codeTemplates';

interface CodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CodeModal: React.FC<CodeModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState(CODE_SNIPPETS[0].id);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentSnippet = CODE_SNIPPETS.find((s) => s.id === activeTab) || CODE_SNIPPETS[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentSnippet.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Kode Lengkap Backend (Python & Node.js)
              </h2>
              <p className="text-xs text-slate-500">
                Skrip mandiri siap jalan untuk di server lokal / VPS (Streamlit, Flask, Express)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-6 pt-3 border-b border-slate-200 flex gap-2 bg-slate-100/60">
          {CODE_SNIPPETS.map((snippet) => {
            const isActive = snippet.id === activeTab;
            return (
              <button
                key={snippet.id}
                onClick={() => setActiveTab(snippet.id)}
                className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-t border-x cursor-pointer ${
                  isActive
                    ? 'bg-white text-indigo-700 border-slate-200 -mb-px'
                    : 'bg-transparent text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                {snippet.title}
              </button>
            );
          })}
        </div>

        {/* Details & Execution command */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-700 font-medium">
              {currentSnippet.description}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] font-mono text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded">
                Berkas: {currentSnippet.filename}
              </span>
            </div>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>Kode Berhasil Disalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Salin Seluruh Kode</span>
              </>
            )}
          </button>
        </div>

        {/* Command banner */}
        <div className="px-6 py-2 bg-slate-900 text-slate-300 flex items-center justify-between font-mono text-xs overflow-x-auto">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-slate-400 select-none">Cara Menjalankan:</span>
            <span className="text-emerald-300 whitespace-pre">{currentSnippet.command.replace('\n', ' && ')}</span>
          </div>
        </div>

        {/* Code Content */}
        <div className="p-4 overflow-y-auto bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed select-text">
          <pre className="p-2">
            <code>{currentSnippet.code}</code>
          </pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Play className="w-3.5 h-3.5 text-indigo-600" />
            <span>Semua kode di atas kompatibel dengan spesifikasi A4 2x4 A8 Lanskap</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
