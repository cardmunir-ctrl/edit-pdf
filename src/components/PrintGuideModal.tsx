import React from 'react';
import { X, Printer, CheckCircle2, AlertTriangle } from 'lucide-react';

interface PrintGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrintGuideModal: React.FC<PrintGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-amber-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Panduan Mencetak Skala 100% (Actual Size)
              </h2>
              <p className="text-xs text-slate-500">
                Agar ukuran kotak pas 105 mm x 74.25 mm dan garis potong presisi
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

        {/* Content */}
        <div className="p-6 space-y-5 text-sm text-slate-700">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900 text-sm">Peringatan Penting Pengaturan Printer</h3>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Secara default, browser sering kali mengaktifkan opsi <strong>"Fit to Printable Area"</strong> (Sesuaikan dengan area cetak). Opsi ini akan mengecilkan nota sebesar 3-5%, menyebabkan ukuran kotak tidak pas. Ikuti 3 langkah di bawah ini:
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                1
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 text-sm">Ukuran Kertas (Paper Size)</h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Pastikan memilih <strong>A4 (210 x 297 mm)</strong>, orientasi <strong>Portrait (Tegak)</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                2
              </div>
              <div>
                <h4 className="font-semibold text-emerald-900 text-sm">Skala Cetak (Scale) — KUNCI PRESISI</h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Pilih <strong>"Actual Size" (Ukuran Sebenarnya)</strong> atau ketik manual skala <strong>100%</strong>. JANGAN pilih <em>"Fit to paper"</em> atau <em>"Shrink to fit"</em>.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                3
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 text-sm">Margin Cetak</h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Pilih <strong>None (Tanpa Margin)</strong> atau <strong>Default</strong>. Pastikan opsi <em>"Headers and footers"</em> (Kepala dan catatan kaki browser) dimatikan agar bersih.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-100/80 rounded-xl">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              Hasil Pemotongan Kertas
            </h4>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-5">
              <li>Lembar A4 dipotong tengah vertikal (garis x = 105 mm).</li>
              <li>Masing-masing kolom dipotong 3 kali horizontal (y = 74.25 mm, 148.5 mm, 222.75 mm).</li>
              <li>Hasil: 8 lembar nota A8 lanskap rapi dan seragam.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer"
          >
            Mengerti, Lanjutkan Cetak
          </button>
        </div>
      </div>
    </div>
  );
};
