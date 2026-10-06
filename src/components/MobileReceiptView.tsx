import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  Share2,
  CheckCircle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ArrowLeft,
  ShieldCheck,
  Calendar,
  Layers,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { MobileReceiptData, fetchReceiptData } from '../lib/receiptSync';
import { downloadSingleReceiptPdf } from '../lib/pdfEngine';

interface MobileReceiptViewProps {
  receiptId: string;
  onBackToApp?: () => void;
}

export const MobileReceiptView: React.FC<MobileReceiptViewProps> = ({
  receiptId,
  onBackToApp,
}) => {
  const [receipt, setReceipt] = useState<MobileReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    fetchReceiptData(receiptId)
      .then((data) => {
        if (!mounted) return;
        if (data) {
          setReceipt(data);
        } else {
          setError(
            'Nota digital tidak ditemukan. Pastikan QR Code yang Anda pindai valid dan berasal dari aplikasi ini.'
          );
        }
      })
      .catch((err) => {
        if (!mounted) return;
        setError('Gagal memuat nota digital: ' + err.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [receiptId]);

  // Handle Download Single PDF
  const handleDownloadPdf = async () => {
    if (!receipt) return;
    setIsDownloading(true);
    try {
      await downloadSingleReceiptPdf({
        id: receipt.id,
        sourceFileName: receipt.sourceFileName,
        dataUrl: receipt.dataUrl,
        width: receipt.width,
        height: receipt.height,
        rotation: receipt.rotation,
        watermarkText: receipt.watermarkText,
        watermarkColor: receipt.watermarkColor,
        watermarkPosYPct: receipt.watermarkPosYPct,
      });
    } catch (err: any) {
      alert('Gagal mengunduh PDF: ' + err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle Mobile Print (AirPrint / Wireless Print)
  const handlePrint = () => {
    window.print();
  };

  // Handle Mobile Share
  const handleShare = async () => {
    const url = window.location.href;
    const shareTitle = `Nota Digital: ${receipt?.sourceFileName || 'Slip'}`;
    const shareText = `Lihat e-nota digital resmi (${receipt?.transactionId || ''}) di sini:`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: url,
        });
      } catch (err) {
        // User cancelled or share failed, fallback to copy
        copyLink(url);
      }
    } else {
      copyLink(url);
    }
  };

  const copyLink = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const cycleZoom = () => {
    if (zoomLevel === 1) setZoomLevel(1.35);
    else if (zoomLevel === 1.35) setZoomLevel(1.75);
    else setZoomLevel(1);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Top Header bar styled for iPhone / Android notch */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-xs print:hidden">
        <div className="flex items-center gap-2.5 min-w-0">
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="p-1.5 -ml-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Kembali ke Editor Utama"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs font-bold text-white truncate">
                E-Nota Digital Terverifikasi
              </h1>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono truncate">
              {receipt?.transactionId || `#${receiptId.slice(0, 8).toUpperCase()}`}
            </p>
          </div>
        </div>

        {/* Quick Zoom Toggle on Header */}
        <button
          onClick={cycleZoom}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-semibold border border-slate-700 cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
          <span>{Math.round(zoomLevel * 100)}%</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center p-3 sm:p-5 max-w-md w-full mx-auto pb-28">
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <span className="text-xs font-medium">Memuat nota digital...</span>
          </div>
        )}

        {error && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Nota Tidak Ditemukan</h3>
            <p className="text-xs text-slate-400 max-w-xs mb-5">{error}</p>
            {onBackToApp && (
              <button
                onClick={onBackToApp}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Kembali ke Beranda
              </button>
            )}
          </div>
        )}

        {receipt && !loading && (
          <div className="w-full space-y-3.5 flex flex-col items-center">
            {/* Status verification banner */}
            <div className="w-full bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-2.5 flex items-center justify-between text-xs print:hidden">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-emerald-300 font-semibold truncate">
                  Dokumen Resmi Valid & Asli
                </span>
              </div>
              <span className="text-[10px] text-emerald-400/90 font-mono shrink-0">
                {receipt.date}
              </span>
            </div>

            {/* Receipt Card Wrapper: Perfectly sized for mobile phone screens */}
            <div
              className="w-full bg-slate-950/70 border border-slate-800 rounded-2xl p-2 sm:p-3 overflow-hidden shadow-2xl relative flex flex-col items-center"
            >
              {/* Paper Slip Card Container */}
              <div
                id="printable-receipt-card"
                className="w-full bg-white rounded-xl shadow-lg overflow-hidden relative transition-transform duration-200 origin-top flex items-center justify-center"
                style={{
                  transform: `scale(${zoomLevel})`,
                  aspectRatio: `${receipt.width} / ${receipt.height}`,
                }}
              >
                {/* Clean Receipt Image */}
                <img
                  src={receipt.dataUrl}
                  alt={receipt.sourceFileName}
                  className="w-full h-full object-fill block select-none pointer-events-none"
                />

                {/* Watermark Overlay in identical positioning */}
                {receipt.watermarkText?.trim() && (
                  <div
                    className="absolute pointer-events-none select-none font-bold tracking-wider uppercase flex items-center justify-center text-center whitespace-nowrap"
                    style={{
                      left: '50%',
                      top: `${receipt.watermarkPosYPct ?? 40}%`,
                      transform: 'translate(-50%, -50%) rotate(-25deg)',
                      opacity: 0.26,
                      color:
                        receipt.watermarkColor === 'red'
                          ? '#dc2626'
                          : receipt.watermarkColor === 'blue'
                          ? '#2563eb'
                          : receipt.watermarkColor === 'green'
                          ? '#059669'
                          : '#64748b',
                      fontSize: 'clamp(14px, 4.5vw, 24px)',
                      fontFamily: 'Helvetica, Arial, sans-serif',
                      letterSpacing: '0.12em',
                      lineHeight: 1,
                    }}
                  >
                    {receipt.watermarkText}
                  </div>
                )}
              </div>

              {/* Tap to zoom hint */}
              <p className="text-[10px] text-slate-500 font-mono mt-2.5 text-center print:hidden flex items-center justify-center gap-1">
                <span>Ketuk zoom di atas untuk memperbesar teks nota</span>
              </p>
            </div>

            {/* Receipt Metadata Card */}
            <div className="w-full bg-slate-800/60 border border-slate-800 rounded-xl p-3 text-xs space-y-2 print:hidden">
              <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                <span className="text-slate-400">Nama Berkas:</span>
                <span className="font-semibold text-slate-200 truncate max-w-[200px]" title={receipt.sourceFileName}>
                  {receipt.sourceFileName}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                <span className="text-slate-400">ID Dokumen:</span>
                <span className="font-mono font-bold text-blue-400">
                  {receipt.transactionId}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Status Cap:</span>
                <span className="font-semibold text-emerald-400">
                  {receipt.watermarkText ? `RESMI (${receipt.watermarkText})` : 'RESMI'}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Bottom Action Bar for Mobile Screens */}
      {receipt && !loading && (
        <div className="fixed bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-3 sm:p-4 z-40 max-w-md mx-auto print:hidden shadow-2xl">
          <div className="grid grid-cols-3 gap-2">
            {/* 1. Unduh PDF Nota Ini */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
            >
              {isDownloading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4 stroke-[2.2]" />
              )}
              <span className="text-[11px] leading-tight">Unduh PDF</span>
            </button>

            {/* 2. Cetak Nota */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs border border-slate-700 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-400 stroke-[2.2]" />
              <span className="text-[11px] leading-tight">Cetak Nota</span>
            </button>

            {/* 3. Bagikan Link */}
            <button
              type="button"
              onClick={handleShare}
              className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs border border-slate-700 transition-all cursor-pointer"
            >
              {isCopied ? (
                <Check className="w-4 h-4 text-emerald-400 stroke-[2.2]" />
              ) : (
                <Share2 className="w-4 h-4 text-blue-400 stroke-[2.2]" />
              )}
              <span className="text-[11px] leading-tight">
                {isCopied ? 'Tersalin!' : 'Bagikan'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Print Specific CSS to print just the clean receipt */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          header, footer, nav, button, .print\\:hidden {
            display: none !important;
          }
          #printable-receipt-card {
            box-shadow: none !important;
            transform: none !important;
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};
