import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Body parser with 50mb limit for receipt image dataUrls
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to create a Neon connection pool
function getNeonPool(connectionString?: string) {
  const connStr =
    connectionString?.trim() ||
    process.env.NEON_DATABASE_URL ||
    process.env.DATABASE_URL ||
    '';

  if (!connStr) {
    throw new Error('Connection string Neon Database belum diisi');
  }

  return new Pool({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 15000,
    max: 5,
  });
}

function toNumberOrZero(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// Tanggal hanya diterima dalam format ISO date agar aman dipakai sebagai query parameter.
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDate(value: unknown): { ok: true; value: string } | { ok: false } {
  if (value === null || value === undefined || value === '') return { ok: true, value: '' };
  if (typeof value !== 'string') return { ok: false };
  const trimmed = value.trim();
  if (!ISO_DATE_PATTERN.test(trimmed)) return { ok: false };
  return { ok: true, value: trimmed };
}

// In-memory receipt store
export interface StoredReceipt {
  id: string;
  sourceFileName: string;
  dataUrl: string;
  width: number;
  height: number;
  rotation: number;
  watermarkText?: string;
  watermarkColor?: string;
  watermarkPosYPct?: number;
  date: string;
  scaleMultiplier?: number;
  transactionId?: string;
  qrText?: string;
  createdAt: number;
}

const receiptsStore = new Map<string, StoredReceipt>();

// API Routes
app.post('/api/receipts', (req, res) => {
  const {
    id,
    sourceFileName,
    dataUrl,
    width,
    height,
    rotation,
    watermarkText,
    watermarkColor,
    watermarkPosYPct,
    date,
    scaleMultiplier,
    transactionId,
    qrText,
  } = req.body;

  if (!id || !dataUrl) {
    return res.status(400).json({ error: 'Missing id or dataUrl' });
  }

  receiptsStore.set(id, {
    id,
    sourceFileName: sourceFileName || 'Nota Digital',
    dataUrl,
    width: Number(width) || 800,
    height: Number(height) || 600,
    rotation: Number(rotation) || 0,
    watermarkText,
    watermarkColor,
    watermarkPosYPct,
    date: date || new Date().toISOString(),
    scaleMultiplier: Number(scaleMultiplier) || 1.0,
    transactionId: transactionId || id.slice(0, 8).toUpperCase(),
    qrText,
    createdAt: Date.now(),
  });

  // Limit store size to 300 items to conserve memory
  if (receiptsStore.size > 300) {
    const oldestKey = receiptsStore.keys().next().value;
    if (oldestKey) receiptsStore.delete(oldestKey);
  }

  return res.json({ success: true, id });
});

app.post('/api/receipts/batch', (req, res) => {
  const { items } = req.body;
  if (Array.isArray(items)) {
    for (const item of items) {
      if (item.id && item.dataUrl) {
        receiptsStore.set(item.id, {
          ...item,
          createdAt: Date.now(),
        });
      }
    }
  }
  return res.json({ success: true, count: receiptsStore.size });
});

app.get('/api/receipts/:id', (req, res) => {
  const receipt = receiptsStore.get(req.params.id);
  if (!receipt) {
    return res.status(404).json({ error: 'Nota tidak ditemukan atau telah kedaluwarsa' });
  }
  return res.json(receipt);
});

// ==========================================
// NEON DATABASE INTEGRATION FOR BUKU PRODUKSI
// ==========================================

// Check status / env config
app.get('/api/neon/status', (_req, res) => {
  const hasEnvUrl = !!(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL);
  res.json({
    hasEnvUrl,
    envUrlMasked: hasEnvUrl
      ? (process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || '').replace(
          /:([^@]+)@/,
          ':****@'
        )
      : null,
  });
});

// Test connection
app.post('/api/neon/test-connection', async (req, res) => {
  const { connectionString } = req.body;
  let pool: pg.Pool | null = null;
  try {
    pool = getNeonPool(connectionString);
    const client = await pool.connect();
    try {
      const dbRes = await client.query(
        'SELECT current_database() as db, current_user as usr, version() as ver'
      );
      const row = dbRes.rows[0];
      return res.json({
        success: true,
        database: row.db,
        user: row.usr,
        version: row.ver,
        message: 'Koneksi ke database Neon Buku Produksi berhasil!',
      });
    } finally {
      client.release();
    }
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: err.message || 'Gagal terhubung ke database Neon',
    });
  } finally {
    if (pool) pool.end().catch(() => {});
  }
});

// Get user tables
app.post('/api/neon/get-tables', async (req, res) => {
  const { connectionString } = req.body;
  let pool: pg.Pool | null = null;
  try {
    pool = getNeonPool(connectionString);
    const client = await pool.connect();
    try {
      const q = `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name ASC
      `;
      const result = await client.query(q);
      const tables = result.rows.map((r) => r.table_name);

      // Prioritize tables related to Buku Produksi / Laporan Gaji
      const payrollCandidates = tables.filter((t: string) => {
        const lower = t.toLowerCase();
        return (
          lower.includes('gaji') ||
          lower.includes('slip') ||
          lower.includes('laporan') ||
          lower.includes('payroll') ||
          lower.includes('upah') ||
          lower.includes('borongan') ||
          lower.includes('karyawan') ||
          lower.includes('pekerja') ||
          lower.includes('produksi')
        );
      });

      return res.json({
        success: true,
        tables,
        payrollCandidates,
      });
    } finally {
      client.release();
    }
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: err.message || 'Gagal mengambil daftar tabel dari Neon',
    });
  } finally {
    if (pool) pool.end().catch(() => {});
  }
});

