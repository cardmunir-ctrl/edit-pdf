import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Database,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  Layers,
  Table,
  Eye,
  Sliders,
  ShieldCheck,
  ChevronDown,
  Info,
} from 'lucide-react';
import {
  ProductionSlipData,
  convertSlipToReceiptItem,
  formatRupiah,
  renderSlipToDataUrl,
} from '../lib/slipGenerator';
import { ReceiptItem } from '../lib/pdfEngine';

interface NeonBukuProduksiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportReceipts: (newItems: ReceiptItem[]) => void;
}

const STORAGE_NEON_KEY = 'neon_buku_produksi_conn_str';

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
  const [recordError, setRecordError] = useState<string | null>(null);

  // Column Mappings for Slip Gaji
  const [colName, setColName] = useState<string>('');
  const [colDept, setColDept] = useState<string>('');
  const [colPeriod, setColPeriod] = useState<string>('');
  const [colTotal, setColTotal] = useState<string>('');
  const [colPieceRate, setColPieceRate] = useState<string>('');
  const [colOvertime, setColOvertime] = useState<string>('');
  const [colDeductions, setColDeductions] = useState<string>('');
  const [colSlipNo, setColSlipNo] = useState<string>('');

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

      // Auto-detect mappings
      const colNames = colList.map((c) => c.name.toLowerCase());
      const findCol = (keys: string[]) => {
        const found = colList.find((c) =>
          keys.some((k) => c.name.toLowerCase().includes(k))
        );
        return found ? found.name : '';
      };

      setColName(findCol(['nama', 'karyawan', 'pekerja', 'employee', 'operator', 'penjahit']));
      setColDept(findCol(['bagian', 'divisi', 'jabatan', 'departemen', 'dept', 'role']));
      setColPeriod(findCol(['periode', 'period', 'bulan', 'minggu', 'tanggal', 'date']));
      setColTotal(findCol(['total', 'gaji_bersih', 'diterima', 'sisa', 'net', 'amount']));
      setColPieceRate(findCol(['borongan', 'jahit', 'upah', 'pokok', 'basic']));
      setColOvertime(findCol(['lembur', 'overtime', 'ot']));
      setColDeductions(findCol(['potongan', 'kasbon', 'pinjaman', 'deduction']));
      setColSlipNo(findCol(['no_slip', 'nomor', 'kode', 'slip_no', 'invoice', 'id']));

      // 2. Fetch rows
      const recRes = await fetch('/api/neon/fetch-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString: connStr, tableName, limit: 100 }),
      });
      const recData = await recRes.json();
      if (recRes.ok && recData.success) {
        const rows = recData.rows || [];
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

  // Instant Sample Demo Data from Buku Produksi
  const handleLoadDemoData = async () => {
    setIsLoadingRecords(true);
    setRecordError(null);
    try {
      const res = await fetch('/api/neon/sample-buku-produksi');
      const data = await res.json();
      if (data.success && data.slips) {
        setConnectionStatus({
          connected: true,
          dbName: 'neondb_buku_produksi',
          user: 'neondb_owner',
          message: 'Mode Demo Laporan Gaji Buku Produksi Aktif',
        });
        setSelectedTable('laporan_gaji_mingguan');
        setTables(['laporan_gaji_mingguan', 'data_karyawan', 'hasil_potong_kain', 'produksi_jahit']);
        setCandidateTables(['laporan_gaji_mingguan']);

        // Set fake columns
        setColumns([
          { name: 'employeeName', type: 'text' },
          { name: 'department', type: 'text' },
          { name: 'period', type: 'text' },
          { name: 'totalSalary', type: 'integer' },
          { name: 'pieceRateSalary', type: 'integer' },
          { name: 'overtimeSalary', type: 'integer' },
          { name: 'deductions', type: 'integer' },
          { name: 'slipNumber', type: 'text' },
        ]);

        setColName('employeeName');
        setColDept('department');
        setColPeriod('period');
        setColTotal('totalSalary');
        setColPieceRate('pieceRateSalary');
        setColOvertime('overtimeSalary');
        setColDeductions('deductions');
        setColSlipNo('slipNumber');

        setRecords(data.slips);
        const sel = new Set<number>();
        data.slips.forEach((_: any, i: number) => sel.add(i));
        setSelectedIndices(sel);
        setPreviewSlipIndex(0);
      }
    } catch (err: any) {
      setRecordError('Gagal memuat data demo: ' + err.message);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  // Parse row to ProductionSlipData
  const parsedSlips = useMemo<ProductionSlipData[]>(() => {
    if (!records || records.length === 0) return [];

    return records.map((row, idx) => {
      const empName =
        row[colName] || row.employeeName || row.nama || row.nama_karyawan || `Karyawan #${idx + 1}`;
      const dept = row[colDept] || row.department || row.bagian || 'Produksi';
      const period =
        row[colPeriod] || row.period || row.periode || new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      const slipNo =
        row[colSlipNo] || row.slipNumber || row.no_slip || `SLIP-${String(idx + 1).padStart(3, '0')}`;

      // Numbers parsing
      const parseNum = (val: any) => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        const n = Number(String(val).replace(/[^0-9.-]+/g, ''));
        return isNaN(n) ? 0 : n;
      };

      const pieceRate = parseNum(row[colPieceRate] || row.pieceRateSalary || row.upah_borongan);
      const overtime = parseNum(row[colOvertime] || row.overtimeSalary || row.lembur);
      const deductions = parseNum(row[colDeductions] || row.deductions || row.potongan);
      let total = parseNum(row[colTotal] || row.totalSalary || row.total);

      if (total <= 0 && pieceRate > 0) {
        total = pieceRate + overtime - deductions;
      }
      if (total <= 0) {
        total = 1500000; // fallback standard wage
      }

      return {
        id: `neon-slip-${idx}-${slipNo}`,
        slipNumber: String(slipNo),
        employeeName: String(empName),
        department: String(dept),
        period: String(period),
        date: new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        workDays: row.workDays || row.hari_kerja || 6,
        pieceRateSalary: pieceRate > 0 ? pieceRate : total - overtime + deductions,
        overtimeSalary: overtime,
        deductions: deductions,
        totalSalary: total,
        companyName: companyName,
      };
    });
  }, [
    records,
    colName,
    colDept,
    colPeriod,
    colTotal,
    colPieceRate,
    colOvertime,
    colDeductions,
    colSlipNo,
    companyName,
  ]);

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
  const handleImport = () => {
    const slipsToImport = parsedSlips.filter((_, idx) => selectedIndices.has(idx));
    if (slipsToImport.length === 0) return;

    const receiptItems: ReceiptItem[] = slipsToImport.map((slip, index) =>
      convertSlipToReceiptItem(slip, index)
    );

    onImportReceipts(receiptItems);
    onClose();
  };

  return (
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-cyan-400" />
                <span>Neon Connection String (PostgreSQL URL):</span>
              </label>

              {/* Instant Try Demo Button */}
              <button
                type="button"
                onClick={handleLoadDemoData}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>⚡ Coba Contoh Data Buku Produksi</span>
              </button>
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
                              <span>{slip.employeeName}</span>
                              <span className="text-[10px] font-mono text-slate-400 font-normal">
                                ({slip.department})
                              </span>
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {slip.slipNumber} • {slip.period}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-emerald-400 text-xs">
                            {formatRupiah(slip.totalSalary)}
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
                    Karyawan: <b>{parsedSlips[previewSlipIndex]?.employeeName}</b>
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center">
                  {parsedSlips[previewSlipIndex] ? (
                    <div className="w-full bg-white rounded-xl shadow-xl overflow-hidden p-0.5">
                      <img
                        src={renderSlipToDataUrl(parsedSlips[previewSlipIndex])}
                        alt="Slip Gaji Preview"
                        className="w-full h-auto object-contain block"
                      />
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
              disabled={selectedIndices.size === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-600/20 disabled:opacity-40 cursor-pointer transition-all active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Impor {selectedIndices.size} Slip ke Susunan Cetak A4</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
