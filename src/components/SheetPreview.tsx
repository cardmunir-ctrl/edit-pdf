import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  CheckCircle,
  FileDown,
  Printer,
  RefreshCw,
  RotateCw,
  RotateCcw,
} from 'lucide-react';
import {
  ReceiptItem,
  GridOptions,
  calculateGridLayout,
  resolveReceiptSettings,
  calculateQrSideSize,
  calculateWatermarkFontPx,
  QrPositionPreset,
} from '../lib/pdfEngine';
import { getQrDataUrl } from '../lib/qrCodeHelper';

// Pratinjau lembar digambar pada skala tetap 2 px per mm, dipakai untuk
// mengubah batas ukuran QR (mm) dari SettingsPanel menjadi px.
const PREVIEW_PX_PER_MM = 2;

/**
 * Mengukur kotak nota tempat overlay watermark/QR berada. Memakai
 * offsetWidth/offsetHeight (bukan getBoundingClientRect) supaya ukuran tidak
 * ikut ter-scale dua kali oleh zoom pratinjau; zoom tetap ikut lewat transform
 * CSS pada elemen induknya.
 */
const useHostSizePx = (ref: React.RefObject<HTMLElement | null>) => {
  const [size, setSize] = React.useState({ w: 0, h: 0 });

  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return size;
};

