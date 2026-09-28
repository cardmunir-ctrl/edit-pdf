import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  RotateCw,
  Crop,
  Stamp,
  QrCode,
  Layers,
  Sparkles,
  Maximize2,
  Undo2,
  FileCheck2,
} from 'lucide-react';
import {
  ReceiptItem,
  GridOptions,
  ReceiptCustomConfig,
  WatermarkMode,
  QrMode,
  QrPositionPreset,
  processReceiptImage,
  resolveReceiptSettings,
} from '../lib/pdfEngine';
import { getQrDataUrl } from '../lib/qrCodeHelper';

interface ReceiptEditModalProps {
  item: ReceiptItem;
  globalOptions: GridOptions;
  allReceipts: ReceiptItem[];
  onClose: () => void;
  onSave: (updatedItem: ReceiptItem, applyToAllSameFile: boolean) => void;
}

export const ReceiptEditModal: React.FC<ReceiptEditModalProps> = ({
  item,
  globalOptions,
  allReceipts,
  onClose,
  onSave,
}) => {
  // Local state for configuration
  const [scaleMultiplier, setScaleMultiplier] = useState<number>(
    item.customConfig?.scaleMultiplier ?? 1.0
  );
  const [bottomCropPct, setBottomCropPct] = useState<number>(
    item.customConfig?.customBottomCropPct ?? globalOptions.customBottomCropPct ?? 0
  );
  const [rotation, setRotation] = useState<number>(item.rotation ?? 0);

  // Watermark state
  const [watermarkMode, setWatermarkMode] = useState<WatermarkMode>(
    item.customConfig?.watermarkMode ?? 'inherit'
  );
  const [watermarkText, setWatermarkText] = useState<string>(
    item.customConfig?.watermarkText ?? globalOptions.watermarkText ?? 'LUNAS'
  );
  const [watermarkPosYPct, setWatermarkPosYPct] = useState<number>(
    item.customConfig?.watermarkPosYPct ?? globalOptions.watermarkPosYPct ?? 45
  );
  const [watermarkColor, setWatermarkColor] = useState<'gray' | 'red' | 'blue' | 'green'>(
    item.customConfig?.watermarkColor ?? globalOptions.watermarkColor ?? 'gray'
  );

  // QR Code state
  const [qrMode, setQrMode] = useState<QrMode>(
    item.customConfig?.qrMode ?? 'inherit'
  );
  const [qrText, setQrText] = useState<string>(
    item.customConfig?.qrText ?? globalOptions.qrText ?? ''
  );
  const [qrPosition, setQrPosition] = useState<QrPositionPreset>(
    item.customConfig?.qrPosition ?? globalOptions.qrPosition ?? 'bottom-right'
  );
  const [qrSizeMm, setQrSizeMm] = useState<number>(
    item.customConfig?.qrSizeMm ?? globalOptions.qrSizeMm ?? 14
  );

  // Apply to all pages from same file checkbox
  const sameFileCount = allReceipts.filter(
    (r) => r.sourceFileName === item.sourceFileName
  ).length;
  const [applyToAllSameFile, setApplyToAllSameFile] = useState<boolean>(sameFileCount > 1);

  // Active tab in modal
  const [activeTab, setActiveTab] = useState<'size' | 'watermark' | 'qr'>('size');

  // Preview dataUrl dynamically updated if crop/rotation changes
  const [previewDataUrl, setPreviewDataUrl] = useState<string>(item.dataUrl);
  const [isProcessingPreview, setIsProcessingPreview] = useState<boolean>(false);

  // QR code preview data url
  const [previewQrDataUrl, setPreviewQrDataUrl] = useState<string>('');

  // Re-render thumbnail preview when bottom crop or rotation changes
  useEffect(() => {
    let isCancelled = false;
    const updatePreview = async () => {
      setIsProcessingPreview(true);
      try {
        const res = await processReceiptImage(
          item.originalDataUrl,
          globalOptions.autoTrimWhite,
          bottomCropPct,
          rotation
        );
        if (!isCancelled) {
          setPreviewDataUrl(res.dataUrl);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!isCancelled) setIsProcessingPreview(false);
      }
    };
    updatePreview();
    return () => {
      isCancelled = true;
    };
  }, [item.originalDataUrl, globalOptions.autoTrimWhite, bottomCropPct, rotation]);

  // Generate QR code data URL for preview
  const resolvedQrText = qrMode === 'custom' ? qrText : globalOptions.qrText || '';
  const resolvedQrEnabled = qrMode === 'disabled' ? false : qrMode === 'custom' ? true : globalOptions.qrEnabled ?? false;

  useEffect(() => {
    let isCancelled = false;
    if (resolvedQrEnabled && resolvedQrText.trim()) {
      getQrDataUrl(resolvedQrText.trim()).then((url) => {
        if (!isCancelled) setPreviewQrDataUrl(url);
      });
    } else {
      setPreviewQrDataUrl('');
    }
    return () => {
      isCancelled = true;
    };
  }, [resolvedQrEnabled, resolvedQrText]);

  // Compute watermark resolved values for preview
  const resolvedWmEnabled =
    watermarkMode === 'disabled'
      ? false
      : watermarkMode === 'custom'
      ? true
      : globalOptions.watermarkEnabled ?? false;
  const resolvedWmText = watermarkMode === 'custom' ? watermarkText : globalOptions.watermarkText || 'LUNAS';
  const resolvedWmPosY = watermarkMode === 'custom' ? watermarkPosYPct : globalOptions.watermarkPosYPct ?? 45;
  const resolvedWmColor = watermarkMode === 'custom' ? watermarkColor : globalOptions.watermarkColor || 'gray';

  const handleSave = async () => {
    // 1. Reprocess image if crop or rotation changed
    const processed = await processReceiptImage(
      item.originalDataUrl,
      globalOptions.autoTrimWhite,
      bottomCropPct,
      rotation
    );

    const customConfig: ReceiptCustomConfig = {
      scaleMultiplier,
      customBottomCropPct: bottomCropPct,
      rotation,
      watermarkMode,
      watermarkText: watermarkMode === 'custom' ? watermarkText : undefined,
      watermarkPosYPct: watermarkMode === 'custom' ? watermarkPosYPct : undefined,
      watermarkColor: watermarkMode === 'custom' ? watermarkColor : undefined,
      qrMode,
      qrText: qrMode === 'custom' ? qrText : undefined,
      qrPosition: qrMode === 'custom' ? qrPosition : undefined,
      qrSizeMm: qrMode === 'custom' ? qrSizeMm : undefined,
    };

    const updatedItem: ReceiptItem = {
      ...item,
      dataUrl: processed.dataUrl,
      width: processed.width,
      height: processed.height,
      aspectRatio: processed.aspectRatio,
      rotation,
      isAutoTrimmed: processed.isTrimmed,
      customConfig,
    };

    onSave(updatedItem, applyToAllSameFile);
    onClose();
  };

  const handleResetToDefault = () => {
    setScaleMultiplier(1.0);
    setBottomCropPct(globalOptions.customBottomCropPct ?? 0);
    setRotation(globalOptions.globalRotation ?? 0);
    setWatermarkMode('inherit');
    setWatermarkText(globalOptions.watermarkText ?? 'LUNAS');
    setWatermarkPosYPct(globalOptions.watermarkPosYPct ?? 45);
    setWatermarkColor(globalOptions.watermarkColor ?? 'gray');
    setQrMode('inherit');
    setQrText(globalOptions.qrText ?? '');
    setQrPosition(globalOptions.qrPosition ?? 'bottom-right');
    setQrSizeMm(globalOptions.qrSizeMm ?? 14);
  };

  // QR preview position helper
  const getQrPreviewStyle = (pos: QrPositionPreset, sizeMm: number) => {
    const sizePx = Math.max(22, Math.min(50, Math.round(sizeMm * 1.8)));
    const m = 6;
    switch (pos) {
      case 'top-left':
        return { top: `${m}px`, left: `${m}px`, width: `${sizePx}px`, height: `${sizePx}px` };
      case 'top-right':
        return { top: `${m}px`, right: `${m}px`, width: `${sizePx}px`, height: `${sizePx}px` };
      case 'bottom-left':
        return { bottom: `${m}px`, left: `${m}px`, width: `${sizePx}px`, height: `${sizePx}px` };
      case 'center':
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: `${sizePx}px`,
          height: `${sizePx}px`,
        };
      case 'bottom-right':
      default:
        return { bottom: `${m}px`, right: `${m}px`, width: `${sizePx}px`, height: `${sizePx}px` };
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 truncate">
                <span>Sesuaikan Nota: {item.sourceFileName}</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Atur ukuran, pangkas, watermark, atau QR Code khusus untuk file ini
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

        {/* Modal Body: Left miniature live preview, Right settings */}
        <div className="p-5 flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Left Column: Live miniature preview (5 cols) */}
          <div className="md:col-span-5 flex flex-col items-center justify-between bg-slate-100 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="w-full flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Pratinjau Hasil Nota #{item.pageIndex}
              </span>
              <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded font-bold">
                Skala: {Math.round(scaleMultiplier * 100)}%
              </span>
            </div>

            {/* Receipt Frame */}
            <div className="w-full h-64 bg-slate-200/60 dark:bg-slate-900/80 rounded-lg p-2 flex items-center justify-center relative overflow-hidden border border-slate-300 dark:border-slate-800 shadow-inner">
              <div
                className="relative bg-white shadow-md rounded-xs overflow-hidden flex items-center justify-center transition-all duration-150"
                style={{
                  aspectRatio: `${item.width} / ${item.height}`,
                  maxWidth: '92%',
                  maxHeight: '92%',
                  transform: `scale(${scaleMultiplier})`,
                  transformOrigin: 'center center',
                }}
              >
                <img
                  src={previewDataUrl}
                  alt="Preview"
                  className="w-full h-full object-fill block select-none pointer-events-none"
                />

                {/* Watermark overlay */}
                {resolvedWmEnabled && resolvedWmText.trim() && (
                  <div
                    className="absolute pointer-events-none select-none font-bold tracking-wider uppercase transition-all duration-75 flex items-center justify-center text-center whitespace-nowrap"
                    style={{
                      left: '50%',
                      top: `${resolvedWmPosY}%`,
                      transform: 'translate(-50%, -50%) rotate(-25deg)',
                      opacity: globalOptions.watermarkOpacity ?? 0.25,
                      color:
                        resolvedWmColor === 'red'
                          ? '#dc2626'
                          : resolvedWmColor === 'blue'
                          ? '#2563eb'
                          : resolvedWmColor === 'green'
                          ? '#059669'
                          : '#64748b',
                      fontSize: '18px',
                      fontFamily: 'Helvetica, Arial, sans-serif',
                      letterSpacing: '0.12em',
                      lineHeight: 1,
                    }}
                  >
                    {resolvedWmText}
                  </div>
                )}

                {/* QR Code overlay */}
                {resolvedQrEnabled && previewQrDataUrl && (
                  <div
                    className="absolute bg-white rounded-xs shadow-xs border border-slate-300 p-0.5 pointer-events-none z-10 flex items-center justify-center"
                    style={getQrPreviewStyle(qrPosition, qrSizeMm)}
                  >
                    <img src={previewQrDataUrl} alt="QR" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>
            </div>

            {/* Quick stats below preview */}
            <div className="w-full mt-3 grid grid-cols-2 gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              <div className="bg-white dark:bg-slate-800/80 p-1.5 rounded border border-slate-200 dark:border-slate-700">
                <span>Watermark: </span>
                <strong className={resolvedWmEnabled ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}>
                  {resolvedWmEnabled ? resolvedWmText : 'Nonaktif'}
                </strong>
              </div>
              <div className="bg-white dark:bg-slate-800/80 p-1.5 rounded border border-slate-200 dark:border-slate-700">
                <span>QR Code: </span>
                <strong className={resolvedQrEnabled ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}>
                  {resolvedQrEnabled ? 'Aktif' : 'Nonaktif'}
                </strong>
              </div>
            </div>
          </div>

          {/* Right Column: Settings Tabs (7 cols) */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-4">
            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 pb-1">
              <button
                type="button"
                onClick={() => setActiveTab('size')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'size'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Ukuran & Skala</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('watermark')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'watermark'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Stamp className="w-3.5 h-3.5" />
                <span>Watermark</span>
                {watermarkMode !== 'inherit' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('qr')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'qr'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR Code</span>
                {qrMode !== 'inherit' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                )}
              </button>
            </div>

            {/* Tab 1: Size & Scale */}
            {activeTab === 'size' && (
              <div className="space-y-4 text-xs">
                {/* 1. Scale Slider */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Perbesar / Perkecil Ukuran Nota:</span>
                    </label>
                    <span className="font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                      {Math.round(scaleMultiplier * 100)}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                    Ubah ukuran nota ini secara khusus agar pas dengan kotak cetak.
                  </p>
                  <input
                    type="range"
                    min={0.7}
                    max={1.3}
                    step={0.05}
                    value={scaleMultiplier}
                    onChange={(e) => setScaleMultiplier(parseFloat(e.target.value))}
                    className="w-full accent-blue-600 dark:accent-blue-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                  />
                  <div className="grid grid-cols-4 gap-1.5 mt-2">
                    {[
                      { label: '85% (Kecil)', val: 0.85 },
                      { label: '100% (Normal)', val: 1.0 },
                      { label: '115% (Besar)', val: 1.15 },
                      { label: '125% (Penuh)', val: 1.25 },
                    ].map((s) => (
                      <button
                        key={s.val}
                        type="button"
                        onClick={() => setScaleMultiplier(s.val)}
                        className={`py-1 text-[10px] font-semibold rounded border cursor-pointer ${
                          Math.abs(scaleMultiplier - s.val) < 0.02
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Manual Bottom Crop */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Crop className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Pangkas Bawah Mandiri:</span>
                    </label>
                    <span className="font-mono font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                      {bottomCropPct}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                    Pangkas ruang kosong bawah khusus pada dokumen PDF ini.
                  </p>
                  <input
                    type="range"
                    min={0}
                    max={60}
                    step={5}
                    value={bottomCropPct}
                    onChange={(e) => setBottomCropPct(parseInt(e.target.value, 10))}
                    className="w-full accent-blue-600 dark:accent-blue-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                  />
                </div>

                {/* 3. Rotation */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1.5 flex items-center gap-1.5">
                    <RotateCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Putar / Rotasi Khusus Nota Ini:</span>
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { deg: 0, label: '0° Normal' },
                      { deg: 90, label: '90° Kanan' },
                      { deg: 180, label: '180° Balik' },
                      { deg: 270, label: '270° Kiri' },
                    ].map((r) => (
                      <button
                        key={r.deg}
                        type="button"
                        onClick={() => setRotation(r.deg)}
                        className={`py-1.5 rounded-lg border text-center transition-all cursor-pointer font-semibold text-[11px] ${
                          rotation === r.deg
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Watermark */}
            {activeTab === 'watermark' && (
              <div className="space-y-3.5 text-xs">
                {/* Watermark Mode Selection (3 buttons) */}
                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
                    Pilihan Watermark untuk File Ini:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setWatermarkMode('inherit')}
                      className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                        watermarkMode === 'inherit'
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 font-bold ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="text-xs">🌐 Ikuti Global</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                        {globalOptions.watermarkEnabled ? 'Aktif' : 'Mati'}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWatermarkMode('custom')}
                      className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                        watermarkMode === 'custom'
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 font-bold ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="text-xs">✅ Beri Cap Khusus</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Teks / posisi kustom
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWatermarkMode('disabled')}
                      className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                        watermarkMode === 'disabled'
                          ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/50 text-rose-950 dark:text-rose-200 font-bold ring-2 ring-rose-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="text-xs">❌ Tanpa Watermark</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Polos tanpa stempel
                      </div>
                    </button>
                  </div>
                </div>

                {/* Custom Watermark Details (when custom is active) */}
                {watermarkMode === 'custom' && (
                  <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-200/70 dark:border-indigo-900/60 space-y-3">
                    <div>
                      <label className="font-semibold text-slate-800 dark:text-slate-200 block mb-1 text-[11px]">
                        Teks Watermark:
                      </label>
                      <input
                        type="text"
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        placeholder="Contoh: LUNAS"
                        className="w-full px-2.5 py-1.5 text-xs font-bold font-mono tracking-wider rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                      <div className="flex gap-1 mt-1">
                        {['LUNAS', 'PAID', 'SLIP GAJI', 'COPY'].map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => setWatermarkText(w)}
                            className="text-[10px] px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer font-mono"
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                          Ketinggian Posisi (Y):
                        </label>
                        <span className="font-mono text-indigo-700 dark:text-indigo-300 font-bold">
                          {watermarkPosYPct}% (Pas Sisa Gaji)
                        </span>
                      </div>
                      <input
                        type="range"
                        min={20}
                        max={75}
                        step={1}
                        value={watermarkPosYPct}
                        onChange={(e) => setWatermarkPosYPct(parseInt(e.target.value, 10))}
                        className="w-full accent-indigo-600 h-1.5 bg-indigo-200 dark:bg-indigo-900 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-800 dark:text-slate-200 block mb-1 text-[11px]">
                        Warna Cap:
                      </label>
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { id: 'gray', label: 'Abu', bg: 'bg-slate-400' },
                          { id: 'red', label: 'Merah', bg: 'bg-rose-500' },
                          { id: 'blue', label: 'Biru', bg: 'bg-blue-500' },
                          { id: 'green', label: 'Hijau', bg: 'bg-emerald-500' },
                        ].map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setWatermarkColor(c.id as any)}
                            className={`py-1 rounded border flex items-center justify-center gap-1.5 cursor-pointer text-[10px] ${
                              watermarkColor === c.id
                                ? 'border-indigo-600 bg-white dark:bg-slate-800 font-bold'
                                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40'
                            }`}
                          >
                            <span className={`w-2.5 h-2.5 rounded-full ${c.bg}`} />
                            <span>{c.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: QR Code */}
            {activeTab === 'qr' && (
              <div className="space-y-3.5 text-xs">
                {/* QR Mode Selection */}
                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
                    Pilihan QR Code untuk File Ini:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setQrMode('inherit')}
                      className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                        qrMode === 'inherit'
                          ? 'border-cyan-600 bg-cyan-50 dark:bg-cyan-950/50 text-cyan-950 dark:text-cyan-200 font-bold ring-2 ring-cyan-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="text-xs">🌐 Ikuti Global</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                        {globalOptions.qrEnabled ? 'Aktif' : 'Mati'}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQrMode('custom')}
                      className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                        qrMode === 'custom'
                          ? 'border-cyan-600 bg-cyan-50 dark:bg-cyan-950/50 text-cyan-950 dark:text-cyan-200 font-bold ring-2 ring-cyan-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="text-xs">✅ Pasang QR Khusus</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Teks / link mandiri
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQrMode('disabled')}
                      className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                        qrMode === 'disabled'
                          ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/50 text-rose-950 dark:text-rose-200 font-bold ring-2 ring-rose-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="text-xs">❌ Tanpa QR Code</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Jangan tampilkan QR
                      </div>
                    </button>
                  </div>
                </div>

                {/* Custom QR Details */}
                {qrMode === 'custom' && (
                  <div className="p-3 bg-cyan-50/50 dark:bg-cyan-950/30 rounded-xl border border-cyan-200/70 dark:border-cyan-900/60 space-y-3">
                    <div>
                      <label className="font-semibold text-slate-800 dark:text-slate-200 block mb-1 text-[11px]">
                        Teks / Tautan QR Code:
                      </label>
                      <input
                        type="text"
                        value={qrText}
                        onChange={(e) => setQrText(e.target.value)}
                        placeholder="Contoh: https://nota.id/cek/1209 atau NOTA-001"
                        className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-cyan-200 dark:border-cyan-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-800 dark:text-slate-200 block mb-1 text-[11px]">
                        Posisi QR Code di Nota:
                      </label>
                      <div className="grid grid-cols-5 gap-1">
                        {[
                          { id: 'bottom-right', label: '↘ Kanan Bwh' },
                          { id: 'bottom-left', label: '↙ Kiri Bwh' },
                          { id: 'top-right', label: '↗ Kanan Atas' },
                          { id: 'top-left', label: '↖ Kiri Atas' },
                          { id: 'center', label: '🎯 Tengah' },
                        ].map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setQrPosition(p.id as any)}
                            className={`py-1 px-1 rounded border text-center font-semibold text-[10px] cursor-pointer ${
                              qrPosition === p.id
                                ? 'bg-cyan-600 text-white border-cyan-600 shadow-2xs'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                          Ukuran QR Code:
                        </label>
                        <span className="font-mono text-cyan-700 dark:text-cyan-300 font-bold">
                          {qrSizeMm} mm
                        </span>
                      </div>
                      <input
                        type="range"
                        min={8}
                        max={24}
                        step={1}
                        value={qrSizeMm}
                        onChange={(e) => setQrSizeMm(parseInt(e.target.value, 10))}
                        className="w-full accent-cyan-600 h-1.5 bg-cyan-200 dark:bg-cyan-900 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
              {sameFileCount > 1 && (
                <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={applyToAllSameFile}
                    onChange={(e) => setApplyToAllSameFile(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                  />
                  <span>
                    Terapkan pengaturan ini ke semua ({sameFileCount}) halaman dari file{' '}
                    <strong>{item.sourceFileName}</strong>
                  </span>
                </label>
              )}

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Reset Default</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Simpan & Terapkan</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