// Get table columns / schema
app.post('/api/neon/get-table-schema', async (req, res) => {
  const { connectionString, tableName } = req.body;
  if (!tableName) {
    return res.status(400).json({ error: 'Nama tabel wajib diisi' });
  }

  let pool: pg.Pool | null = null;
  try {
    pool = getNeonPool(connectionString);
    const client = await pool.connect();
    try {
      const q = `
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position ASC
      `;
      const result = await client.query(q, [tableName]);
      const columns = result.rows.map((r) => ({
        name: r.column_name,
        type: r.data_type,
      }));

      return res.json({
        success: true,
        tableName,
        columns,
      });
    } finally {
      client.release();
    }
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: err.message || 'Gagal mengambil skema kolom',
    });
  } finally {
    if (pool) pool.end().catch(() => {});
  }
});

// Fetch records from selected table
app.post('/api/neon/fetch-records', async (req, res) => {
  const { connectionString, tableName, limit = 100 } = req.body;
  if (!tableName) {
    return res.status(400).json({ error: 'Nama tabel wajib diisi' });
  }

  // Sanitize tableName against SQL injection (alphanumeric and underscore only)
  if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
    return res.status(400).json({ error: 'Nama tabel tidak valid' });
  }

  let pool: pg.Pool | null = null;
  try {
    pool = getNeonPool(connectionString);
    const client = await pool.connect();
    try {
      const safeLimit = Math.min(300, Math.max(1, Number(limit) || 100));
      const q = `SELECT * FROM "${tableName}" LIMIT ${safeLimit}`;
      const result = await client.query(q);
      return res.json({
        success: true,
        tableName,
        rowCount: result.rowCount,
        rows: result.rows,
      });
    } finally {
      client.release();
    }
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: err.message || 'Gagal mengambil data dari tabel ' + tableName,
    });
  } finally {
    if (pool) pool.end().catch(() => {});
  }
});

// Laporan Gaji Buku Produksi.
// Setara query di Buku Produksi: buku_gaji -> status 'Lunas' -> ORDER BY tanggal DESC.
// Nama tabel ditulis di server, tidak pernah diambil dari client, dan koneksi hanya
// dibaca dari env (NEON_DATABASE_URL / DATABASE_URL).
const LAPORAN_GAJI_SQL = `
  SELECT
    id,
    tanggal,
    worker_id,
    worker_name,
    items_detail,
    gaji_pokok,
    sisa_gaji,
    potongan,
    total,
    status,
    tipe,
    parent_session_id,
    created_at
  FROM buku_gaji
  WHERE status = 'Lunas'
`;

app.post('/api/neon/laporan-gaji', async (req, res) => {
  const { limit, startDate, endDate } = req.body ?? {};

  const safeLimit = Math.min(1000, Math.max(1, Number(limit) || 300));

  const parsedStart = parseIsoDate(startDate);
  const parsedEnd = parseIsoDate(endDate);
  if (!parsedStart.ok || !parsedEnd.ok) {
    return res.status(400).json({
      success: false,
      error: 'startDate dan endDate harus berformat YYYY-MM-DD',
    });
  }
  if (parsedStart.value && parsedEnd.value && parsedStart.value > parsedEnd.value) {
    return res.status(400).json({
      success: false,
      error: 'startDate tidak boleh lebih besar dari endDate',
    });
  }

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (parsedStart.value) {
    params.push(parsedStart.value);
    conditions.push(`tanggal >= $${params.length}::date`);
  }
  if (parsedEnd.value) {
    params.push(parsedEnd.value);
    conditions.push(`tanggal <= $${params.length}::date`);
  }

  params.push(safeLimit);
  const sql =
    LAPORAN_GAJI_SQL +
    (conditions.length ? ` AND ${conditions.join(' AND ')}` : '') +
    ` ORDER BY tanggal DESC LIMIT $${params.length}`;

  let pool: pg.Pool | null = null;
  try {
    pool = getNeonPool();
    const client = await pool.connect();
    try {
      const result = await client.query(sql, params);
      const rows = result.rows.map((row: any) => ({
        id: row.id,
        tanggal: row.tanggal,
        worker_id: row.worker_id,
        worker_name: row.worker_name,
        items_detail: Array.isArray(row.items_detail) ? row.items_detail : [],
        gaji_pokok: toNumberOrZero(row.gaji_pokok),
        sisa_gaji: toNumberOrZero(row.sisa_gaji),
        potongan: toNumberOrZero(row.potongan),
        total: toNumberOrZero(row.total),
        status: row.status,
        tipe: row.tipe,
        parent_session_id: row.parent_session_id,
        created_at: row.created_at,
      }));

      return res.json({
        success: true,
        source: 'buku_gaji',
        filters: {
          status: 'Lunas',
          startDate: parsedStart.value || null,
          endDate: parsedEnd.value || null,
        },
        rowCount: rows.length,
        rows,
      });
    } finally {
      client.release();
    }
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: err.message || 'Gagal mengambil Laporan Gaji dari database Neon',
    });
  } finally {
    if (pool) pool.end().catch(() => {});
  }
});

