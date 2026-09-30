import type { IncomingMessage, ServerResponse } from 'node:http';
import { jsPDF } from 'jspdf';
import { getSlipImage } from '../server/slipQrStorage.js';

// Endpoint slip individual: GET /s/<buku_gaji_id> (Vercel route /api/slip?id=<uuid>).
// Mengambil gambar slip dari Neon lewat helper server/slipQrStorage.ts lalu
// membungkusnya jadi PDF 1 halaman agar bisa dibuka langsung di browser /
// dicetak tanpa perlu imgur atau storage publik.
//
// Penyimpanan gambar tetap dipegang helper tersebut. File ini hanya mengurus
// kontrak HTTP dan penyusunan PDF. Connection string hanya dibaca dari env
// server-side dan tidak pernah ikut di response maupun pesan error.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PDF_MIME_TYPE = 'application/pdf';

// Margin halaman A4 dalam mm. Gambar tidak pernah dipotong, hanya contain-fit.
const PAGE_MARGIN_MM = 5;

const A4_PORTRAIT = { width: 210, height: 297 } as const;

const JPEG_SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

interface ImageSize {
  width: number;
  height: number;
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.statusCode = status;
  res.end(JSON.stringify(payload));
}

/**
 * Function ini statis (bukan dynamic route), jadi ID slip selalu datang lewat
 * query string `?id=<uuid>` setelah rewrite /s/:id. Path hanya dibaca sebagai
 * cadangan supaya file ini tidak terikat pada satu bentuk URL.
 */
function readIdParam(req: IncomingMessage): string {
  const query = (req as IncomingMessage & { query?: Record<string, unknown> }).query;
  const queryId = query?.id;
  if (typeof queryId === 'string' && queryId.trim()) {
    return queryId.trim();
  }

  try {
    return new URL(req.url ?? '', 'http://localhost').searchParams.get('id')?.trim() ?? '';
  } catch {
    return '';
  }
}

function readPngSize(buffer: Buffer): ImageSize | null {
  if (buffer.length < 24) return null;
  if (buffer.readUInt32BE(0) !== 0x89504e47) return null;
  if (buffer.toString('latin1', 12, 16) !== 'IHDR') return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function readJpegSize(buffer: Buffer): ImageSize | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 8 <= buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1]!;
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    // Standalone marker tidak punya payload panjang.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }

    const segmentLength = buffer.readUInt16BE(offset + 2);
    if (JPEG_SOF_MARKERS.has(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    // SOS: data piksel mulai, dimensi pasti sudah ditemukan sebelumnya.
    if (marker === 0xda) return null;

    offset += 2 + segmentLength;
  }

  return null;
}

function readWebpSize(buffer: Buffer): ImageSize | null {
  if (buffer.length < 30) return null;
  if (buffer.toString('latin1', 0, 4) !== 'RIFF') return null;
  if (buffer.toString('latin1', 8, 12) !== 'WEBP') return null;

  const chunk = buffer.toString('latin1', 12, 16);

  // Extended: payload = flags(4) + canvasWidth-1(3) + canvasHeight-1(3).
  if (chunk === 'VP8X') {
    return {
      width: buffer.readUIntLE(24, 3) + 1,
      height: buffer.readUIntLE(27, 3) + 1,
    };
  }

  // Lossy: payload = frameTag(3) + syncCode(3) + width(2) + height(2).
  if (chunk === 'VP8 ') {
    if (buffer[23] !== 0x9d || buffer[24] !== 0x01 || buffer[25] !== 0x2a) return null;
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }

  // Lossless: payload = signature(0x2f) + 14 bit width-1 + 14 bit height-1.
  if (chunk === 'VP8L') {
    if (buffer[20] !== 0x2f) return null;
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >>> 14) & 0x3fff) + 1,
    };
  }

  return null;
}

