import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const { Pool } = pg;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DATA_URL_PATTERN = /^data:([a-z0-9.+-]+\/[a-z0-9.+-]+)?(;charset=[^;,]+)?(;base64)?,/i;

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);

export const MAX_SLIP_IMAGE_BYTES = 10 * 1024 * 1024;

export type SlipImageInput = Buffer | Uint8Array | string;

export interface SlipImageInputOptions {
  mimeType?: string;
}

export interface StoredSlipImage {
  bukuGajiId: string;
  imageData: Buffer;
  mimeType: string;
  byteLength: number;
  createdAt: Date;
  updatedAt: Date;
}

let pool: pg.Pool | null = null;

/**
 * Pool dibuat lazy dan mandiri supaya modul ini tidak ikut mengubah server.ts
 * maupun membuka koneksi hanya karena di-import.
 */
function getPool(): pg.Pool {
  if (pool) return pool;

  const connStr = (process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || '').trim();
  if (!connStr) {
    throw new Error(
      'Connection string Neon Database belum diisi (NEON_DATABASE_URL / DATABASE_URL)'
    );
  }

  pool = new Pool({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 15000,
    max: 5,
  });

  // Tanpa listener, error pada client yang idle akan membuat proses Node crash.
  pool.on('error', () => {});

  return pool;
}

function assertBukuGajiId(bukuGajiId: string): string {
  const id = typeof bukuGajiId === 'string' ? bukuGajiId.trim() : '';
  if (!UUID_PATTERN.test(id)) {
    throw new Error(`buku_gaji_id harus berupa UUID yang valid, diterima: "${bukuGajiId}"`);
  }
  return id;
}

function decodeDataUrl(input: string): { buffer: Buffer; mimeType: string | null } {
  const match = DATA_URL_PATTERN.exec(input.trim());
  if (!match) {
    throw new Error('String harus berupa data URL, contoh: data:image/png;base64,...');
  }

  const payload = input.trim().slice(match[0].length);
  const buffer = match[3]
    ? Buffer.from(payload, 'base64')
    : Buffer.from(decodeURIComponent(payload), 'binary');

  return { buffer, mimeType: match[1]?.toLowerCase() ?? null };
}

function assertMimeType(mimeType: string): string {
  const normalized = mimeType.trim().toLowerCase();
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(normalized)) {
    throw new Error(
      `mime_type "${mimeType}" tidak didukung. Gunakan salah satu: ${ALLOWED_MIME_TYPES.join(', ')}`
    );
  }
  return normalized;
}

function assertKnownSignature(buffer: Buffer, mimeType: string): void {
  if (mimeType === 'image/png' && !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('Data bukan PNG yang valid (signature PNG tidak cocok)');
  }
  if (mimeType === 'image/jpeg' && !buffer.subarray(0, 3).equals(JPEG_SIGNATURE)) {
    throw new Error('Data bukan JPEG yang valid (signature JPEG tidak cocok)');
  }
}

function normalizeImage(
  input: SlipImageInput,
  options: SlipImageInputOptions
): { buffer: Buffer; mimeType: string } {
  let buffer: Buffer;
  let detectedMimeType: string | null = null;

  if (typeof input === 'string') {
    const decoded = decodeDataUrl(input);
    buffer = decoded.buffer;
    detectedMimeType = decoded.mimeType;
  } else if (input instanceof Uint8Array) {
    buffer = Buffer.from(input);
  } else {
    throw new Error('Gambar slip harus berupa Buffer, Uint8Array, atau data URL string');
  }

  if (buffer.length === 0) {
    throw new Error('Gambar slip kosong');
  }
  if (buffer.length > MAX_SLIP_IMAGE_BYTES) {
    throw new Error(
      `Gambar slip ${buffer.length} byte melebihi batas ${MAX_SLIP_IMAGE_BYTES} byte`
    );
  }

  const mimeType = assertMimeType(
    options.mimeType || detectedMimeType || 'image/png'
  );
  assertKnownSignature(buffer, mimeType);

  return { buffer, mimeType };
}

function rethrowStorageError(err: unknown): never {
  const code = (err as { code?: string })?.code;

  if (code === '42P01') {
    throw new Error(
      'Tabel slip_qr_storage belum ada di Neon. Jalankan migrations/001_create_slip_qr_storage.sql terlebih dahulu.'
    );
  }
  if (code === '23503') {
    throw new Error(
      'buku_gaji_id tidak ditemukan pada tabel buku_gaji. Slip harus berasal dari Laporan Gaji yang sudah ada.'
    );
  }
  throw err;
}

function toStoredSlipImage(row: any): StoredSlipImage {
  return {
    bukuGajiId: row.buku_gaji_id,
    imageData: row.image_data,
    mimeType: row.mime_type,
    byteLength: Number(row.byte_length),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Menyimpan PNG slip hasil render html2canvas, di-key oleh buku_gaji.id.
 * Aman dipanggil berulang untuk slip yang sama: gambar lama ditimpa,
 * created_at tetap menyimpan waktu render pertama.
 */
export async function saveSlipImage(
  bukuGajiId: string,
  image: SlipImageInput,
  options: SlipImageInputOptions = {}
): Promise<StoredSlipImage> {
  const id = assertBukuGajiId(bukuGajiId);
  const { buffer, mimeType } = normalizeImage(image, options);

  const client = await getPool().connect();
  try {
    const { rows } = await client.query(
      `INSERT INTO slip_qr_storage (buku_gaji_id, image_data, mime_type)
       VALUES ($1, $2, $3)
       ON CONFLICT (buku_gaji_id) DO UPDATE
         SET image_data = EXCLUDED.image_data,
             mime_type   = EXCLUDED.mime_type
       RETURNING buku_gaji_id, image_data, mime_type, created_at, updated_at,
                 octet_length(image_data) AS byte_length`,
      [id, buffer, mimeType]
    );
    return toStoredSlipImage(rows[0]);
  } catch (err) {
    return rethrowStorageError(err);
  } finally {
    client.release();
  }
}

/**
 * Mengambil PNG slip berdasarkan buku_gaji.id, atau null bila slip belum
 * pernah disimpan.
 */
export async function getSlipImage(
  bukuGajiId: string
): Promise<StoredSlipImage | null> {
  const id = assertBukuGajiId(bukuGajiId);

  const client = await getPool().connect();
  try {
    const { rows } = await client.query(
      `SELECT buku_gaji_id, image_data, mime_type, created_at, updated_at,
              octet_length(image_data) AS byte_length
         FROM slip_qr_storage
        WHERE buku_gaji_id = $1`,
      [id]
    );
    return rows.length > 0 ? toStoredSlipImage(rows[0]) : null;
  } catch (err) {
    return rethrowStorageError(err);
  } finally {
    client.release();
  }
}

export async function closeSlipStoragePool(): Promise<void> {
  if (!pool) return;
  const current = pool;
  pool = null;
  await current.end();
}
