import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  X,
  Database,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  CheckSquare,
  Square,
  FileSpreadsheet,
  Eye,
  Sliders,
  ShieldCheck,
  ChevronDown,
  Info,
} from 'lucide-react';
import { ReceiptItem } from '../lib/pdfEngine';
import { SlipGajiBukuProduksiTemplate, SlipGajiItem } from './SlipGajiBukuProduksiTemplate';

interface SlipGajiPngResult {
  dataUrl: string;
  width: number;
  height: number;
}

interface NeonBukuProduksiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportReceipts: (newItems: ReceiptItem[]) => void;
}

const STORAGE_NEON_KEY = 'neon_buku_produksi_conn_str';

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
  if (!isOpen) return null;

  // Connection State
  const [connectionString, setConnectionString] = useState<string>(() => {
    return localStorage.getItem(STORAGE_NEON_KEY) || '';
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    dbName?: string;
    user?: string;
    message?: string;
    error?: string;
  } | null>(null);

  // Tables State
  const [tables, setTables] = useState<string[]>([]);
  const [candidateTables, setCandidateTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [isLoadingTables, setIsLoadingTables] = useState(false);

  // Schema & Records State
  const [columns, setColumns] = useState<{ name: string; type: string }[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);

  // Selected Slips to Import
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [previewSlipIndex, setPreviewSlipIndex] = useState<number>(0);
  const [companyName, setCompanyName] = useState<string>('BUKU PRODUKSI KONVEKSI');

  // Test Neon Connection
  const handleTestConnection = async (connStr?: string) => {
    const targetStr = connStr !== undefined ? connStr : connectionString;
    setIsConnecting(true);
    setConnectionStatus(null);
    try {
      const res = await fetch('/api/neon/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString: targetStr }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setConnectionStatus({
          connected: true,
          dbName: data.database,
          user: data.user,
          message: data.message,
        });
        if (targetStr) {
          localStorage.setItem(STORAGE_NEON_KEY, targetStr);
        }
        // Auto fetch tables
        loadTables(targetStr);
      } else {
        setConnectionStatus({
          connected: false,
          error: data.error || 'Gagal terhubung ke database Neon',
        });
      }
    } catch (e: any) {
      setConnectionStatus({
        connected: false,
        error: e.message || 'Koneksi gagal',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Load Tables
  const loadTables = async (connStr: string) => {
    setIsLoadingTables(true);
    try {
      const res = await fetch('/api/neon/get-tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString: connStr }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTables(data.tables || []);
        setCandidateTables(data.payrollCandidates || []);
        // Auto select best table
        const best =
          data.payrollCandidates?.[0] ||
          data.tables.find((t: string) => t.toLowerCase().includes('gaji')) ||
          data.tables.find((t: string) => t.toLowerCase().includes('slip')) ||
          data.tables[0] ||
          '';
        if (best) {
          setSelectedTable(best);
          loadTableData(best, connStr);
        }
      }
    } catch (err) {
      console.error('Gagal mengambil daftar tabel:', err);
    } finally {
      setIsLoadingTables(false);
    }
  };

  // Load Table Data and Columns
  const loadTableData = async (tableName: string, connStr: string) => {
    if (!tableName) return;
    setIsLoadingRecords(true);
    setRecordError(null);
    try {
      // 1. Fetch schema
      const schemaRes = await fetch('/api/neon/get-table-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString: connStr, tableName }),
      });
      const schemaData = await schemaRes.json();
      const colList: { name: string; type: string }[] = schemaData.columns || [];
      setColumns(colList);

      if (!colList.some((c) => c.name.toLowerCase() === 'status')) {
        setRecords([]);
        setSelectedIndices(new Set());
        setRecordError('Tabel "' + tableName + '" tidak punya kolom status. Gunakan tabel buku_gaji.');
        return;
      }

      // 2. Fetch rows
      const recRes = await fetch('/api/neon/fetch-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString: connStr, tableName, limit: 100 }),
      });
      const recData = await recRes.json();
      if (recRes.ok && recData.success) {
        // Hanya slip yang sudah Lunas
        const rows = (recData.rows || []).filter(
          (row: any) => String(row.status ?? '').trim().toLowerCase() === 'lunas'
        );
        setRecords(rows);
        // Default select all up to 8
        const initialSel = new Set<number>();
        rows.forEach((_: any, idx: number) => {
          if (idx < 8) initialSel.add(idx);
        });
        setSelectedIndices(initialSel);
        setPreviewSlipIndex(0);
      } else {
        setRecordError(recData.error || 'Gagal memuat baris data');
      }
    } catch (e: any) {
      setRecordError(e.message || 'Error saat mengambil data');
    } finally {
      setIsLoadingRecords(false);
    }
  };

  // Map row buku_gaji -> SlipGajiItem (tanpa data tebakan)
  const parsedSlips = useMemo<SlipGajiItem[]>(() => {
    const toNumber = (val: any) => {
      if (val === null || val === undefined || val === '') return 0;
      const n = Number(val);
      return isNaN(n) ? 0 : n;
    };

    const parseItemsDetail = (val: any): SlipGajiItem['items_detail'] => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string' && val.trim()) {
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
    };

    return records.map((row: any) => ({
      id: String(row.id ?? ''),
      worker_name: String(row.worker_name ?? ''),
      tanggal: String(row.tanggal ?? ''),
      items_detail: parseItemsDetail(row.items_detail),
      sisa_gaji: toNumber(row.sisa_gaji),
      potongan: toNumber(row.potongan),
      total: toNumber(row.total),
    }));
  }, [records]);

  // Toggle selection
  const toggleSelect = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectAll = () => {
    const all = new Set<number>();
    parsedSlips.forEach((_, i) => all.add(i));
    setSelectedIndices(all);
  };

  const selectNone = () => {
    setSelectedIndices(new Set());
  };

  // Import to Grid
  const handleImport = async () => {
    const slipsToImport = parsedSlips.filter((_, idx) => selectedIndices.has(idx));
    if (slipsToImport.length === 0) return;

    setIsImporting(true);
    setRecordError(null);
    try {
      const receiptItems: ReceiptItem[] = [];
      for (let index = 0; index < slipsToImport.length; index++) {
        const slip = slipsToImport[index];
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
      setRecordError('Gagal membuat slip PNG: ' + (err?.message || String(err)));
    } finally {
      setIsImporting(false);
    }
  };

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

  return (
    <React.Fragment>
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 w-full max-w-5xl max-h-[94vh] rounded-3xl shadow-2xl flex flex-col border border-slate-800 overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shadow-xs">
              <Database className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Ambil Data Laporan Gaji (Neon Database Buku Produksi)</span>
                <span className="text-[10px] bg-cyan-950 text-cyan-300 font-mono px-2 py-0.5 rounded-full font-bold border border-cyan-800/80">
                  Neon PostgreSQL
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Tarik data rekap gaji karyawan langsung dari database Neon aplikasi Buku Produksi Anda
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

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          {/* Section 1: Connection String & Quick Demo */}
          <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/80 space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-cyan-400" />
                <span>Neon Connection String (PostgreSQL URL):</span>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                value={connectionString}
                onChange={(e) => setConnectionString(e.target.value)}
                placeholder="postgresql://neondb_owner:password@ep-cool-cloud-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
                className="flex-1 px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-700 bg-slate-900 text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
              />
              <button
                type="button"
                onClick={() => handleTestConnection()}
                disabled={isConnecting}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shrink-0 disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghubungkan...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5" />
                    <span>Hubungkan Database</span>
                  </>
                )}
              </button>
            </div>

            {/* Connection Status Feedback */}
            {connectionStatus && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                  connectionStatus.connected
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-950/40 text-rose-300 border-rose-500/30'
                }`}
              >
                {connectionStatus.connected ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-semibold">
                      Terhubung ke database: <b>{connectionStatus.dbName}</b> (User: {connectionStatus.user})
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{connectionStatus.error}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Table Picker & Data Controls */}
          {tables.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-800/40 rounded-2xl border border-slate-800 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Pilih Tabel Laporan Gaji:
                </label>
                <div className="relative">
                  <select
                    value={selectedTable}
                    onChange={(e) => {
                      setSelectedTable(e.target.value);
                      loadTableData(e.target.value, connectionString);
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-700 bg-slate-900 text-slate-100 appearance-none focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                  >
                    {tables.map((tbl) => (
                      <option key={tbl} value={tbl}>
                        {candidateTables.includes(tbl) ? `⭐ ${tbl} (Rekomendasi)` : tbl}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nama Usaha / Konveksi:
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Contoh: CV. BUKU PRODUKSI GARMENT"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900 text-slate-100"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer"
                >
                  Pilih Semua ({parsedSlips.length})
                </button>
                <button
                  type="button"
                  onClick={selectNone}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 text-xs font-semibold border border-slate-700 cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {/* Section 3: Slips List & Live Slip Preview */}
          {parsedSlips.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: List of Employee Slips (6 cols) */}
              <div className="lg:col-span-6 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                    <span>Daftar Slip Karyawan ({selectedIndices.size} Terpilih):</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    8 slip pas 1 lembar A4
                  </span>
                </div>

                <div className="border border-slate-800 rounded-2xl max-h-72 overflow-y-auto divide-y divide-slate-800/80 bg-slate-950/60">
                  {parsedSlips.map((slip, idx) => {
                    const isSelected = selectedIndices.has(idx);
                    const isPreviewed = previewSlipIndex === idx;

                    return (
                      <div
                        key={slip.id}
                        onClick={() => setPreviewSlipIndex(idx)}
                        className={`p-3 flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors ${
                          isPreviewed
                            ? 'bg-cyan-950/40 border-l-4 border-cyan-500'
                            : 'hover:bg-slate-850/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelect(idx);
                            }}
                            className="text-cyan-400 hover:text-cyan-300 p-0.5 cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-600" />
                            )}
                          </button>

                          <div className="min-w-0">
                            <p className="font-bold text-slate-100 truncate flex items-center gap-1.5">
                              <span>{slip.worker_name}</span>
                              <span className="text-[10px] font-mono text-slate-400 font-normal">
                                ({slip.items_detail.length} rincian)
                              </span>
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {slip.id.substring(0, 8).toUpperCase()} • {slip.tanggal}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-emerald-400 text-xs">
                            Rp {slip.total.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Mini Slip Preview (6 cols) */}
              <div className="lg:col-span-6 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-cyan-400" />
                    <span>Pratinjau Desain Slip Nota Borongan:</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Karyawan: <b>{parsedSlips[previewSlipIndex]?.worker_name}</b>
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center">
                  {parsedSlips[previewSlipIndex] ? (
                    <div className="w-full bg-white rounded-xl shadow-xl overflow-hidden p-0.5">
                      <SlipGajiPreview item={parsedSlips[previewSlipIndex]} />
                    </div>
                  ) : (
                    <div className="py-20 text-slate-500 text-xs text-center">
                      Pilih slip di sebelah kiri untuk melihat pratinjau
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Empty State / Loading */}
          {isLoadingRecords && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <RefreshCw className="w-7 h-7 animate-spin text-cyan-500" />
              <span className="text-xs font-semibold">Mengambil data dari Neon Database...</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Info className="w-4 h-4 text-cyan-400" />
            <span>
              Slip yang diimpor akan langsung otomatis berukuran 8 slot per lembar A4 siap cetak & ber-watermark.
            </span>
          </div>

          <div className="flex items-center gap-3">
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
              disabled={selectedIndices.size === 0 || isImporting}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-600/20 disabled:opacity-40 cursor-pointer transition-all active:scale-95"
            >
              {isImporting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              <span>
                {isImporting
                  ? 'Merender slip...'
                  : `Impor ${selectedIndices.size} Slip ke Susunan Cetak A4`}
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