/**
 * Dimensi asli slip dibutuhkan sebelum halaman dibuat supaya orientasi A4 dan
 * ukuran gambar bisa dipilih. jsPDF membaca dimensi sendiri saat addImage, tapi
 * saat itu halaman sudah terlanjur dibuat.
 */
function readImageSize(buffer: Buffer, mimeType: string): ImageSize {
  const size =
    mimeType === 'image/jpeg'
      ? readJpegSize(buffer)
      : mimeType === 'image/webp'
        ? readWebpSize(buffer)
        : readPngSize(buffer);

  if (!size || !Number.isFinite(size.width) || !Number.isFinite(size.height)) {
    throw new Error(`Dimensi gambar slip (${mimeType}) tidak bisa dibaca`);
  }
  if (size.width <= 0 || size.height <= 0) {
    throw new Error(`Dimensi gambar slip (${mimeType}) tidak valid`);
  }

  return size;
}

function toJsPdfFormat(mimeType: string): 'PNG' | 'JPEG' | 'WEBP' {
  if (mimeType === 'image/jpeg') return 'JPEG';
  if (mimeType === 'image/webp') return 'WEBP';
  return 'PNG';
}

/**
 * Satu halaman A4 dengan gambar slip contain-fit dan rata tengah. Rasio slip
 * tidak pernah diubah dan tidak ada bagian yang terpotong.
 */
function buildSlipPdf(imageData: Buffer, mimeType: string): Uint8Array {
  const { width, height } = readImageSize(imageData, mimeType);
  const isLandscape = width >= height;

  const pageWidth = isLandscape ? A4_PORTRAIT.height : A4_PORTRAIT.width;
  const pageHeight = isLandscape ? A4_PORTRAIT.width : A4_PORTRAIT.height;

  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: false,
  });

  const availWidth = pageWidth - PAGE_MARGIN_MM * 2;
  const availHeight = pageHeight - PAGE_MARGIN_MM * 2;

  let drawWidth = availWidth;
  let drawHeight = availHeight;
  if (width / height > availWidth / availHeight) {
    drawHeight = availWidth / (width / height);
  } else {
    drawWidth = availHeight * (width / height);
  }

  doc.addImage(
    new Uint8Array(imageData),
    toJsPdfFormat(mimeType),
    PAGE_MARGIN_MM + (availWidth - drawWidth) / 2,
    PAGE_MARGIN_MM + (availHeight - drawHeight) / 2,
    drawWidth,
    drawHeight,
    undefined,
    mimeType === 'image/png' ? 'NONE' : 'FAST'
  );

  return new Uint8Array(doc.output('arraybuffer'));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendJson(res, 405, {
      ok: false,
      error: `Method ${req.method ?? 'unknown'} tidak diizinkan. Gunakan GET.`,
    });
    return;
  }

  const rawId = readIdParam(req);
  if (!UUID_PATTERN.test(rawId)) {
    sendJson(res, 400, {
      ok: false,
      error: 'ID slip harus berupa UUID buku_gaji.id yang valid',
    });
    return;
  }

  try {
    const stored = await getSlipImage(rawId);
    if (!stored) {
      sendJson(res, 404, {
        ok: false,
        error: 'Slip untuk ID ini belum tersedia',
      });
      return;
    }

    const pdf = buildSlipPdf(stored.imageData, stored.mimeType);

    res.setHeader('Content-Type', PDF_MIME_TYPE);
    res.setHeader('Content-Disposition', `inline; filename="slip-${rawId}.pdf"`);
    res.setHeader('Content-Length', String(pdf.byteLength));
    res.setHeader('Cache-Control', 'no-store');
    res.statusCode = 200;
    res.end(Buffer.from(pdf));
  } catch (err) {
    // Detail error (bisa memuat pesan driver database) hanya di log server.
    console.error('[slip-pdf] gagal menyusun PDF slip:', err);
    sendJson(res, 500, {
      ok: false,
      error: 'Gagal menyiapkan slip untuk ID ini',
    });
  }
}