const PreviewWatermark: React.FC<{
  text: string;
  posXPct: number;
  posYPct: number;
  angleDeg: number;
  opacity: number;
  color: 'gray' | 'red' | 'blue' | 'green';
  fontSizePt: number;
}> = ({ text, posXPct, posYPct, angleDeg, opacity, color, fontSizePt }) => {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const { h } = useHostSizePx(hostRef);

  // Ukuran font memakai rumus yang sama dengan PDF engine, diukur terhadap
  // tinggi slip yang benar-benar tampil di pratinjau.
  const fontPx = calculateWatermarkFontPx(h, fontSizePt);

  // Host selalu dirender (walau kosong) supaya pengukuran kotak slip selalu
  // punya elemen yang diamati.
  return (
    <div
      ref={hostRef}
      className="absolute inset-0 pointer-events-none select-none"
      aria-hidden="true"
    >
      {fontPx > 0 && (
        <div
          className="absolute font-bold tracking-wider uppercase flex items-center justify-center text-center whitespace-nowrap"
          style={{
            left: `${posXPct}%`,
            top: `${posYPct}%`,
            transform: `translate(-50%, -50%) rotate(${angleDeg}deg)`,
            opacity,
            color:
              color === 'red'
                ? '#dc2626'
                : color === 'blue'
                ? '#2563eb'
                : color === 'green'
                ? '#059669'
                : '#64748b',
            fontSize: `${fontPx}px`,
            fontFamily: 'Helvetica, Arial, sans-serif',
            letterSpacing: '0.12em',
            lineHeight: 1,
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
};

const PreviewQrCode: React.FC<{
  text: string;
  position: QrPositionPreset;
  sizeMm: number;
  autoSize: boolean;
  customX?: number;
  customY?: number;
}> = ({ text, position, sizeMm, autoSize, customX, customY }) => {
  const [dataUrl, setDataUrl] = React.useState<string>('');
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const { w, h } = useHostSizePx(hostRef);

  React.useEffect(() => {
    let cancelled = false;
    getQrDataUrl(text).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [text]);

  // Rumus sama dengan calculateQrPositionMm: sisi terpendek kotak slip, dengan
  // batas atas dari slider mm (dikonversi ke px lewat skala pratinjau).
  const shortestPx = Math.min(w, h);
  const sizePx =
    shortestPx > 0
      ? calculateQrSideSize(shortestPx, (sizeMm || 14) * PREVIEW_PX_PER_MM, autoSize)
      : 0;
  const marginPx = 4;

  let posStyle: React.CSSProperties = {
    bottom: `${marginPx}px`,
    right: `${marginPx}px`,
    width: `${sizePx}px`,
    height: `${sizePx}px`,
  };

  if (position === 'top-right') {
    posStyle = { top: `${marginPx}px`, right: `${marginPx}px`, width: `${sizePx}px`, height: `${sizePx}px` };
  } else if (position === 'top-left') {
    posStyle = { top: `${marginPx}px`, left: `${marginPx}px`, width: `${sizePx}px`, height: `${sizePx}px` };
  } else if (position === 'bottom-left') {
    posStyle = { bottom: `${marginPx}px`, left: `${marginPx}px`, width: `${sizePx}px`, height: `${sizePx}px` };
  } else if (position === 'center') {
    posStyle = {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: `${sizePx}px`,
      height: `${sizePx}px`,
    };
  } else if (position === 'custom') {
    posStyle = {
      top: `${customY ?? 80}%`,
      left: `${customX ?? 85}%`,
      transform: 'translate(-50%, -50%)',
      width: `${sizePx}px`,
      height: `${sizePx}px`,
    };
  }

  // Host selalu dirender (walau kosong) supaya pengukuran kotak slip selalu
  // punya elemen yang diamati.
  return (
    <div
      ref={hostRef}
      className="absolute inset-0 pointer-events-none z-20"
      aria-hidden="true"
    >
      {dataUrl && sizePx > 0 && (
        <div
          className="absolute bg-white rounded-xs shadow-xs border border-slate-300 p-0.5 flex items-center justify-center"
          style={posStyle}
        >
          <img src={dataUrl} alt="" className="w-full h-full object-contain" />
        </div>
      )}
    </div>
  );
};

interface SheetPreviewProps {
  receipts: ReceiptItem[];
  options: GridOptions;
  onDownloadPdf: () => void;
  onPrintDirect: () => void;
  onRotateStep: (delta: number) => void;
  isGeneratingPdf: boolean;
}

export const SheetPreview: React.FC<SheetPreviewProps> = ({
  receipts,
  options,
  onDownloadPdf,
  onPrintDirect,
  onRotateStep,
  isGeneratingPdf,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

  const gapMm = typeof options.gapMm === 'number' ? options.gapMm : 4.0;
  const layout = calculateGridLayout(options.paperOrientation || 'portrait', gapMm, 4.0);

  const { isLandscape, cellsPerPage } = layout;

  // Active slots count chosen by user (1 to 8)
  const displayCount = Math.min(
    cellsPerPage,
    Math.max(1, typeof options.displayCount === 'number' ? options.displayCount : 8)
  );

  // Calculate items considering repeatSingle mode up to displayCount
  let effectiveReceipts = [...receipts];
  if (options.repeatSingle && effectiveReceipts.length === 1) {
    const single = effectiveReceipts[0];
    effectiveReceipts = Array.from({ length: displayCount }, () => single);
  }

  const totalSheets = Math.max(1, Math.ceil(effectiveReceipts.length / displayCount));
  const safeCurrentPage = Math.min(currentPage, totalSheets - 1);

  const startIdx = safeCurrentPage * displayCount;
  const currentSheetReceipts = effectiveReceipts.slice(startIdx, startIdx + displayCount);

  const filledCount = currentSheetReceipts.length;

  // Visual sheet dimensions based on orientation
  const sheetWidthPx = isLandscape ? 594 : 420;
  const sheetHeightPx = isLandscape ? 420 : 594;

  // Scale ratio: 2.0px per mm
  const gapPx = Math.round(gapMm * 2.0);
  const marginPx = Math.round(4.0 * 2.0); // 8px

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col h-full overflow-hidden transition-colors">
      {/* Top Preview Action Bar */}
      <div className="px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3">
        {/* Title & Sheet Stats */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
              Pratinjau Lembar A4 ({isLandscape ? 'Lanskap' : 'Potret'})
            </span>
          </div>

          <span className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 px-2.5 py-1 rounded-md font-mono font-semibold">
            {filledCount}/{displayCount} Kotak Aktif
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono hidden sm:inline">
            Gap: {gapMm} mm
          </span>
          {options.watermarkEnabled && options.watermarkText?.trim() && (
            <span className="text-[11px] text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 px-2 py-0.5 rounded-md font-mono font-semibold hidden md:inline-flex items-center gap-1">
              Cap: {options.watermarkText} ({options.watermarkPosYPct ?? 40}%)
            </span>
          )}
          {options.qrEnabled && options.qrText?.trim() && (
            <span className="text-[11px] text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/80 px-2 py-0.5 rounded-md font-mono font-semibold hidden lg:inline-flex items-center gap-1">
              QR: {options.qrText} ({(options.qrAutoSize ?? true) ? `auto ≥ ${options.qrSizeMm || 14}mm` : `${options.qrSizeMm || 14}mm`})
            </span>
          )}
        </div>

        {/* Rotate & Zoom & Pagination Controls */}
        <div className="flex items-center gap-2">
          {/* Quick Rotation Buttons */}
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => onRotateStep(-90)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-1 px-1.5 transition-colors"
              title="Putar Kiri 90°"
            >
              <RotateCcw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="text-[11px] font-medium hidden sm:inline">-90°</span>
            </button>
            <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
            <button
              onClick={() => onRotateStep(90)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-1 px-1.5 transition-colors"
              title="Putar Kanan 90°"
            >
              <RotateCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="text-[11px] font-medium hidden sm:inline">+90°</span>
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 text-xs text-slate-600 dark:text-slate-300">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.15))}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
              title="Perkecil"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 font-mono text-[11px] min-w-10 text-center select-none text-slate-700 dark:text-slate-300">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.15))}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
              title="Perbesar"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 cursor-pointer border-l border-slate-200 dark:border-slate-700 ml-0.5 transition-colors"
              title="Reset Zoom"
            >
              <Maximize className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sheet Selector */}
          {totalSheets > 1 && (
            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 text-xs text-slate-700 dark:text-slate-200">
              <button
                disabled={safeCurrentPage === 0}
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed rounded cursor-pointer transition-colors"
                title="Lembar Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-medium text-[11px] whitespace-nowrap">
                Lembar {safeCurrentPage + 1} / {totalSheets}
              </span>
              <button
                disabled={safeCurrentPage >= totalSheets - 1}
                onClick={() => setCurrentPage((p) => Math.min(totalSheets - 1, p + 1))}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed rounded cursor-pointer transition-colors"
                title="Lembar Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Preview Canvas Area */}
      <div className="flex-1 bg-slate-100/90 dark:bg-slate-950/90 p-4 sm:p-8 flex items-center justify-center overflow-auto min-h-[460px] transition-colors">
        {/* Scalable A4 Sheet representation */}
        <div
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out',
          }}
          className="shrink-0"
        >
          {/* The A4 Canvas Sheet (Realistic white paper) */}
          <div
            className="bg-white rounded-xs shadow-2xl relative select-none border border-slate-300 dark:border-slate-700/80 transition-all duration-200 flex flex-col justify-between"
            style={{
              width: `${sheetWidthPx}px`,
              height: `${sheetHeightPx}px`,
              padding: `${marginPx}px`,
            }}
          >
            {/* Dynamic Grid: cols x rows with exact gap */}
            <div
              className={`grid w-full h-full relative z-0 ${
                isLandscape ? 'grid-cols-4 grid-rows-2' : 'grid-cols-2 grid-rows-4'
              }`}
              style={{
                gap: `${gapPx}px`,
              }}
            >
              {Array.from({ length: cellsPerPage }).map((_, slotIndex) => {
                const isActiveSlot = slotIndex < displayCount;
                const receipt = isActiveSlot ? currentSheetReceipts[slotIndex] : null;
                const resolved = receipt ? resolveReceiptSettings(receipt, options) : null;

                return (
                  <div
                    key={slotIndex}
                    className={`relative overflow-hidden flex items-center justify-center rounded-xs transition-all ${
                      isActiveSlot
                        ? 'border border-slate-200/90 bg-white'
                        : 'border border-dashed border-slate-200/60 bg-slate-50/40 opacity-40'
                    }`}
                    style={{
                      padding: `${Math.max(0, (options.paddingMm || 0) * 2)}px`,
                    }}
                  >
                    {/* Content: Receipt image with exact aspect ratio container */}
                    {receipt && resolved ? (
                      <div
                        className="relative flex items-center justify-center overflow-hidden"
                        style={{
                          aspectRatio: `${receipt.width} / ${receipt.height}`,
                          maxWidth: '100%',
                          maxHeight: '100%',
                          width: options.fitMode === 'contain' ? 'auto' : '100%',
                          height: options.fitMode === 'contain' ? 'auto' : '100%',
                          transform: `scale(${resolved.scaleMultiplier || 1.0})`,
                          transformOrigin: 'center center',
                          transition: 'transform 0.15s ease',
                        }}
                      >
                        <img
                          src={receipt.dataUrl}
                          alt={`Nota ${slotIndex + 1}`}
                          className="w-full h-full object-fill block select-none pointer-events-none"
                        />

                        {/* Watermark Overlay in Live Preview */}
                        {resolved.watermarkEnabled && resolved.watermarkText?.trim() && (
                          <PreviewWatermark
                            text={resolved.watermarkText}
                            posXPct={resolved.watermarkPosXPct ?? 50}
                            posYPct={resolved.watermarkPosYPct ?? 40}
                            angleDeg={resolved.watermarkAngle ?? -25}
                            opacity={resolved.watermarkOpacity ?? 0.25}
                            color={resolved.watermarkColor || 'gray'}
                            fontSizePt={resolved.watermarkFontSize ?? 16}
                          />
                        )}

                        {/* QR Code Overlay in Live Preview */}
                        {resolved.qrEnabled && resolved.qrText?.trim() && (
                          <PreviewQrCode
                            text={resolved.qrText.trim()}
                            position={resolved.qrPosition}
                            sizeMm={resolved.qrSizeMm}
                            autoSize={resolved.qrAutoSize ?? true}
                            customX={resolved.qrPosXPct}
                            customY={resolved.qrPosYPct}
                          />
                        )}
                      </div>
                    ) : isActiveSlot ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 text-slate-300">
                        <span className="text-[10px] text-slate-300 font-mono font-medium">
                          Kotak #{slotIndex + 1}
                        </span>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 text-slate-300">
                        <span className="text-[9px] text-slate-300/80 font-mono">
                          (Kosong)
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer scale reminder line (only if enabled) */}
            {options.showPageNumbers && (
              <div className="absolute bottom-1 left-0 right-0 text-center pointer-events-none z-30">
                <span className="text-[8px] text-slate-400 font-mono bg-white/80 px-2 py-0.5 rounded">
                  edit-pdf • Lembar {safeCurrentPage + 1} dari {totalSheets} ({displayCount} Kotak)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors">
        <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            {effectiveReceipts.length > 0 ? (
              <>
                Siap cetak <strong>{effectiveReceipts.length} nota</strong> ({displayCount} kotak per lembar A4, gap {gapMm} mm).
              </>
            ) : (
              'Unggah berkas PDF untuk memulai.'
            )}
          </span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Print Direct */}
          <button
            type="button"
            disabled={effectiveReceipts.length === 0 || isGeneratingPdf}
            onClick={onPrintDirect}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors border border-slate-300/80 dark:border-slate-700 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span>Cetak Langsung</span>
          </button>

          {/* Download PDF button */}
          <button
            type="button"
            disabled={effectiveReceipts.length === 0 || isGeneratingPdf}
            onClick={onDownloadPdf}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 transition-all cursor-pointer"
          >
            {isGeneratingPdf ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Menyusun Dokumen PDF...</span>
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                <span>Unduh PDF A4 Siap Cetak</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
