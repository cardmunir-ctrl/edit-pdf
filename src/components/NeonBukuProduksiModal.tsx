import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  X,
  AlertCircle,
  RefreshCw,
  CheckSquare,
  Square,
  FileSpreadsheet,
  Eye,
  Info,
  Search,
  Package,
  RotateCcw,
  SearchX,
} from 'lucide-react';
import { ReceiptItem } from '../lib/pdfEngine';
import {
  SlipGajiBukuProduksiTemplate,
  SlipGajiItem,
  SlipGajiItemDetail,
} from './SlipGajiBukuProduksiTemplate';

interface SlipGajiPngResult {
  dataUrl: string;
  width: number;
  height: number;
}

interface LaporanGajiResponse {
  success: boolean;
  error?: string;
  rows?: any[];
}

interface NeonBukuProduksiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportReceipts: (newItems: ReceiptItem[]) => void;
}

const LAPORAN_GAJI_LIMIT = 300;

const SLIP_COLOR_PROPERTIES = [
  'color',
  'background-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'text-decoration-color',
  'caret-color',
  'fill',
  'stroke',
];

const formatTanggalPendek = (value: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// Tanggal disimpan sebagai kunci YYYY-MM-DD waktu lokal agar perbandingan rentang
// konsisten dengan input type="date" dan dengan tanggal di database.
const toDateKey = (value: string): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

// Tailwind v4 memakai oklch(), sedangkan html2canvas hanya bisa membaca rgb/hsl/hex.
const normalizeModernColors = (clonedDoc: Document) => {
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return;

  const toRgb = (value: string) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1, 1);
    ctx.fillStyle = value;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return `rgb(${d[0]}, ${d[1]}, ${d[2]})`;
  };

  const visit = (el: HTMLElement) => {
    const style = clonedDoc.defaultView?.getComputedStyle(el);
    if (style) {
      for (const prop of SLIP_COLOR_PROPERTIES) {
        const value = style.getPropertyValue(prop);
        if (value && (value.includes('oklch') || value.includes('color('))) {
          el.style.setProperty(prop, toRgb(value));
        }
      }
    }
    for (const child of Array.from(el.children)) visit(child as HTMLElement);
  };

  visit(clonedDoc.documentElement);
  visit(clonedDoc.body);
};

