import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Maximize2,
  RefreshCw,
} from 'lucide-react';
import { ReceiptItem } from '../lib/pdfEngine';
import { getReceiptMobileUrl, syncReceiptToServer } from '../lib/receiptSync';
import { getQrDataUrl } from '../lib/qrCodeHelper';
import { MobileReceiptView } from './MobileReceiptView';

interface MobileSimulatorModalProps {
  isOpen: boolean;
  item: ReceiptItem | null;
  watermarkText?: string;
  watermarkColor?: 'gray' | 'red' | 'blue' | 'green';
  watermarkPosYPct?: number;
  onClose: () => void;
}

export const MobileSimulatorModal: React.FC<MobileSimulatorModalProps> = ({
  isOpen,
  item,
  watermarkText,
  watermarkColor,
  watermarkPosYPct,
  onClose,
}) => {
  if (!isOpen || !item) return null;

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [mobileUrl, setMobileUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    let mounted = true;
    setIsSyncing(true);

    // Sync receipt to server/local storage so it's accessible by mobile phones
    syncReceiptToServer(item, watermarkText, watermarkColor, watermarkPosYPct).then((url) => {
      if (!mounted) return;
      setMobileUrl(url);
      setIsSyncing(false);

      // Generate scannable QR Code for this exact URL
      getQrDataUrl(url).then((qr) => {
        if (!mounted) return;
        setQrDataUrl(qr);
      });
    });

    return () => {
      mounted = false;
    };
  }, [item, watermarkText, watermarkColor, watermarkPosYPct]);

  const handleCopyLink = () => {
    if (!mobileUrl) return;
    navigator.clipboard.writeText(mobileUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 w-full max-w-4xl max-h-[95vh] rounded-3xl shadow-2xl flex flex-col border border-slate-800 overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Pratinjau Layar HP (iOS / Android Simulator)</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 font-mono px-2 py-0.5 rounded-full font-bold border border-emerald-800/80">
                  Responsif Pas Layar
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Tampilan persis yang dilihat pelanggan saat memindai QR Code di nota fisik
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content: Two-column layout on desktop */}
        <div className="p-6 flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Left Column: QR Code Scan Tester (5 cols) */}
          <div className="md:col-span-5 flex flex-col items-center justify-center text-center space-y-4 p-5 bg-slate-800/40 rounded-2xl border border-slate-800">
            <div className="space-y-1">
              <span className="text-xs font-bold text-cyan-300 flex items-center justify-center gap-1.5">
                <QrCode className="w-4 h-4 text-cyan-400" />
                <span>Pindai Langsung Pakai Kamera HP</span>
              </span>
              <p className="text-[11px] text-slate-400 max-w-xs">
                Arahkan kamera smartphone (iPhone / Android) ke QR Code di bawah untuk membuka nota di HP Anda:
              </p>
            </div>

            {/* Scannable QR Code Image */}
            <div className="p-3 bg-white rounded-2xl shadow-xl border-4 border-cyan-500/30 relative flex items-center justify-center w-52 h-52">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Scannable QR Code"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-cyan-500" />
                  <span className="text-[10px] font-mono">Membuat QR Code...</span>
                </div>
              )}
            </div>

            {/* Direct URL copy */}
            <div className="w-full space-y-2">
              <div className="flex items-center gap-1.5 p-2 bg-slate-900 rounded-xl border border-slate-700/80 text-xs font-mono">
                <span className="text-slate-400 truncate flex-1 text-left select-all" title={mobileUrl}>
                  {mobileUrl || 'Menyiapkan tautan...'}
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer shrink-0 transition-colors"
                  title="Salin Tautan"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <a
                href={mobileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                <span>Buka di tab baru browser</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Right Column: Realistic iPhone / Android Mockup (7 cols) */}
          <div className="md:col-span-7 flex flex-col items-center justify-center">
            {/* Phone Frame Mockup */}
            <div className="w-[320px] sm:w-[360px] h-[580px] bg-slate-950 rounded-[44px] p-3 shadow-2xl border-4 border-slate-700 relative overflow-hidden flex flex-col ring-1 ring-slate-600">
              {/* iPhone Dynamic Island / Speaker Notch */}
              <div className="w-28 h-4 bg-slate-900 rounded-full mx-auto mb-2 shrink-0 flex items-center justify-center gap-2 z-50">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-800" />
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
              </div>

              {/* Mobile Screen Container */}
              <div className="flex-1 w-full bg-slate-900 rounded-[32px] overflow-y-auto border border-slate-800 relative scrollbar-none flex flex-col">
                <MobileReceiptView receiptId={item.id} />
              </div>

              {/* Home indicator bar at bottom */}
              <div className="w-32 h-1 bg-slate-600 rounded-full mx-auto mt-2 shrink-0" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 flex items-center justify-between bg-slate-900/60">
          <p className="text-xs text-slate-400">
            QR Code pada cetakan nota fisik akan langsung mengarahkan kamera HP ke halaman ini.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
