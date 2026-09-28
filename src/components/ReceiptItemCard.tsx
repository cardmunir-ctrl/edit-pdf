import React, { useState } from 'react';
import {
  Trash2,
  Copy,
  RotateCw,
  Crop,
  SlidersHorizontal,
  Stamp,
  QrCode,
  Pencil,
  Check,
  X,
  Smartphone,
} from 'lucide-react';
import { ReceiptItem } from '../lib/pdfEngine';

interface ReceiptItemCardProps {
  item: ReceiptItem;
  index: number;
  onRemove: (id: string) => void;
  onDuplicate: (item: ReceiptItem) => void;
  onRotate: (id: string) => void;
  onEdit: (item: ReceiptItem) => void;
  onRename?: (id: string, newName: string) => void;
  onSimulateMobile?: (item: ReceiptItem) => void;
}

export const ReceiptItemCard: React.FC<ReceiptItemCardProps> = ({
  item,
  index,
  onRemove,
  onDuplicate,
  onRotate,
  onEdit,
  onRename,
  onSimulateMobile,
}) => {
  const conf = item.customConfig;
  const hasCustomScale = conf?.scaleMultiplier && conf.scaleMultiplier !== 1.0;
  const hasCustomCrop = conf?.customBottomCropPct && conf.customBottomCropPct > 0;
  const hasWmOverride = conf?.watermarkMode && conf.watermarkMode !== 'inherit';
  const hasQrOverride = conf?.qrMode && conf.qrMode !== 'inherit';

  // Inline rename state
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(item.sourceFileName);

  const handleSaveName = () => {
    if (tempName.trim() && onRename) {
      onRename(item.id, tempName.trim());
    }
    setIsEditingName(false);
  };

  const handleCancelName = () => {
    setTempName(item.sourceFileName);
    setIsEditingName(false);
  };

  return (
    <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-2.5 flex items-center gap-3 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-2xs group">
      {/* Index badge */}
      <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 flex items-center justify-center font-mono font-bold text-xs shrink-0">
        #{index + 1}
      </div>

      {/* Thumbnail */}
      <div className="w-14 h-12 bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center p-0.5 relative">
        <img
          src={item.dataUrl}
          alt={`Nota ${index + 1}`}
          className="w-full h-full object-contain"
        />
        {hasCustomScale && (
          <span className="absolute bottom-0 right-0 bg-blue-600 text-white font-mono text-[8px] font-bold px-1 rounded-tl">
            {Math.round((conf?.scaleMultiplier || 1) * 100)}%
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isEditingName ? (
            <div className="flex items-center gap-1 w-full max-w-[240px]">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  else if (e.key === 'Escape') handleCancelName();
                }}
                autoFocus
                className="px-2 py-0.5 text-xs font-semibold rounded border border-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-full focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleSaveName}
                className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded cursor-pointer"
                title="Simpan Nama"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleCancelName}
                className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                title="Batal"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 max-w-[220px] group/title">
              <p
                className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate cursor-pointer hover:text-indigo-600"
                title={`${item.sourceFileName} (Klik untuk ubah nama)`}
                onClick={() => setIsEditingName(true)}
              >
                {item.sourceFileName}
              </p>
              <button
                type="button"
                onClick={() => setIsEditingName(true)}
                className="opacity-0 group-hover/title:opacity-100 text-slate-400 hover:text-indigo-600 p-0.5 rounded cursor-pointer transition-opacity"
                title="Ubah Nama Nota"
              >
                <Pencil className="w-2.5 h-2.5" />
              </button>
            </div>
          )}

          {/* Badges */}
          {item.isAutoTrimmed && (
            <span className="text-[9px] bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold px-1.5 py-0.2 rounded border border-blue-200/60 dark:border-blue-800/60 shrink-0 flex items-center gap-0.5">
              <Crop className="w-2.5 h-2.5" /> Pas
            </span>
          )}

          {hasCustomScale && (
            <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold px-1.5 py-0.2 rounded border border-indigo-200 dark:border-indigo-800 shrink-0">
              Skala {Math.round((conf?.scaleMultiplier || 1) * 100)}%
            </span>
          )}

          {hasCustomCrop && (
            <span className="text-[9px] bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-bold px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800 shrink-0">
              Pangkas {conf?.customBottomCropPct}%
            </span>
          )}

          {hasWmOverride && (
            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border shrink-0 flex items-center gap-0.5 ${
              conf?.watermarkMode === 'disabled'
                ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                : 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
            }`}>
              <Stamp className="w-2.5 h-2.5" />
              {conf?.watermarkMode === 'disabled' ? 'Tanpa Cap' : `Cap: ${conf?.watermarkText || 'LUNAS'}`}
            </span>
          )}

          {hasQrOverride && (
            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border shrink-0 flex items-center gap-0.5 ${
              conf?.qrMode === 'disabled'
                ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                : 'bg-cyan-50 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800'
            }`}>
              <QrCode className="w-2.5 h-2.5" />
              {conf?.qrMode === 'disabled' ? 'Tanpa QR' : 'QR Khusus'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
          <span>Hal. {item.pageIndex}</span>
          <span>•</span>
          <span>{Math.round(item.width)} × {Math.round(item.height)} px</span>
          <span>•</span>
          <span className="capitalize">
            {item.rotation !== 0 ? `Rotasi ${item.rotation}°` : 'Normal (0°)'}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Test Scan / Simulate Mobile View */}
        {onSimulateMobile && (
          <button
            type="button"
            onClick={() => onSimulateMobile(item)}
            className="flex items-center gap-1 px-2 py-1 text-cyan-700 hover:text-cyan-800 dark:text-cyan-300 dark:hover:text-cyan-100 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/70 dark:hover:bg-cyan-900/80 rounded-lg transition-colors cursor-pointer text-xs font-semibold"
            title="Uji Tampilan & Scan di HP (iOS / Android)"
          >
            <Smartphone className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span className="hidden md:inline">Uji Scan HP</span>
          </button>
        )}

        {/* Sesuaikan / Edit specific file */}
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="flex items-center gap-1 px-2 py-1 text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-700/80 dark:hover:bg-indigo-950/60 rounded-lg transition-colors cursor-pointer text-xs font-semibold"
          title="Sesuaikan Ukuran / Watermark / QR Code Nota Ini"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span className="hidden sm:inline">Sesuaikan</span>
        </button>

        <button
          onClick={() => onRotate(item.id)}
          className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors cursor-pointer"
          title="Putar 90 Derajat Kanan"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onDuplicate(item)}
          className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors cursor-pointer"
          title="Duplikat Nota"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onRemove(item.id)}
          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
          title="Hapus dari Susunan"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
