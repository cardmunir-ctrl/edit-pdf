import type { IncomingMessage, ServerResponse } from 'node:http';
import pg from 'pg';

const { Pool } = pg;

// Vercel Function untuk endpoint POST /api/neon/laporan-gaji.
// Query, validasi, dan bentuk response sengaja disamakan dengan route
// /api/neon/laporan-gaji di server.ts supaya frontend lokal dan production
// memakai data yang sama. Nama tabel ditulis di server, koneksi hanya dibaca
// dari env server-side dan tidak pernah dikirim ke browser.

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

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_BODY_BYTES = 64 * 1024;

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.statusCode = status;
  res.end(JSON.stringify(payload));
}

function getNeonPool() {
  const connStr = (
    process.env.NEON_DATABASE_URL ||
    process.env.DATABASE_URL ||
    ''
  ).trim();

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

function parseIsoDate(value: unknown): { ok: true; value: string } | { ok: false } {
  if (value === null || value === undefined || value === '') return { ok: true, value: '' };
  if (typeof value !== 'string') return { ok: false };
  const trimmed = value.trim();
  if (!ISO_DATE_PATTERN.test(trimmed)) return { ok: false };
  return { ok: true, value: trimmed };
}

class BadRequestError extends Error {}

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;

    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new BadRequestError('Body request terlalu besar'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          reject(new BadRequestError('Body request harus berupa JSON object'));
          return;
        }
        resolve(parsed as Record<string, unknown>);
      } catch {
        reject(new BadRequestError('Body request harus berupa JSON yang valid'));
      }
    });

    req.on('error', () => {
      reject(new BadRequestError('Body request tidak bisa dibaca'));
    });
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, {
      success: false,
      error: `Method ${req.method ?? 'unknown'} tidak diizinkan. Gunakan POST.`,
    });
    return;
  }

  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    sendJson(res, 400, {
      success: false,
      error: err instanceof Error ? err.message : 'Body request tidak valid',
    });
    return;
  }

  const { limit, startDate, endDate } = body;

  const safeLimit = Math.min(1000, Math.max(1, Number(limit) || 300));

  const parsedStart = parseIsoDate(startDate);
  const parsedEnd = parseIsoDate(endDate);
  if (!parsedStart.ok || !parsedEnd.ok) {
    sendJson(res, 400, {
      success: false,
      error: 'startDate dan endDate harus berformat YYYY-MM-DD',
    });
    return;
  }
  if (parsedStart.value && parsedEnd.value && parsedStart.value > parsedEnd.value) {
    sendJson(res, 400, {
      success: false,
      error: 'startDate tidak boleh lebih besar dari endDate',
    });
    return;
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
      const rows = result.rows.map((row: Record<string, any>) => ({
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

      sendJson(res, 200, {
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
  } catch (err) {
    // Detail error hanya ditulis di log server, string koneksi tidak pernah
    // dikembalikan ke browser.
    console.error('[laporan-gaji] gagal query buku_gaji:', err);
    sendJson(res, 500, {
      success: false,
      error: 'Gagal mengambil Laporan Gaji dari database Neon',
    });
  } finally {
    if (pool) pool.end().catch(() => {});
  }
}
