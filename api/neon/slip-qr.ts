import type { IncomingMessage, ServerResponse } from 'node:http';
import pg from 'pg';
import { MAX_SLIP_IMAGE_BYTES, saveSlipImage } from '../../server/slipQrStorage.js';

const { Pool } = pg;

// Vercel Function untuk endpoint POST /api/neon/slip-qr.
// Penyimpanan PNG slip Buku Produksi tetap dipegang helper
// server/slipQrStorage.ts: file ini hanya menjaga kontrak HTTP (method,
// body, bentuk response). Connection string hanya dibaca dari env server-side
// dan tidak pernah dikirim ke browser.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SUPPORTED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

// Base64 adds ~33% on top of the decoded image, sisakan ruang untuk header.
const MAX_BODY_BYTES = Math.ceil((MAX_SLIP_IMAGE_BYTES * 4) / 3) + 64 * 1024;

class BadRequestError extends Error {}

class NotFoundError extends Error {}

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
        reject(new BadRequestError('Body request kosong'));
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

function assertBukuGajiId(value: unknown): string {
  const id = typeof value === 'string' ? value.trim() : '';
  if (!UUID_PATTERN.test(id)) {
    throw new BadRequestError('bukuGajiId wajib diisi dengan UUID buku_gaji.id yang valid');
  }
  return id;
}

function assertDataUrl(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new BadRequestError('dataUrl wajib diisi dengan data URL gambar slip');
  }

  const match = /^data:([a-z0-9.+-]+\/[a-z0-9.+-]+)?(;charset=[^;,]+)?(;base64)?,/i.exec(value.trim());
  if (!match) {
    throw new BadRequestError('dataUrl harus berupa data URL, contoh: data:image/png;base64,...');
  }

  const mimeType = match[1]?.toLowerCase() ?? '';
  if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
    throw new BadRequestError(
      `dataUrl harus berisi gambar dengan tipe ${SUPPORTED_MIME_TYPES.join(', ')}`
    );
  }

  return value.trim();
}

async function assertBukuGajiExists(pool: pg.Pool, bukuGajiId: string): Promise<void> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      'SELECT 1 FROM buku_gaji WHERE id = $1 LIMIT 1',
      [bukuGajiId]
    );
    if (rows.length === 0) {
      throw new NotFoundError('buku_gaji.id tidak ditemukan');
    }
  } finally {
    client.release();
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, {
      ok: false,
      error: `Method ${req.method ?? 'unknown'} tidak diizinkan. Gunakan POST.`,
    });
    return;
  }

  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    sendJson(res, 400, {
      ok: false,
      error: err instanceof Error ? err.message : 'Body request tidak valid',
    });
    return;
  }

  let bukuGajiId: string;
  let dataUrl: string;
  try {
    bukuGajiId = assertBukuGajiId(body.bukuGajiId);
    dataUrl = assertDataUrl(body.dataUrl);
  } catch (err) {
    sendJson(res, 400, {
      ok: false,
      error: err instanceof Error ? err.message : 'Request tidak valid',
    });
    return;
  }

  let pool: pg.Pool | null = null;
  try {
    pool = getNeonPool();
    await assertBukuGajiExists(pool, bukuGajiId);

    const stored = await saveSlipImage(bukuGajiId, dataUrl);

    sendJson(res, 200, {
      ok: true,
      bukuGajiId: stored.bukuGajiId,
      mimeType: stored.mimeType,
    });
  } catch (err) {
    if (err instanceof NotFoundError) {
      sendJson(res, 404, { ok: false, error: err.message });
      return;
    }
    if (err instanceof BadRequestError) {
      sendJson(res, 400, { ok: false, error: err.message });
      return;
    }
    // Detail error hanya ditulis di log server, string koneksi tidak pernah
    // dikembalikan ke browser.
    console.error('[slip-qr] gagal menyimpan slip:', err);
    sendJson(res, 500, {
      ok: false,
      error: 'Gagal menyimpan slip QR ke database Neon',
    });
  } finally {
    if (pool) pool.end().catch(() => {});
  }
}
