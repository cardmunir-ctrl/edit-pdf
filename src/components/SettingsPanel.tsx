import React from 'react';
import {
  Sliders,
  Copy,
  Scissors,
  Compass,
  Crop,
  CheckCircle2,
  FileText,
  LayoutGrid,
  Maximize2,
  Stamp,
  Type,
  MoveVertical,
  QrCode,
  Link as LinkIcon,
} from 'lucide-react';
import { GridOptions, PaperOrientation, QrPositionPreset } from '../lib/pdfEngine';

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

  const currentOrientation: PaperOrientation = options.paperOrientation || 'portrait';
  const currentDisplayCount = options.displayCount || 8;
  const currentGap = typeof options.gapMm === 'number' ? options.gapMm : 4.0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
      <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Pengaturan Cetak</h3>
        </div>
        <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/70 px-2 py-0.5 rounded-full font-semibold">
          {options.dashedLineStyle === 'none' ? 'Hasil Polos Bersih' : 'Garis Aktif'}
        </span>
      </div>

      <div className="p-5 space-y-5 text-xs text-slate-700 dark:text-slate-300">
        {/* Fitur 1: Pilihan Orientasi Kertas A4 (Potret vs Lanskap) */}
        <div>
          <label className="font-semibold text-slate-800 dark:text-slate-200 block mb-2 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Orientasi Kertas A4:</span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            {/* Opsi 1: Potret */}
            <button
              type="button"
              onClick={() => updateOption('paperOrientation', 'portrait')}
              className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                currentOrientation === 'portrait'
                  ? 'border-blue-600 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20 shadow-xs font-semibold'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 bg-slate-50/40 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <div
                className={`w-9 h-12 rounded border flex flex-col justify-between p-0.5 shrink-0 transition-colors ${
                  currentOrientation === 'portrait'
                    ? 'border-blue-500 bg-white dark:bg-slate-800 shadow-2xs'
                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                }`}
              >
                <div className="grid grid-cols-2 grid-rows-4 gap-0.5 w-full h-full">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-xs ${
                        i < currentDisplayCount
                          ? currentOrientation === 'portrait'
                            ? 'bg-blue-500'
                            : 'bg-slate-400 dark:bg-slate-500'
                          : 'bg-slate-200/50 dark:bg-slate-700/40'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Potret (Tegak)</span>
                  {currentOrientation === 'portrait' && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400"></span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
                  2 Kolom × 4 Baris
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                  210 × 297 mm
                </p>
              </div>
            </button>

            {/* Opsi 2: Lanskap */}
            <button
              type="button"
              onClick={() => updateOption('paperOrientation', 'landscape')}
              className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                currentOrientation === 'landscape'
                  ? 'border-blue-600 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20 shadow-xs font-semibold'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 bg-slate-50/40 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <div
                className={`w-12 h-9 rounded border flex flex-col justify-between p-0.5 shrink-0 transition-colors ${
                  currentOrientation === 'landscape'
                    ? 'border-blue-500 bg-white dark:bg-slate-800 shadow-2xs'
                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                }`}
              >
                <div className="grid grid-cols-4 grid-rows-2 gap-0.5 w-full h-full">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-xs ${
                        i < currentDisplayCount
                          ? currentOrientation === 'landscape'
                            ? 'bg-blue-500'
                            : 'bg-slate-400 dark:bg-slate-500'
                          : 'bg-slate-200/50 dark:bg-slate-700/40'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Lanskap (Mendatar)</span>
                  {currentOrientation === 'landscape' && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400"></span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
                  4 Kolom × 2 Baris
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                  297 × 210 mm
                </p>
              </div>
            </button>
          </div>
        </div>

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

        {/* Pangkas Margin Putih (Auto-Trim) */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center">
                <Crop className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-200 text-xs">Pangkas Margin Putih</h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">Menghilangkan ruang kosong pada nota</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onAutoTrimToggle(!options.autoTrimWhite)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                options.autoTrimWhite
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              {options.autoTrimWhite ? 'Aktif' : 'Mati'}
            </button>
          </div>

          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            {options.autoTrimWhite ? (
              <span className="text-blue-900 dark:text-blue-300 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                Sisa area kosong di bagian bawah/tepi otomatis dipangkas agar nota pas di kotak.
              </span>
            ) : (
              'Menampilkan seluruh halaman termasuk area kosong.'
            )}
          </p>

          {/* Slider Pangkas Bawah Manual */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                Pangkas Manual Bagian Bawah:
              </label>
              <span className="font-mono font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 text-[11px]">
                {options.customBottomCropPct}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={60}
              step={5}
              value={options.customBottomCropPct}
              onChange={(e) => onBottomCropChange(parseInt(e.target.value, 10))}
              className="w-full accent-blue-600 dark:accent-blue-500 cursor-pointer h-1.5 bg-blue-200/70 dark:bg-blue-950/60 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
              <span>0% (Asli)</span>
              <span>30%</span>
              <span>60%</span>
            </div>
          </div>
        </div>

        {/* Fitur Watermark / Cap Tanda Air (Contoh: LUNAS) */}
        <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shadow-xs">
                <Stamp className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                  <span>Watermark / Cap Tanda Air</span>
                  {options.watermarkEnabled && (
                    <span className="text-[9px] bg-indigo-600 text-white font-mono px-1.5 py-0.2 rounded-full">
                      {options.watermarkText || 'LUNAS'}
                    </span>
                  )}
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Cap miring transparan (seperti contoh LUNAS pada slip gaji)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => updateOption('watermarkEnabled', !options.watermarkEnabled)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                options.watermarkEnabled
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              {options.watermarkEnabled ? 'Aktif' : 'Mati'}
            </button>
          </div>

          {/* Opsi Pilihan Watermark: Tombol Aktif / Tanpa Watermark */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateOption('watermarkEnabled', true)}
              className={`py-2 px-3 rounded-lg border text-left text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                options.watermarkEnabled
                  ? 'border-indigo-600 dark:border-indigo-500 bg-white dark:bg-slate-800 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${options.watermarkEnabled ? 'bg-indigo-600 dark:bg-indigo-400' : 'bg-slate-300'}`} />
              <span>Gunakan Watermark</span>
            </button>

            <button
              type="button"
              onClick={() => updateOption('watermarkEnabled', false)}
              className={`py-2 px-3 rounded-lg border text-left text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                !options.watermarkEnabled
                  ? 'border-indigo-600 dark:border-indigo-500 bg-white dark:bg-slate-800 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${!options.watermarkEnabled ? 'bg-indigo-600 dark:bg-indigo-400' : 'bg-slate-300'}`} />
              <span>Tanpa Watermark</span>
            </button>
          </div>

          {/* Pengaturan Detail Watermark (Bila Aktif) */}
          {options.watermarkEnabled && (
            <div className="space-y-3 pt-2 border-t border-indigo-100 dark:border-indigo-900/60">
              {/* 1. Teks Watermark */}
              <div>
                <label className="font-semibold text-slate-800 dark:text-slate-200 block mb-1 text-[11px] flex items-center gap-1">
                  <Type className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                  <span>Teks Watermark:</span>
                </label>
                <input
                  type="text"
                  value={options.watermarkText || ''}
                  onChange={(e) => updateOption('watermarkText', e.target.value)}
                  placeholder="Contoh: LUNAS"
                  className="w-full px-2.5 py-1.5 text-xs font-bold font-mono tracking-wider rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />

                {/* Quick Presets for Text */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {['LUNAS', 'PAID', 'SLIP GAJI', 'COPY', 'SELESAI'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => updateOption('watermarkText', preset)}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer font-mono font-medium ${
                        options.watermarkText === preset
                          ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Posisi Vertikal / Ketinggian (Disorot sesuai permintaan khusus user) */}
              <div className="p-2.5 bg-white dark:bg-slate-800/90 rounded-lg border border-indigo-200 dark:border-indigo-900/70">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-900 dark:text-slate-100 text-[11px] flex items-center gap-1">
                    <MoveVertical className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Ketinggian Watermark (Posisi Y):</span>
                  </label>
                  <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 text-[10px]">
                    {options.watermarkPosYPct ?? 45}%
                  </span>
                </div>

                {/* Info tip khusus user request */}
                <p className="text-[10px] text-indigo-900 dark:text-indigo-300 mb-2 leading-tight">
                  <strong className="text-indigo-700 dark:text-indigo-400">Posisi 45% (Agak ke Atas):</strong> Tepat di area rincian / Sisa Gaji agar tulisan watermark tidak terpotong saat diprint & digunting.
                </p>

                {/* Quick Presets for Position */}
                <div className="grid grid-cols-3 gap-1 mb-2">
                  <button
                    type="button"
                    onClick={() => updateOption('watermarkPosYPct', 45)}
                    className={`py-1 px-1.5 rounded text-[10px] font-semibold border text-center transition-all cursor-pointer ${
                      (options.watermarkPosYPct ?? 45) === 45
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-indigo-50'
                    }`}
                  >
                    45% (Pas Sisa Gaji)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateOption('watermarkPosYPct', 50)}
                    className={`py-1 px-1.5 rounded text-[10px] font-semibold border text-center transition-all cursor-pointer ${
                      options.watermarkPosYPct === 50
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-indigo-50'
                    }`}
                  >
                    50% (Tengah Nota)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateOption('watermarkPosYPct', 65)}
                    className={`py-1 px-1.5 rounded text-[10px] font-semibold border text-center transition-all cursor-pointer ${
                      options.watermarkPosYPct === 65
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-indigo-50'
                    }`}
                  >
                    65% (Agak Bawah)
                  </button>
                </div>

                <input
                  type="range"
                  min={20}
                  max={75}
                  step={1}
                  value={options.watermarkPosYPct ?? 45}
                  onChange={(e) => updateOption('watermarkPosYPct', parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-600 dark:accent-indigo-500 cursor-pointer h-1.5 bg-indigo-200 dark:bg-indigo-900 rounded-lg"
                />
                <div className="flex justify-between text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">
                  <span>20% (Atas)</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">45% (Sisa Gaji - Aman)</span>
                  <span>75% (Bawah)</span>
                </div>
              </div>

              {/* 3. Pilihan Warna & Transparansi */}
              <div className="grid grid-cols-2 gap-2">
                {/* Warna */}
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
                    ].map((col) => (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => updateOption('watermarkColor', col.id as any)}
                        title={col.label}
                        className={`py-1.5 rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                          (options.watermarkColor || 'gray') === col.id
                            ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 ring-1 ring-indigo-500'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-3 h-3 rounded-full ${col.bg}`} />
                        <span className="text-[9px] text-slate-600 dark:text-slate-400">{col.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Opasitas / Transparansi */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                      Transparansi:
                    </label>
                    <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400 font-bold">
                      {Math.round((options.watermarkOpacity ?? 0.25) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={0.6}
                    step={0.05}
                    value={options.watermarkOpacity ?? 0.25}
                    onChange={(e) => updateOption('watermarkOpacity', parseFloat(e.target.value))}
                    className="w-full accent-indigo-600 dark:accent-indigo-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg mt-2"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-mono">
                    <span>10% (Pudar)</span>
                    <span>60% (Pekat)</span>
                  </div>
                </div>
              </div>

              {/* 4. Kemiringan / Rotasi & Ukuran Teks */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-indigo-100 dark:border-indigo-900/40">
                {/* Kemiringan Derajat */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                      Kemiringan:
                    </label>
                    <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400 font-bold">
                      {options.watermarkAngle ?? -25}°
                    </span>
                  </div>
                  <div className="flex gap-1 mb-1">
                    {[-25, 0, -45].map((ang) => (
                      <button
                        key={ang}
                        type="button"
                        onClick={() => updateOption('watermarkAngle', ang)}
                        className={`flex-1 py-0.5 text-[9px] font-mono rounded border transition-colors cursor-pointer ${
                          (options.watermarkAngle ?? -25) === ang
                            ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {ang}°
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ukuran Font */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                      Ukuran Teks:
                    </label>
                    <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400 font-bold">
                      {options.watermarkFontSize ?? 24} pt
                    </span>
                  </div>
                  <input
                    type="range"
                    min={16}
                    max={36}
                    step={2}
                    value={options.watermarkFontSize ?? 24}
                    onChange={(e) => updateOption('watermarkFontSize', parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-600 dark:accent-indigo-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg mt-1"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-mono">
                    <span>16pt</span>
                    <span>24pt</span>
                    <span>36pt</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fitur QR Code Nota (Teks Kustom, Posisi, dan Ukuran) */}
        <div className="p-3.5 bg-cyan-50/50 dark:bg-cyan-950/30 rounded-xl border border-cyan-200/80 dark:border-cyan-900/60 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-cyan-600 dark:bg-cyan-500 text-white flex items-center justify-center shadow-xs">
                <QrCode className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                  <span>QR Code Nota</span>
                  {options.qrEnabled && (
                    <span className="text-[9px] bg-cyan-600 text-white font-mono px-1.5 py-0.2 rounded-full font-bold">
                      Aktif ({options.qrSizeMm || 14}mm)
                    </span>
                  )}
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Sisipkan QR Code kustom pada setiap nota sebelum dicetak
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => updateOption('qrEnabled', !options.qrEnabled)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                options.qrEnabled
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              {options.qrEnabled ? 'Aktif' : 'Mati'}
            </button>
          </div>

          {/* Opsi Pilihan QR Code: Tombol Aktif / Tanpa QR Code */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateOption('qrEnabled', true)}
              className={`py-2 px-3 rounded-lg border text-left text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                options.qrEnabled
                  ? 'border-cyan-600 dark:border-cyan-500 bg-white dark:bg-slate-800 text-cyan-950 dark:text-cyan-200 ring-2 ring-cyan-500/20 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${options.qrEnabled ? 'bg-cyan-600 dark:bg-cyan-400' : 'bg-slate-300'}`} />
              <span>Gunakan QR Code</span>
            </button>

            <button
              type="button"
              onClick={() => updateOption('qrEnabled', false)}
              className={`py-2 px-3 rounded-lg border text-left text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                !options.qrEnabled
                  ? 'border-cyan-600 dark:border-cyan-500 bg-white dark:bg-slate-800 text-cyan-950 dark:text-cyan-200 ring-2 ring-cyan-500/20 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${!options.qrEnabled ? 'bg-cyan-600 dark:bg-cyan-400' : 'bg-slate-300'}`} />
              <span>Tanpa QR Code</span>
            </button>
          </div>

          {/* Pengaturan Detail QR Code (Bila Aktif) */}
          {options.qrEnabled && (
            <div className="space-y-3 pt-2 border-t border-cyan-100 dark:border-cyan-900/60">
              {/* 1. Teks Kustom / Tautan URL */}
              <div>
                <label className="font-semibold text-slate-800 dark:text-slate-200 block mb-1 text-[11px] flex items-center gap-1">
                  <LinkIcon className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                  <span>Isi Teks / Tautan QR Code:</span>
                </label>
                <input
                  type="text"
                  value={options.qrText || ''}
                  onChange={(e) => updateOption('qrText', e.target.value)}
                  placeholder="Contoh: https://nota.id/cek/A1708 atau NO-FAKTUR-99"
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-cyan-200 dark:border-cyan-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                />

                {/* Quick Presets for QR Text */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {[
                    { label: '📱 Auto: Buka di HP (iOS/Android)', val: '' },
                    { label: 'Link Verifikasi', val: 'https://nota.id/verifikasi' },
                    { label: 'Slip Lunas', val: 'SLIP-LUNAS-VERIFIED' },
                    { label: 'Pembayaran QRIS', val: 'QRIS-PAYMENT-OK' },
                    { label: 'Kontak CS', val: 'https://wa.me/628123456789' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => updateOption('qrText', p.val)}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer font-mono font-medium ${
                        (!options.qrText && p.val === '') || options.qrText === p.val
                          ? 'bg-cyan-600 text-white border-cyan-600 font-bold'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-cyan-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Info Otomatis Buka di HP */}
                <div className="mt-2 p-2 bg-cyan-100/70 dark:bg-cyan-900/40 rounded-lg text-[10px] text-cyan-950 dark:text-cyan-200">
                  <span className="font-bold">📱 Responsif Layar HP: </span>
                  <span>
                    Jika dikosongkan/Auto, saat QR discan kamera smartphone (iOS / Android), otomatis membuka nota digital seukuran layar HP lengkap dengan tombol Unduh PDF & Cetak.
                  </span>
                </div>
              </div>

              {/* 2. Pilihan Posisi QR Code */}
              <div>
                <label className="font-semibold text-slate-800 dark:text-slate-200 block mb-1 text-[11px]">
                  Posisi QR Code di Nota:
                </label>
                <div className="grid grid-cols-5 gap-1">
                  {[
                    { id: 'bottom-right', label: '↘ Kanan Bwh', desc: 'Rekomendasi' },
                    { id: 'bottom-left', label: '↙ Kiri Bwh', desc: 'Bawah Kiri' },
                    { id: 'top-right', label: '↗ Kanan Atas', desc: 'Pojok Atas' },
                    { id: 'top-left', label: '↖ Kiri Atas', desc: 'Kiri Atas' },
                    { id: 'center', label: '🎯 Tengah', desc: 'Pusat' },
                  ].map((pos) => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => updateOption('qrPosition', pos.id as QrPositionPreset)}
                      className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                        (options.qrPosition || 'bottom-right') === pos.id
                          ? 'bg-cyan-600 text-white border-cyan-600 shadow-2xs font-bold ring-1 ring-cyan-500'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-cyan-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div className="text-[10px] leading-tight">{pos.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Ukuran QR Code */}
              <div className="p-2.5 bg-white dark:bg-slate-800/90 rounded-lg border border-cyan-200 dark:border-cyan-900/70">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-900 dark:text-slate-100 text-[11px] flex items-center gap-1">
                    <Maximize2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>Ukuran QR Code:</span>
                  </label>
                  <span className="font-mono font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-800 text-[10px]">
                    {options.qrSizeMm || 14} mm
                  </span>
                </div>

                <p className="text-[10px] text-cyan-900 dark:text-cyan-300 mb-2 leading-tight">
                  Ukuran 12–16 mm adalah standar optimal untuk mudah dipindai kamera smartphone tanpa memakan ruang teks nota.
                </p>

                <div className="grid grid-cols-4 gap-1 mb-2">
                  {[
                    { label: '10 mm (Kecil)', val: 10 },
                    { label: '14 mm (Pas)', val: 14 },
                    { label: '18 mm (Jelas)', val: 18 },
                    { label: '22 mm (Besar)', val: 22 },
                  ].map((s) => (
                    <button
                      key={s.val}
                      type="button"
                      onClick={() => updateOption('qrSizeMm', s.val)}
                      className={`py-1 text-[10px] font-semibold rounded border cursor-pointer ${
                        (options.qrSizeMm || 14) === s.val
                          ? 'bg-cyan-600 text-white border-cyan-600 shadow-2xs'
                          : 'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <input
                  type="range"
                  min={8}
                  max={25}
                  step={1}
                  value={options.qrSizeMm || 14}
                  onChange={(e) => updateOption('qrSizeMm', parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-600 dark:accent-cyan-500 cursor-pointer h-1.5 bg-cyan-200 dark:bg-cyan-900 rounded-lg"
                />
                <div className="flex justify-between text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">
                  <span>8 mm</span>
                  <span className="text-cyan-600 dark:text-cyan-400 font-bold">14 mm (Optimal)</span>
                  <span>25 mm</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tampilan Garis Potong (Default Polos Bersih) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Garis Pemisah / Potong:</span>
            </label>
            {options.dashedLineStyle === 'none' && (
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                Polos Bersih
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'none', label: 'Polos Bersih', desc: 'Tanpa garis sama sekali' },
              { id: 'fine', label: 'Garis Halus', desc: 'Putus-putus tipis' },
              { id: 'corners-only', label: 'Tanda Sudut', desc: 'Hanya tanda silang' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => updateOption('dashedLineStyle', st.id as any)}
                className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                  options.dashedLineStyle === st.id
                    ? 'border-blue-600 dark:border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold ring-1 ring-blue-500 shadow-2xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                <div className="text-xs flex items-center justify-center gap-1">
                  <span>{st.label}</span>
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{st.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Orientasi / Rotasi Nota */}
        <div>
          <label className="font-semibold text-slate-800 dark:text-slate-200 block mb-1.5 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Orientasi / Putar Nota:</span>
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { deg: 0, label: '0° Normal', sub: 'Tegak' },
              { deg: 90, label: '90° Kanan', sub: 'Putar 90°' },
              { deg: 180, label: '180°', sub: 'Terbalik' },
              { deg: 270, label: '270° Kiri', sub: 'Putar 270°' },
            ].map((r) => (
              <button
                key={r.deg}
                type="button"
                onClick={() => onRotateAll(r.deg)}
                className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                  options.globalRotation === r.deg
                    ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold ring-1 ring-blue-500 shadow-2xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                <div className="text-xs">{r.label}</div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{r.sub}</div>
              </button>
            ))}
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
