import React, { useState, useMemo } from 'react';
import {
  X,
  Check,
  Edit3,
  Hash,
  Replace,
  Layers,
  ArrowRight,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { ReceiptItem } from '../lib/pdfEngine';

interface BatchRenameModalProps {
  receipts: ReceiptItem[];
  onClose: () => void;
  onRenameBatch: (updates: { id: string; newName: string }[]) => void;
}

export const BatchRenameModal: React.FC<BatchRenameModalProps> = ({
  receipts,
  onClose,
  onRenameBatch,
}) => {
  // Mode: 'pattern' | 'replace' | 'per-file'
  const [mode, setMode] = useState<'pattern' | 'replace' | 'per-file'>('pattern');

  // Mode 1: Pattern state
  const [prefix, setPrefix] = useState<string>('Slip Gaji');
  const [suffix, setSuffix] = useState<string>('');
  const [numberFormat, setNumberFormat] = useState<'01' | '1' | '001'>('01');
  const [startNumber, setStartNumber] = useState<number>(1);
  const [separator, setSeparator] = useState<string>(' - #');

  // Mode 2: Replace state
  const [findText, setFindText] = useState<string>('');
  const [replaceWith, setReplaceWith] = useState<string>('');

  // Mode 3: Distinct source files state
  const distinctSourceFiles = useMemo(() => {
    return Array.from(new Set(receipts.map((r) => r.sourceFileName)));
  }, [receipts]);

  const [fileRenameMap, setFileRenameMap] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    distinctSourceFiles.forEach((file) => {
      initial[file] = file;
    });
    return initial;
  });

  // Calculate preview of new names
  const previewList = useMemo(() => {
    return receipts.map((r, index) => {
      let newName = r.sourceFileName;

      if (mode === 'pattern') {
        const num = startNumber + index;
        let numStr = String(num);
        if (numberFormat === '01') {
          numStr = String(num).padStart(2, '0');
        } else if (numberFormat === '001') {
          numStr = String(num).padStart(3, '0');
        }
        newName = `${prefix}${separator}${numStr}${suffix ? ` ${suffix}` : ''}`;
      } else if (mode === 'replace') {
        if (findText.trim()) {
          newName = r.sourceFileName.split(findText).join(replaceWith);
        }
      } else if (mode === 'per-file') {
        newName = fileRenameMap[r.sourceFileName] || r.sourceFileName;
      }

      return {
        id: r.id,
        oldName: r.sourceFileName,
        newName: newName.trim() || r.sourceFileName,
        pageIndex: r.pageIndex,
      };
    });
  }, [
    receipts,
    mode,
    prefix,
    suffix,
    numberFormat,
    startNumber,
    separator,
    findText,
    replaceWith,
    fileRenameMap,
  ]);

  const handleApply = () => {
    const updates = previewList.map((p) => ({
      id: p.id,
      newName: p.newName,
    }));
    onRenameBatch(updates);
    onClose();
  };

  const handlePresetPattern = (p: string, sep: string = ' - #') => {
    setPrefix(p);
    setSeparator(sep);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Ubah Nama Massal (Batch Rename)</span>
                <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono px-2 py-0.5 rounded-full font-bold">
                  {receipts.length} Nota
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Beri nama rapi pada berkas nota agar mudah diidentifikasi sebelum dicetak
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Mode Selector */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setMode('pattern')}
              className={`py-2 px-3 rounded-xl border text-left cursor-pointer transition-all ${
                mode === 'pattern'
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 font-bold ring-2 ring-indigo-500/20 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
              }`}
            >
              <div className="text-xs flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Format Nomor</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Prefix + No. Urut (01, 02)
              </p>
            </button>

            <button
              type="button"
              onClick={() => setMode('replace')}
              className={`py-2 px-3 rounded-xl border text-left cursor-pointer transition-all ${
                mode === 'replace'
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 font-bold ring-2 ring-indigo-500/20 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
              }`}
            >
              <div className="text-xs flex items-center gap-1.5">
                <Replace className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Cari & Ganti</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Ganti kata tertentu
              </p>
            </button>

            <button
              type="button"
              onClick={() => setMode('per-file')}
              className={`py-2 px-3 rounded-xl border text-left cursor-pointer transition-all ${
                mode === 'per-file'
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 font-bold ring-2 ring-indigo-500/20 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
              }`}
            >
              <div className="text-xs flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Per File Asal</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Ubah per dokumen PDF
              </p>
            </button>
          </div>

          {/* Mode 1: Format Penomoran */}
          {mode === 'pattern' && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Awalan Nama (Prefix):
                </label>
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="Contoh: Slip Gaji"
                  className="w-full px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {[
                    { label: 'Slip Gaji', sep: ' - #' },
                    { label: 'Nota Jahit', sep: ' - ' },
                    { label: 'Nota Bordir', sep: ' - ' },
                    { label: 'Kuitansi', sep: ' #' },
                    { label: 'Invoice', sep: '-' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handlePresetPattern(p.label, p.sep)}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                        prefix === p.label
                          ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    Format Angka:
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: '01', label: '01, 02' },
                      { id: '1', label: '1, 2' },
                      { id: '001', label: '001' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setNumberFormat(f.id as any)}
                        className={`py-1 text-xs font-mono font-semibold rounded-lg border transition-all cursor-pointer ${
                          numberFormat === f.id
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    Mulai dari Nomor:
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={startNumber}
                    onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-1.5 text-xs font-mono font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Mode 2: Cari & Ganti */}
          {mode === 'replace' && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Kata yang Dicari:
                </label>
                <input
                  type="text"
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  placeholder="Contoh: Document atau scan_"
                  className="w-full px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Ganti Dengan:
                </label>
                <input
                  type="text"
                  value={replaceWith}
                  onChange={(e) => setReplaceWith(e.target.value)}
                  placeholder="Contoh: Slip Gaji"
                  className="w-full px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Mode 3: Per File Asal */}
          {mode === 'per-file' && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Ubah nama masing-masing dokumen PDF asli di bawah ini:
              </p>
              <div className="space-y-2">
                {distinctSourceFiles.map((fileName, idx) => (
                  <div key={fileName} className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate w-44 shrink-0" title={fileName}>
                      PDF {idx + 1}: {fileName}
                    </span>
                    <input
                      type="text"
                      value={fileRenameMap[fileName] || ''}
                      onChange={(e) =>
                        setFileRenameMap((prev) => ({
                          ...prev,
                          [fileName]: e.target.value,
                        }))
                      }
                      className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      placeholder="Nama baru untuk file ini..."
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live Preview List */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Pratinjau Hasil Perubahan Nama ({previewList.length} Nota):
              </span>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-800/40">
              {previewList.map((item, idx) => (
                <div key={item.id} className="p-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-slate-400 truncate max-w-[140px] sm:max-w-[200px]" title={item.oldName}>
                      {item.oldName}
                    </span>
                  </div>

                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

                  <span className="font-semibold text-indigo-700 dark:text-indigo-300 truncate max-w-[160px] sm:max-w-[240px] text-right" title={item.newName}>
                    {item.newName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Terapkan Nama Baru ({previewList.length} Nota)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
