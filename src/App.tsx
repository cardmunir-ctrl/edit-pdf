/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Upload,
  Trash2,
  AlertCircle,
  FileCheck,
  RefreshCcw,
  Edit3,
  Database,
} from 'lucide-react';
import { Header } from './components/Header';
import { SettingsPanel } from './components/SettingsPanel';
import { SheetPreview } from './components/SheetPreview';
import { ReceiptItemCard } from './components/ReceiptItemCard';
import { ReceiptEditModal } from './components/ReceiptEditModal';
import { BatchRenameModal } from './components/BatchRenameModal';
import { MobileReceiptView } from './components/MobileReceiptView';
import { MobileSimulatorModal } from './components/MobileSimulatorModal';
import { NeonBukuProduksiModal } from './components/NeonBukuProduksiModal';
import { syncReceiptToServer } from './lib/receiptSync';
import {
  ReceiptItem,
  GridOptions,
  extractPagesFromPdf,
  buildA4GridPdf,
  processReceiptImage,
} from './lib/pdfEngine';

export default function App() {
  // Mobile scan detection: if scanned from smartphone QR code, open full mobile viewer
  const [mobileNotaId, setMobileNotaId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('nota') || params.get('id');
  });

  // Receipts State: Starts completely empty without any pre-loaded demo images
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [editingReceiptId, setEditingReceiptId] = useState<string | null>(null);
  const [isBatchRenameOpen, setIsBatchRenameOpen] = useState(false);
  const [simulatingReceipt, setSimulatingReceipt] = useState<ReceiptItem | null>(null);
  const [isNeonModalOpen, setIsNeonModalOpen] = useState(false);

  // Settings State: Default clean (no lines), gap 4mm, 8 slots, 0° normal, Portrait
  const [options, setOptions] = useState<GridOptions>({
    paperOrientation: 'portrait',
    gapMm: 4.0,
    displayCount: 8,
    paddingMm: 1.5,
    fitMode: 'contain',
    repeatSingle: true,
    dashedLineStyle: 'none',
    showPageNumbers: false,
    globalRotation: 0,
    autoTrimWhite: true,
    customBottomCropPct: 0,
    watermarkEnabled: false,
    watermarkText: 'LUNAS',
    watermarkPosYPct: 40, // Default posisi vertikal watermark
    watermarkPosXPct: 50,
    watermarkAngle: -25,
    watermarkOpacity: 0.25,
    watermarkFontSize: 16,
    watermarkColor: 'gray',
    qrEnabled: false,
    qrText: '',
    qrPosition: 'bottom-left',
    qrPosXPct: 85,
    qrPosYPct: 82,
    qrSizeMm: 14,
    qrAutoSize: true,
  });

  // UI state
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasAppliedPrintDefaultsRef = useRef(false);

  // File Upload Handler
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMessage(null);
    setIsProcessingFile(true);

    try {
      const newItems: ReceiptItem[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProcessingStatus(`Membaca berkas ${file.name}...`);

        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          const items = await extractPagesFromPdf(file, options.autoTrimWhite, (curr, tot) => {
            setProcessingStatus(`Mengekstrak halaman ${curr} dari ${tot} (${file.name})...`);
          });
          newItems.push(...items);
        } else if (file.type.startsWith('image/')) {
          // Allow receipt images (scanned PNG/JPG/WEBP)
          const dataUrl = await readFileAsDataUrl(file);
          const img = await loadImage(dataUrl);

          // Process image with current settings
          const processed = await processReceiptImage(
            dataUrl,
            options.autoTrimWhite,
            options.customBottomCropPct,
            options.globalRotation
          );

          newItems.push({
            id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            sourceFileName: file.name,
            pageIndex: 1,
            dataUrl: processed.dataUrl,
            originalDataUrl: dataUrl,
            width: processed.width,
            height: processed.height,
            aspectRatio: processed.aspectRatio,
            originalWidth: img.width,
            originalHeight: img.height,
            rotation: options.globalRotation,
            isAutoTrimmed: processed.isTrimmed,
          });
        } else {
          setErrorMessage(`Format file ${file.name} tidak didukung. Harap gunakan file PDF atau gambar nota.`);
        }
      }

      if (newItems.length > 0) {
        setReceipts((prev) => [...prev, ...newItems]);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        'Gagal memproses file PDF: ' + (err?.message || 'Pastikan file PDF tidak dikunci password.')
      );
    } finally {
      setIsProcessingFile(false);
      setProcessingStatus('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  // Remove Receipt
  const handleRemoveReceipt = (id: string) => {
    setReceipts((prev) => prev.filter((r) => r.id !== id));
  };

  // Duplicate Receipt
  const handleDuplicateReceipt = (item: ReceiptItem) => {
    const dup: ReceiptItem = {
      ...item,
      id: `${item.sourceFileName}-dup-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    setReceipts((prev) => [...prev, dup]);
  };

  // Reprocess all receipts with new trim/crop/rotation settings
  const reprocessAllReceipts = async (
    autoTrim: boolean,
    bottomCrop: number,
    rotation: number
  ) => {
    try {
      const updated = await Promise.all(
        receipts.map(async (r) => {
          const res = await processReceiptImage(
            r.originalDataUrl,
            autoTrim,
            bottomCrop,
            rotation
          );
          return {
            ...r,
            dataUrl: res.dataUrl,
            width: res.width,
            height: res.height,
            aspectRatio: res.aspectRatio,
            rotation,
            isAutoTrimmed: res.isTrimmed,
          };
        })
      );
      setReceipts(updated);
    } catch (e) {
      console.error('Gagal memperbarui proses nota:', e);
    }
  };

  // Toggle AutoTrim
  const handleAutoTrimToggle = (enabled: boolean) => {
    setOptions((prev) => ({ ...prev, autoTrimWhite: enabled }));
    reprocessAllReceipts(enabled, options.customBottomCropPct, options.globalRotation);
  };

  // Change manual bottom crop percentage
  const handleBottomCropChange = (pct: number) => {
    setOptions((prev) => ({ ...prev, customBottomCropPct: pct }));
    reprocessAllReceipts(options.autoTrimWhite, pct, options.globalRotation);
  };

  // Rotate a specific receipt 90 degrees clockwise
  const handleRotateReceipt = async (id: string) => {
    const target = receipts.find((r) => r.id === id);
    if (!target) return;

    try {
      const nextRotation = (target.rotation + 90) % 360;
      const res = await processReceiptImage(
        target.originalDataUrl,
        options.autoTrimWhite,
        options.customBottomCropPct,
        nextRotation
      );

      setReceipts((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                dataUrl: res.dataUrl,
                width: res.width,
                height: res.height,
                aspectRatio: res.aspectRatio,
                rotation: nextRotation,
                isAutoTrimmed: res.isTrimmed,
              }
            : r
        )
      );
    } catch (e) {
      console.error(e);
    }
  };

  // Rotate all receipts to a specified global rotation
  const handleRotateAll = async (targetDegree: number) => {
    setOptions((prev) => ({ ...prev, globalRotation: targetDegree }));
    reprocessAllReceipts(options.autoTrimWhite, options.customBottomCropPct, targetDegree);
  };

  // Rotate all by a step (e.g. +90 or -90)
  const handleRotateStep = (delta: number) => {
    const nextDegree = (options.globalRotation + delta + 360) % 360;
    handleRotateAll(nextDegree);
  };

  // Clear all receipts
  const handleClearAll = () => {
    setReceipts([]);
  };

  // Save custom configuration for a specific receipt or file
  const handleSaveReceiptConfig = (updatedItem: ReceiptItem, applyToAllSameFile: boolean) => {
    setReceipts((prev) =>
      prev.map((r) => {
        if (r.id === updatedItem.id) {
          return updatedItem;
        }
        if (applyToAllSameFile && r.sourceFileName === updatedItem.sourceFileName) {
          return {
            ...r,
            customConfig: { ...updatedItem.customConfig },
          };
        }
        return r;
      })
    );
  };

  // Batch rename multiple receipts
  const handleBatchRename = (updates: { id: string; newName: string }[]) => {
    const updateMap = new Map(updates.map((u) => [u.id, u.newName]));
    setReceipts((prev) =>
      prev.map((r) => {
        const newName = updateMap.get(r.id);
        return newName ? { ...r, sourceFileName: newName } : r;
      })
    );
  };

  // Single receipt rename inline
  const handleSingleRename = (id: string, newName: string) => {
    setReceipts((prev) =>
      prev.map((r) => (r.id === id ? { ...r, sourceFileName: newName } : r))
    );
  };

  // Import slips from Buku Produksi Neon Database
  const handleImportNeonReceipts = (newItems: ReceiptItem[]) => {
    setReceipts((prev) => [...prev, ...newItems]);
    try {
      confetti({
        particleCount: 55,
        spread: 65,
        origin: { y: 0.7 },
      });
    } catch {}
  };

  // Terapkan default cetak begitu ada nota pertama (upload, drag & drop, atau
  // import Buku Produksi). Sekali saja lewat ref, supaya nota berikutnya tidak
  // mengembalikan setting yang sudah diubah user, dan customConfig per nota
  // tidak tersentuh karena default ini hanya ditulis ke options global.
  React.useEffect(() => {
    if (receipts.length === 0 || hasAppliedPrintDefaultsRef.current) return;
    hasAppliedPrintDefaultsRef.current = true;
    setOptions((prev) => ({
      ...prev,
      watermarkPosYPct: 40,
      watermarkFontSize: 16,
      qrPosition: 'bottom-left',
      qrAutoSize: true,
    }));
  }, [receipts.length]);

  // Generate & Download PDF
  const handleDownloadPdf = async () => {
    if (receipts.length === 0) return;
    setIsGeneratingPdf(true);

    try {
      const doc = await buildA4GridPdf(receipts, options);
      doc.save('edit-pdf_SiapCetak.pdf');

      try {
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.8 },
        });
      } catch {
        // ignore
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Terjadi kendala saat menghasilkan PDF: ' + err.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Print Direct
  const handlePrintDirect = async () => {
    if (receipts.length === 0) return;
    setIsGeneratingPdf(true);

    try {
      const doc = await buildA4GridPdf(receipts, options);
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = blobUrl;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        setTimeout(() => {
          iframe.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
            URL.revokeObjectURL(blobUrl);
          }, 60000);
        }, 300);
      };
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Gagal membuka dialog cetak: ' + err.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const distinctFileNames = Array.from(new Set(receipts.map((r) => r.sourceFileName)));
  const editingReceipt = receipts.find((r) => r.id === editingReceiptId) || null;

  // Auto-sync receipts to server so they can be viewed when scanned by smartphones
  React.useEffect(() => {
    if (receipts.length > 0) {
      receipts.forEach((r) => {
        syncReceiptToServer(
          r,
          options.watermarkEnabled ? options.watermarkText : undefined,
          options.watermarkColor,
          options.watermarkPosYPct
        ).catch(() => {});
      });
    }
  }, [
    receipts,
    options.watermarkEnabled,
    options.watermarkText,
    options.watermarkColor,
    options.watermarkPosYPct,
  ]);

  // If URL has ?nota=... or ?id=..., display mobile-optimized e-receipt viewer immediately
  if (mobileNotaId) {
    return (
      <MobileReceiptView
        receiptId={mobileNotaId}
        onBackToApp={() => {
          window.history.pushState({}, '', window.location.pathname);
          setMobileNotaId(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-200">
      {/* Top Navigation */}
      <Header onOpenNeonModal={() => setIsNeonModalOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        {/* Banner Alert if error */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/80 rounded-xl text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-600 dark:text-rose-400 hover:text-rose-900 dark:hover:text-rose-200 font-bold ml-4 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* 2-Column Responsive Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Upload, Receipt List & Settings (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Upload Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFiles(e.dataTransfer.files);
              }}
              className={`p-6 rounded-2xl border-2 border-dashed transition-all text-center relative ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 ring-4 ring-blue-500/20'
                  : 'border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,application/pdf,image/png,image/jpeg,image/webp"
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
                id="receipt-file-input"
              />

              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
                <Upload className="w-6 h-6 stroke-[2]" />
              </div>

              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                Unggah Berkas PDF Nota / Faktur
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                Tarik & letakkan file PDF nota kasir di sini untuk langsung disusun ke kertas A4.
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <label
                  htmlFor="receipt-file-input"
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer shadow-xs transition-colors"
                >
                  Pilih File PDF
                </label>

                <button
                  type="button"
                  onClick={() => setIsNeonModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-cyan-900 dark:text-cyan-200 bg-cyan-100 hover:bg-cyan-200 dark:bg-cyan-950/80 dark:hover:bg-cyan-900 border border-cyan-300 dark:border-cyan-800 rounded-xl cursor-pointer shadow-xs transition-colors"
                  title="Tarik Data Laporan Gaji Buku Produksi"
                >
                  <Database className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                  <span>Buku Produksi</span>
                </button>
              </div>

              {isProcessingFile && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 rounded-xl text-xs flex items-center justify-center gap-2 font-medium">
                  <RefreshCcw className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                  <span>{processingStatus || 'Memproses dokumen...'}</span>
                </div>
              )}
            </div>

            {/* Uploaded Receipts List Manager */}
            {receipts.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 transition-colors">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      Daftar Nota Terunggah ({receipts.length})
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsBatchRenameOpen(true)}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                      title="Ubah Nama Nota Secara Sekaligus"
                    >
                      <Edit3 className="w-3 h-3" /> Ubah Nama Massal
                    </button>
                    <button
                      onClick={handleClearAll}
                      className="text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Kosongkan
                    </button>
                  </div>
                </div>

                {distinctFileNames.length > 1 && (
                  <div className="mb-2 px-3 py-2 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 rounded-xl text-[11px] text-indigo-900 dark:text-indigo-300 flex items-center justify-between">
                    <span>
                      📁 <strong>{distinctFileNames.length} File PDF terunggah</strong>. Anda dapat mengatur ukuran, watermark, atau QR Code berbeda antar-file dengan menekan tombol <strong>Sesuaikan</strong>.
                    </span>
                  </div>
                )}

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {receipts.map((item, idx) => (
                    <ReceiptItemCard
                      key={item.id}
                      item={item}
                      index={idx}
                      onRemove={handleRemoveReceipt}
                      onDuplicate={handleDuplicateReceipt}
                      onRotate={handleRotateReceipt}
                      onEdit={(it) => setEditingReceiptId(it.id)}
                      onRename={handleSingleRename}
                      onSimulateMobile={(it) => setSimulatingReceipt(it)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Layout Settings Panel */}
            <SettingsPanel
              options={options}
              onChange={setOptions}
              receiptCount={receipts.length}
              onRotateAll={handleRotateAll}
              onAutoTrimToggle={handleAutoTrimToggle}
              onBottomCropChange={handleBottomCropChange}
            />

            {/* Modal Edit Khusus Per Nota / File */}
            {editingReceipt && (
              <ReceiptEditModal
                item={editingReceipt}
                globalOptions={options}
                allReceipts={receipts}
                onClose={() => setEditingReceiptId(null)}
                onSave={handleSaveReceiptConfig}
              />
            )}

            {/* Modal Ubah Nama Massal (Batch Rename) */}
            {isBatchRenameOpen && (
              <BatchRenameModal
                receipts={receipts}
                onClose={() => setIsBatchRenameOpen(false)}
                onRenameBatch={handleBatchRename}
              />
            )}

            {/* Modal Simulator Tampilan Layar HP (iOS / Android) */}
            {simulatingReceipt && (
              <MobileSimulatorModal
                isOpen={true}
                item={simulatingReceipt}
                watermarkText={options.watermarkEnabled ? options.watermarkText : undefined}
                watermarkColor={options.watermarkColor}
                watermarkPosYPct={options.watermarkPosYPct}
                onClose={() => setSimulatingReceipt(null)}
              />
            )}

            {/* Modal Integrasi Neon Database Buku Produksi */}
            {isNeonModalOpen && (
              <NeonBukuProduksiModal
                isOpen={true}
                onClose={() => setIsNeonModalOpen(false)}
                onImportReceipts={handleImportNeonReceipts}
              />
            )}
          </div>

          {/* Right Column: Sheet Live Preview (7 cols) */}
          <div className="lg:col-span-7 sticky top-20">
            <SheetPreview
              receipts={receipts}
              options={options}
              onDownloadPdf={handleDownloadPdf}
              onPrintDirect={handlePrintDirect}
              onRotateStep={handleRotateStep}
              isGeneratingPdf={isGeneratingPdf}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