// Sample data for instant demonstration of Buku Produksi Laporan Gaji
app.get('/api/neon/sample-buku-produksi', (_req, res) => {
  const sampleSlips = [
    {
      id: 'BP-2026-001',
      slipNumber: 'BP/GJ/09/001',
      employeeName: 'Budi Santoso',
      department: 'Operator Jahit Kemeja',
      period: 'Minggu ke-4 September 2026',
      date: '28 September 2026',
      workDays: 6,
      pieceRateSalary: 1450000,
      overtimeSalary: 250000,
      bonus: 100000,
      deductions: 50000,
      totalSalary: 1750000,
      companyName: 'CV. BUKU PRODUKSI GARMENT',
    },
    {
      id: 'BP-2026-002',
      slipNumber: 'BP/GJ/09/002',
      employeeName: 'Siti Aminah',
      department: 'Jahit Obras & Overdeck',
      period: 'Minggu ke-4 September 2026',
      date: '28 September 2026',
      workDays: 6,
      pieceRateSalary: 1520000,
      overtimeSalary: 180000,
      bonus: 100000,
      deductions: 0,
      totalSalary: 1800000,
      companyName: 'CV. BUKU PRODUKSI GARMENT',
    },
    {
      id: 'BP-2026-003',
      slipNumber: 'BP/GJ/09/003',
      employeeName: 'Ahmad Fauzi',
      department: 'Potong Pola (Cutting)',
      period: 'Minggu ke-4 September 2026',
      date: '28 September 2026',
      workDays: 6,
      pieceRateSalary: 1600000,
      overtimeSalary: 300000,
      bonus: 150000,
      deductions: 100000,
      totalSalary: 1950000,
      companyName: 'CV. BUKU PRODUKSI GARMENT',
    },
    {
      id: 'BP-2026-004',
      slipNumber: 'BP/GJ/09/004',
      employeeName: 'Dewi Sartika',
      department: 'Finishing & Lubang Kancing',
      period: 'Minggu ke-4 September 2026',
      date: '28 September 2026',
      workDays: 6,
      pieceRateSalary: 1350000,
      overtimeSalary: 150000,
      bonus: 80000,
      deductions: 0,
      totalSalary: 1580000,
      companyName: 'CV. BUKU PRODUKSI GARMENT',
    },
    {
      id: 'BP-2026-005',
      slipNumber: 'BP/GJ/09/005',
      employeeName: 'Rudi Hartono',
      department: 'Bordir Komputer',
      period: 'Minggu ke-4 September 2026',
      date: '28 September 2026',
      workDays: 6,
      pieceRateSalary: 1650000,
      overtimeSalary: 220000,
      bonus: 100000,
      deductions: 50000,
      totalSalary: 1920000,
      companyName: 'CV. BUKU PRODUKSI GARMENT',
    },
    {
      id: 'BP-2026-006',
      slipNumber: 'BP/GJ/09/006',
      employeeName: 'Sri Wahyuni',
      department: 'Quality Control (QC)',
      period: 'Minggu ke-4 September 2026',
      date: '28 September 2026',
      workDays: 6,
      pieceRateSalary: 1400000,
      overtimeSalary: 120000,
      bonus: 100000,
      deductions: 0,
      totalSalary: 1620000,
      companyName: 'CV. BUKU PRODUKSI GARMENT',
    },
    {
      id: 'BP-2026-007',
      slipNumber: 'BP/GJ/09/007',
      employeeName: 'Eko Prasetyo',
      department: 'Jahit Kerah & Manset',
      period: 'Minggu ke-4 September 2026',
      date: '28 September 2026',
      workDays: 6,
      pieceRateSalary: 1480000,
      overtimeSalary: 200000,
      bonus: 100000,
      deductions: 80000,
      totalSalary: 1700000,
      companyName: 'CV. BUKU PRODUKSI GARMENT',
    },
    {
      id: 'BP-2026-008',
      slipNumber: 'BP/GJ/09/008',
      employeeName: 'Nurul Hidayah',
      department: 'Packing & Ironing',
      period: 'Minggu ke-4 September 2026',
      date: '28 September 2026',
      workDays: 6,
      pieceRateSalary: 1300000,
      overtimeSalary: 160000,
      bonus: 100000,
      deductions: 0,
      totalSalary: 1560000,
      companyName: 'CV. BUKU PRODUKSI GARMENT',
    },
  ];

  return res.json({
    success: true,
    message: 'Data contoh Laporan Gaji Buku Produksi siap digunakan',
    slips: sampleSlips,
  });
});


// Vite middleware or Static files
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
