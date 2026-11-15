import React from 'react';
import {
  Sliders,
  Copy,
  LayoutGrid,
  Maximize2,
} from 'lucide-react';
import { GridOptions } from '../lib/pdfEngine';

interface SettingsPanelProps {
  options: GridOptions;
  onChange: (options: GridOptions) => void;
  receiptCount: number;
  onRotateAll: (degrees: number) => void;
  onAutoTrimToggle: (enabled: boolean) => void;
  onBottomCropChange: (pct: number) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  options,
  onChange,
  receiptCount,
  onRotateAll,
  onAutoTrimToggle,
  onBottomCropChange,
}) => {
  const updateOption = <K extends keyof GridOptions>(key: K, value: GridOptions[K]) => {
    onChange({
      ...options,
      [key]: value,
    });
  };

  const currentDisplayCount = options.displayCount || 8;
  const currentGap = typeof options.gapMm === 'number' ? options.gapMm : 4.0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
      <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Pengaturan Cetak</h3>
        </div>
      </div>

      <div className="p-5 space-y-5 text-xs text-slate-700 dark:text-slate-300">
        {/* Fitur 2: Pilih Jumlah Nota Ditampilkan (1 - 8 Kotak) */}
        <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200/70 dark:border-blue-900/60">
          <div className="flex items-center justify-between mb-2">
            <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
              <LayoutGrid className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Jumlah Nota Ditampilkan (1 - 8):</span>
            </label>
            <span className="text-xs font-mono font-bold bg-blue-600 dark:bg-blue-500 text-white px-2 py-0.5 rounded-md shadow-2xs">
              {currentDisplayCount} Kotak Aktif
            </span>
          </div>

          <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-3">
            Pilih berapa nota yang ingin dicetak pada lembar A4. Nota otomatis mengisi kotak yang Anda pilih.
          </p>

          {/* Quick Number Selector (1 to 8 buttons) */}
          <div className="grid grid-cols-8 gap-1.5 mb-2.5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => updateOption('displayCount', num)}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  currentDisplayCount === num
                    ? 'bg-blue-600 border-blue-600 text-white shadow-xs scale-105'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 hover:border-blue-300 dark:hover:border-blue-600'
                }`}
              >
                {num}
              </button>
            ))}
          </div>

          {/* Slider for precision */}
          <input
            type="range"
            min={1}
            max={8}
            step={1}
            value={currentDisplayCount}
            onChange={(e) => updateOption('displayCount', parseInt(e.target.value, 10))}
            className="w-full accent-blue-600 dark:accent-blue-500 cursor-pointer h-1.5 bg-blue-200 dark:bg-blue-900/60 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
            <span>1 Nota</span>
            <span>4 (Setengah Lembar)</span>
            <span>8 (Penuh Lembar)</span>
          </div>
        </div>

        {/* Fitur 3: Slider Margin Antar-Nota (Gap) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Jarak Margin Antar-Nota (Gap):</span>
            </label>
            <span className="font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded text-[11px]">
              {currentGap} mm
            </span>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
            Mengatur jarak spasi kosong antar kotak nota untuk keleluasaan saat menggunting kertas.
          </p>

          <input
            type="range"
            min={0}
            max={15}
            step={0.5}
            value={currentGap}
            onChange={(e) => updateOption('gapMm', parseFloat(e.target.value))}
            className="w-full accent-blue-600 dark:accent-blue-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono">
            <span>0 mm (Rapat)</span>
            <span>4 mm (Standar)</span>
            <span>8 mm</span>
            <span>15 mm (Lebar)</span>
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* Repeat single receipt */}
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={options.repeatSingle}
              onChange={(e) => updateOption('repeatSingle', e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-blue-600 dark:text-blue-500 accent-blue-600 cursor-pointer"
            />
            <div className="flex-1">
              <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Otomatis Gandakan 1 Nota Mengisi Kotak</span>
                {receiptCount === 1 && (
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold px-1.5 py-0.2 rounded">
                    Aktif ({currentDisplayCount} Kotak)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Jika mengunggah 1 nota, sistem otomatis mengisinya sebanyak {currentDisplayCount} kotak di lembar A4.
              </p>
            </div>
          </label>

          {/* Show Page Numbers in footer */}
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={options.showPageNumbers}
              onChange={(e) => updateOption('showPageNumbers', e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-blue-600 dark:text-blue-500 accent-blue-600 cursor-pointer"
            />
            <div className="flex-1">
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                Tampilkan Keterangan Footer Halaman
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Biarkan mati agar lembar cetak benar-benar bersih tanpa teks tambahan di luar nota.
              </p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};