export const NeonBukuProduksiModal: React.FC<NeonBukuProduksiModalProps> = ({
  isOpen,
  onClose,
  onImportReceipts,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);

  // Filter State
  const [searchWorker, setSearchWorker] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);

  const [isImporting, setIsImporting] = useState(false);

  const loadLaporanGaji = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/neon/laporan-gaji', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: LAPORAN_GAJI_LIMIT }),
      });
      const data: LaporanGajiResponse = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal memuat Laporan Gaji');
      }
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setSelectedIds(new Set());
      setPreviewId(null);
    } catch (err) {
      setRows([]);
      setLoadError(
        err instanceof Error ? err.message : 'Gagal memuat Laporan Gaji dari server'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) loadLaporanGaji();
  }, [isOpen, loadLaporanGaji]);

  // Map row buku_gaji -> SlipGajiItem (tanpa data tebakan)
  const parsedSlips = useMemo<SlipGajiItem[]>(() => {
    const toNumber = (val: any) => {
      if (val === null || val === undefined || val === '') return 0;
      const n = Number(val);
      return isNaN(n) ? 0 : n;
    };

    return rows.map((row: any) => ({
      id: String(row.id ?? ''),
      worker_id: row.worker_id ?? undefined,
      worker_name: String(row.worker_name ?? ''),
      tanggal: String(row.tanggal ?? ''),
      items_detail: (Array.isArray(row.items_detail) ? row.items_detail : []) as SlipGajiItemDetail[],
      gaji_pokok: toNumber(row.gaji_pokok),
      sisa_gaji: toNumber(row.sisa_gaji),
      potongan: toNumber(row.potongan),
      total: toNumber(row.total),
      status: row.status == null ? undefined : String(row.status),
      tipe: row.tipe ?? undefined,
      parent_session_id: row.parent_session_id ?? undefined,
      created_at: row.created_at ?? undefined,
    }));
  }, [rows]);

  // Filter client-side, mengikuti aturan Laporan Gaji di Buku Produksi
  const filteredSlips = useMemo(() => {
    const workerQuery = searchWorker.trim().toLowerCase();
    const productQuery = searchProduct.trim().toLowerCase();

    return parsedSlips.filter((slip) => {
      if (workerQuery && !slip.worker_name.toLowerCase().includes(workerQuery)) {
        return false;
      }

      if (productQuery) {
        const details = Array.isArray(slip.items_detail) ? slip.items_detail : [];
        const matched = details.some((detail) =>
          String(detail?.name ?? '')
            .toLowerCase()
            .includes(productQuery)
        );
        if (!matched) return false;
      }

      if (startDate || endDate) {
        const key = toDateKey(slip.tanggal);
        if (!key) return false;
        if (startDate && key < startDate) return false;
        if (endDate && key > endDate) return false;
      }

      return true;
    });
  }, [parsedSlips, searchWorker, searchProduct, startDate, endDate]);

  const selectedSlips = useMemo(
    () => filteredSlips.filter((slip) => selectedIds.has(slip.id)),
    [filteredSlips, selectedIds]
  );

  const previewSlip = useMemo(() => {
    if (previewId) {
      const found = filteredSlips.find((slip) => slip.id === previewId);
      if (found && selectedIds.has(found.id)) return found;
    }
    return selectedSlips[0] ?? null;
  }, [previewId, filteredSlips, selectedSlips, selectedIds]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRowActivate = (slip: SlipGajiItem) => {
    setPreviewId(slip.id);
    toggleSelect(slip.id);
  };

  const selectAllFiltered = () => {
    setSelectedIds(new Set(filteredSlips.map((slip) => slip.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const resetFilters = () => {
    setSearchWorker('');
    setSearchProduct('');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilter =
    searchWorker.trim() !== '' ||
    searchProduct.trim() !== '' ||
    startDate !== '' ||
    endDate !== '';

  // Off-screen PNG renderer for the Buku Produksi slip template
  const [offscreenSlip, setOffscreenSlip] = useState<SlipGajiItem | null>(null);
  const offscreenHostRef = useRef<HTMLDivElement | null>(null);
  const pendingCaptureRef = useRef<{
    resolve: (result: SlipGajiPngResult) => void;
    reject: (error: Error) => void;
  } | null>(null);

  useEffect(() => {
    if (!offscreenSlip) return;
    let cancelled = false;
    const pending = pendingCaptureRef.current;
    pendingCaptureRef.current = null;

    const capture = async () => {
      const host = offscreenHostRef.current;
      if (!host) {
        pending?.reject(new Error('Host render slip tidak tersedia'));
        return;
      }
      try {
        if (document.fonts?.ready) await document.fonts.ready;
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        if (cancelled || !offscreenHostRef.current) return;

        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(offscreenHostRef.current, {
          scale: 2.5,
          useCORS: true,
          logging: false,
          imageTimeout: 0,
          backgroundColor: '#ffffff',
          onclone: normalizeModernColors,
        });
        if (cancelled) return;

        pending?.resolve({
          dataUrl: canvas.toDataURL('image/png'),
          width: canvas.width,
          height: canvas.height,
        });
      } catch (err) {
        pending?.reject(err instanceof Error ? err : new Error(String(err)));
      }
    };

    capture();
  }, [offscreenSlip]);

  const renderSlipGajiToPng = useCallback((item: SlipGajiItem): Promise<SlipGajiPngResult> => {
    return new Promise<SlipGajiPngResult>((resolve, reject) => {
      pendingCaptureRef.current = { resolve, reject };
      setOffscreenSlip(item);
    });
  }, []);

  // Import to Grid
  const handleImport = async () => {
    if (selectedSlips.length === 0) return;

    setIsImporting(true);
    setImportError(null);
    try {
      const receiptItems: ReceiptItem[] = [];
      for (let index = 0; index < selectedSlips.length; index++) {
        const slip = selectedSlips[index];
        const { dataUrl, width, height } = await renderSlipGajiToPng(slip);
        receiptItems.push({
          id: `bp-buku-gaji-${slip.id}`,
          sourceFileName: `Slip_Gaji_${slip.id}`,
          pageIndex: index + 1,
          dataUrl,
          originalDataUrl: dataUrl,
          width,
          height,
          aspectRatio: width / height,
          originalWidth: width,
          originalHeight: height,
          rotation: 0,
          isAutoTrimmed: true,
        });
      }

      onImportReceipts(receiptItems);
      onClose();
    } catch (err: any) {
      setImportError('Gagal membuat slip PNG: ' + (err?.message || String(err)));
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  const hasData = parsedSlips.length > 0;

  return (
    <React.Fragment>
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 w-full max-w-5xl max-h-[94vh] rounded-3xl shadow-2xl flex flex-col border border-slate-800 overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 bg-slate-900/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-2xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white leading-tight">
                Laporan Gaji — Buku Produksi
              </h2>
              <p className="text-xs text-slate-400">Slip gaji yang sudah Lunas</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasData && (
              <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/80 whitespace-nowrap">
                {parsedSlips.length} slip tersedia
              </span>
            )}
            <button
              onClick={onClose}
              aria-label="Tutup modal"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-5">
          {/* Filters */}
          {hasData && (
            <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-800 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div className="relative">
                  <label
                    htmlFor="bp-search-worker"
                    className="sr-only"
                  >
                    Cari karyawan
                  </label>
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="bp-search-worker"
                    type="search"
                    value={searchWorker}
                    onChange={(e) => setSearchWorker(e.target.value)}
                    placeholder="Cari karyawan..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:col-span-2 lg:col-span-1">
                  <div>
                    <label
                      htmlFor="bp-start-date"
                      className="block text-[10px] font-semibold text-slate-400 mb-1"
                    >
                      Dari tanggal
                    </label>
                    <input
                      id="bp-start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="bp-end-date"
                      className="block text-[10px] font-semibold text-slate-400 mb-1"
                    >
                      Sampai tanggal
                    </label>
                    <input
                      id="bp-end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-2.5 py-2 text-xs w-full rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <div className="relative">
                  <label htmlFor="bp-search-product" className="sr-only">
                    Cari barang atau rincian kerja
                  </label>
                  <Package className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="bp-search-product"
                    type="search"
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                    placeholder="Cari barang/rincian..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={resetFilters}
                  disabled={!hasActiveFilter}
                  className="px-3 py-2 h-[34px] rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold border border-slate-700 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-default inline-flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                <span className="text-[11px] text-slate-400 font-mono">
                  {filteredSlips.length} dari {parsedSlips.length} slip
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllFiltered}
                    disabled={filteredSlips.length === 0}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-[11px] font-semibold border border-slate-700 cursor-pointer disabled:opacity-40 disabled:cursor-default"
                  >
                    Pilih Semua ({filteredSlips.length})
                  </button>
                  <button
                    type="button"
                    onClick={clearSelection}
                    disabled={selectedIds.size === 0}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-400 text-[11px] font-semibold border border-slate-700 cursor-pointer disabled:opacity-40 disabled:cursor-default"
                  >
                    Batal Pilih
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
              <RefreshCw className="w-7 h-7 animate-spin text-cyan-500" />
              <span className="text-xs font-semibold">Memuat Laporan Gaji Buku Produksi...</span>
            </div>
          )}

          {/* Error */}
          {!isLoading && loadError && (
            <div className="p-5 bg-rose-950/30 border border-rose-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div className="flex items-start gap-2.5 min-w-0">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-rose-200">Laporan Gaji tidak dapat dimuat</p>
                  <p className="text-xs text-rose-300/80 mt-0.5 break-words">{loadError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={loadLaporanGaji}
                className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Muat Ulang</span>
              </button>
            </div>
          )}

          {/* Empty */}
          {!isLoading && !loadError && !hasData && (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2 text-center px-6">
              <SearchX className="w-8 h-8 text-slate-600" />
              <p className="text-sm font-bold text-slate-300">Belum ada slip gaji Lunas</p>
              <p className="text-xs text-slate-500 max-w-xs">
                Slip yang sudah dibayar di Buku Produksi akan muncul di sini secara otomatis.
              </p>
            </div>
          )}

          {/* No result after filter */}
          {!isLoading && !loadError && hasData && filteredSlips.length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2 text-center px-6">
              <SearchX className="w-7 h-7 text-slate-600" />
              <p className="text-xs font-semibold text-slate-300">Tidak ada slip yang cocok dengan filter</p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 cursor-pointer"
              >
                Reset filter
              </button>
            </div>
          )}

          {/* Slips List & Live Slip Preview */}
          {!isLoading && filteredSlips.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: List of Employee Slips */}
              <div className="lg:col-span-6 space-y-2 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                    <span>Daftar Slip ({selectedSlips.length} dipilih)</span>
                  </span>
                </div>

                <div className="border border-slate-800 rounded-2xl max-h-72 sm:max-h-80 overflow-y-auto divide-y divide-slate-800/80 bg-slate-950/60">
                  {filteredSlips.map((slip) => {
                    const isSelected = selectedIds.has(slip.id);
                    const isPreviewed = previewSlip?.id === slip.id;

                    return (
                      <div
                        key={slip.id}
                        role="checkbox"
                        aria-checked={isSelected}
                        tabIndex={0}
                        onClick={() => handleRowActivate(slip)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleRowActivate(slip);
                          }
                        }}
                        className={`p-3 flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors ${
                          isPreviewed
                            ? 'bg-cyan-950/40 border-l-4 border-cyan-500'
                            : 'hover:bg-slate-850/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            role="presentation"
                            className={`shrink-0 ${
                              isSelected
                                ? 'text-cyan-400'
                                : 'text-slate-600'
                            }`}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </span>

                          <div className="min-w-0">
                            <p className="font-bold text-slate-100 truncate flex items-center gap-1.5">
                              <span className="truncate">{slip.worker_name || 'Tanpa nama'}</span>
                              <span className="text-[10px] font-mono text-slate-400 font-normal shrink-0">
                                ({slip.items_detail.length} rincian)
                              </span>
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono truncate">
                              {slip.id.substring(0, 8).toUpperCase()} •{' '}
                              {formatTanggalPendek(slip.tanggal)}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-emerald-400 text-xs">
                            Rp {slip.total.toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Mini Slip Preview */}
              <div className="lg:col-span-6 space-y-2 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-cyan-400" />
                    <span>Pratinjau Slip</span>
                  </span>
                  {previewSlip && (
                    <span className="text-[10px] text-slate-400 truncate">
                      {previewSlip.worker_name || 'Tanpa nama'}
                    </span>
                  )}
                </div>

                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center">
                  {previewSlip ? (
                    <div className="w-full bg-white rounded-xl shadow-xl overflow-hidden p-0.5">
                      <SlipGajiPreview item={previewSlip} />
                    </div>
                  ) : (
                    <div className="py-16 text-slate-500 text-xs text-center px-4">
                      Pilih slip untuk melihat preview
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {importError && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="break-words">{importError}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-4 border-t border-slate-800 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-900/60">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              Slip yang diimpor langsung berukuran 8 slot per lembar A4 siap cetak.
            </span>
          </div>

          <div className="w-full sm:w-auto flex items-center gap-3 sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleImport}
              disabled={selectedSlips.length === 0 || isImporting}
              className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-600/20 disabled:opacity-40 cursor-pointer transition-all active:scale-95"
            >
              {isImporting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              <span>
                {isImporting
                  ? 'Merender slip...'
                  : `Impor ${selectedSlips.length} Slip ke Susunan Cetak A4`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>

      {/* Off-screen slip host for html2canvas capture */}
      <div className="fixed -left-[9999px] top-0 overflow-hidden" style={{ width: '600px' }} aria-hidden="true">
        <div ref={offscreenHostRef}>
          {offscreenSlip && <SlipGajiBukuProduksiTemplate item={offscreenSlip} />}
        </div>
      </div>
    </React.Fragment>
  );
};

const SlipGajiPreview: React.FC<{ item: SlipGajiItem }> = ({ item }) => {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [slipHeight, setSlipHeight] = useState(0);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const update = () => {
      setScale(outer.clientWidth ? Math.min(1, outer.clientWidth / 600) : 1);
      setSlipHeight(inner.offsetHeight);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [item]);

  return (
    <div
      ref={outerRef}
      className="w-full overflow-hidden"
      style={{ height: slipHeight ? slipHeight * scale : undefined }}
    >
      <div
        ref={innerRef}
        style={{ width: 600, transform: `scale(${scale})`, transformOrigin: 'top left' }}
      >
        <SlipGajiBukuProduksiTemplate item={item} />
      </div>
    </div>
  );
};
