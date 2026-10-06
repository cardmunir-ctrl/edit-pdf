/**
 * Probe penempatan QR Code pada PDF hasil cetak.
 *
 * Meniru rect math yang dipakai `buildA4GridPdf()` persis, lalu memeriksa
 * invarian QR untuk semua jalur yang diminta:
 *   - upload PDF biasa
 *   - upload PDF + pangkas bawah + rotasi 90/270
 *   - Buku Produksi (QR ON dan QR OFF)
 *   - QR ON pada semua preset posisi
 *
 * Invarian yang diperiksa:
 *   1. QR digambar sebagai kotak axis-aligned di dalam slip (x, y, w, h) tanpa
 *      rotasi => selalu lurus dan sejajar sisi atas slip.
 *   2. Acuan koordinat = rect slip lokal SETELAH crop/rotasi/skala, bukan
 *      koordinat halaman PDF sumber. Slip dirotasi 90/270 diuji lewat dimensi
 *      yang ter-swap, sama seperti `processReceiptImage()`.
 *   3. QR selalu muat di dalam slip dengan margin kiri/bawah yang sama.
 *   4. QR Buku Produksi = URL individu /s/<uuid>, upload biasa tidak tersentuh.
 *   5. QR OFF => tidak ada QR sama sekali.
 *
 * Jalankan: npm run probe:qr
 */
import '../src/lib/iteratorPolyfill';

// Modul diimpor setelah window disetel supaya fallback QR otomatis
// (`origin/?nota=<id>`) behave sama seperti di browser.
(globalThis as { window?: unknown }).window = {
  location: { origin: 'https://edit-slip-pdf.vercel.app' },
};

import {
  calculateGridLayout,
  calculateQrPositionMm,
  calculateQrSideSize,
  resolveReceiptSettings,
  type GridOptions,
  type QrPositionPreset,
  type ReceiptCustomConfig,
  type ReceiptItem,
} from '../src/lib/pdfEngine';

const UUID = '123e4567-e89b-12d3-a456-426614174000';
const SLIP_BASE_URL = 'https://edit-slip-pdf.vercel.app/s';

let failures = 0;
let checks = 0;

function assert(condition: boolean, label: string, detail = '') {
  checks += 1;
  if (condition) {
    console.log(`  ok   ${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

/** Replica rect slip lokal di dalam buildA4GridPdf(). */
function slipRectMm(item: ReceiptItem, slotRect: { x: number; y: number; width: number; height: number }, options: GridOptions) {
  const pad = Math.max(0, options.paddingMm || 0);
  const availW = Math.max(5, slotRect.width - pad * 2);
  const availH = Math.max(5, slotRect.height - pad * 2);

  let drawW = availW;
  let drawH = availH;
  let drawX = slotRect.x + pad;
  let drawY = slotRect.y + pad;

  if (options.fitMode === 'contain') {
    const imgAspect = item.width / item.height;
    const cellAspect = availW / availH;
    if (imgAspect > cellAspect) {
      drawW = availW;
      drawH = availW / imgAspect;
      drawY = slotRect.y + pad + (availH - drawH) / 2;
    } else {
      drawH = availH;
      drawW = availH * imgAspect;
      drawX = slotRect.x + pad + (availW - drawW) / 2;
    }
  }

  const scale = resolveReceiptSettings(item, options).scaleMultiplier;
  if (scale && scale !== 1.0) {
    const scaledW = drawW * scale;
    const scaledH = drawH * scale;
    return {
      drawX: drawX + (drawW - scaledW) / 2,
      drawY: drawY + (drawH - scaledH) / 2,
      drawW: scaledW,
      drawH: scaledH,
    };
  }

  return { drawX, drawY, drawW, drawH };
}

function makeItem(id: string, width: number, height: number, extra: Partial<ReceiptItem> = {}): ReceiptItem {
  return {
    id,
    sourceFileName: id,
    pageIndex: 1,
    dataUrl: '',
    originalDataUrl: '',
    width,
    height,
    aspectRatio: width / height,
    originalWidth: width,
    originalHeight: height,
    rotation: 0,
    isAutoTrimmed: false,
    ...extra,
  };
}

const options: GridOptions = {
  paperOrientation: 'portrait',
  gapMm: 4.0,
  displayCount: 8,
  paddingMm: 1.5,
  fitMode: 'contain',
  repeatSingle: true,
  dashedLineStyle: 'none',
  showPageNumbers: false,
  globalRotation: 0,
  autoTrimWhite: true,
  customBottomCropPct: 0,
  watermarkEnabled: false,
  watermarkText: 'LUNAS',
  watermarkPosYPct: 40,
  watermarkPosXPct: 50,
  watermarkAngle: -25,
  watermarkOpacity: 0.25,
  watermarkFontSize: 16,
  watermarkColor: 'gray',
  qrEnabled: true,
  qrText: '',
  qrPosition: 'bottom-left',
  qrPosXPct: 85,
  qrPosYPct: 82,
  qrSizeMm: 14,
  qrAutoSize: true,
};

const layout = calculateGridLayout(options.paperOrientation, options.gapMm, 4.0);
const slot = layout.getSlotRect(0);

/** offset 2 mm dari tepi slip, sama dengan calculateQrPositionMm. */
const MARGIN_MM = 2.0;

interface Placed {
  qr: { x: number; y: number; size: number } | null;
  slip: { drawX: number; drawY: number; drawW: number; drawH: number };
  resolved: ReturnType<typeof resolveReceiptSettings>;
}

function place(item: ReceiptItem, override?: Partial<GridOptions>): Placed {
  const opts = { ...options, ...override };
  const resolved = resolveReceiptSettings(item, opts);
  const rect = slipRectMm(item, slot, opts);
  if (!resolved.qrEnabled || !resolved.qrText?.trim()) {
    return { qr: null, slip: rect, resolved };
  }
  const qr = calculateQrPositionMm(
    resolved.qrPosition,
    rect.drawX,
    rect.drawY,
    rect.drawW,
    rect.drawH,
    resolved.qrSizeMm,
    resolved.qrPosXPct,
    resolved.qrPosYPct,
    resolved.qrAutoSize
  );
  return { qr, slip: rect, resolved };
}

function withConfig(item: ReceiptItem, customConfig?: ReceiptCustomConfig): ReceiptItem {
  return customConfig ? { ...item, customConfig } : item;
}

// ---------------------------------------------------------------------------
console.log('1. Upload PDF biasa, QR ON');
{
  const item = makeItem('upload.pdf', 1240, 1754);
  const { qr, slip } = place(item);
  assert(qr !== null, 'QR digambar');
  assert(qr!.x - slip.drawX === MARGIN_MM, 'jarak kiri QR = margin slip', `${(qr!.x - slip.drawX).toFixed(2)} mm`);
  assert(slip.drawY + slip.drawH - (qr!.y + qr!.size) === MARGIN_MM, 'jarak bawah QR = margin slip',
    `${(slip.drawY + slip.drawH - (qr!.y + qr!.size)).toFixed(2)} mm`);
  assert(qr!.size === calculateQrSideSize(Math.min(slip.drawW, slip.drawH), 14, true), 'ukuran QR mengikuti rumus bersama');
}

// ---------------------------------------------------------------------------
console.log('\n2. Upload PDF + pangkas bawah + rotasi (koordinat lokal slip)');
const cropped: Array<[string, number, number, ReceiptCustomConfig]> = [
  ['pangkas bawah 25%', 1240, 1315, { customBottomCropPct: 25 }],
  ['pangkas bawah 25% + rotasi 90', 1315, 1240, { customBottomCropPct: 25, rotation: 90 }],
  ['rotasi 180', 1240, 1754, { rotation: 180 }],
  ['rotasi 270', 1754, 1240, { rotation: 270 }],
];
for (const [label, w, h, config] of cropped) {
  const item = withConfig(makeItem('upload.pdf', w, h), config);
  const { qr, slip } = place(item);
  assert(qr !== null, `${label}: QR digambar`);
  assert(qr!.x - slip.drawX === MARGIN_MM && slip.drawY + slip.drawH - (qr!.y + qr!.size) === MARGIN_MM,
    `${label}: QR di pojok kiri-bawah slip lokal`, `sisi slip ${slip.drawW.toFixed(2)}x${slip.drawH.toFixed(2)} mm`);
  assert(qr!.x + qr!.size <= slip.drawX + slip.drawW + 1e-9 && qr!.y + qr!.size <= slip.drawY + slip.drawH + 1e-9,
    `${label}: QR tidak keluar dari slip`);
  assert(qr!.size === 14, `${label}: ukuran QR tetap 14 mm (lurus & bisa dipindai)`, `${qr!.size.toFixed(2)} mm`);
}

// ---------------------------------------------------------------------------
console.log('\n3. Buku Produksi, QR ON');
{
  const item = makeItem('slip', 1500, 1730, { source: 'buku-produksi', bukuGajiId: UUID });
  const { qr, resolved, slip } = place(item);
  assert(resolved.qrText === `${SLIP_BASE_URL}/${UUID}`, 'isi QR = URL slip individual', resolved.qrText);
  assert(qr !== null, 'QR digambar');
  assert(qr!.x - slip.drawX === MARGIN_MM && slip.drawY + slip.drawH - (qr!.y + qr!.size) === MARGIN_MM,
    'QR sejajar sisi atas slip (kotak axis-aligned di rect lokal)');
}

console.log('\n4. Buku Produksi + skala per-nota 0.7');
{
  const item = withConfig(
    makeItem('slip', 1500, 1730, { source: 'buku-produksi', bukuGajiId: UUID }),
    { scaleMultiplier: 0.7 }
  );
  const { qr, slip, resolved } = place(item);
  assert(resolved.qrText === `${SLIP_BASE_URL}/${UUID}`, 'isi QR tetap URL slip individual');
  assert(qr!.x - slip.drawX === MARGIN_MM && slip.drawY + slip.drawH - (qr!.y + qr!.size) === MARGIN_MM,
    'QR mengikuti rect slip terskala, bukan rect halaman PDF', `sisi slip ${slip.drawW.toFixed(2)}x${slip.drawH.toFixed(2)} mm`);
  assert(qr!.x >= slip.drawX - 1e-9 && qr!.y >= slip.drawY - 1e-9, 'QR tidak bergeser keluar slip');
}

// ---------------------------------------------------------------------------
console.log('\n5. QR OFF');
{
  const bp = place(makeItem('slip', 1500, 1730, { source: 'buku-produksi', bukuGajiId: UUID }), { qrEnabled: false });
  assert(bp.qr === null, 'Buku Produksi + QR OFF => tidak ada QR');
  const bpPerNote = place(
    withConfig(makeItem('slip', 1500, 1730, { source: 'buku-produksi', bukuGajiId: UUID }), { qrMode: 'disabled' })
  );
  assert(bpPerNote.qr === null, 'Buku Produksi + qrMode disabled => tidak ada QR');
  const upload = place(makeItem('upload.pdf', 1240, 1754), { qrEnabled: false });
  assert(upload.qr === null, 'upload biasa + QR OFF => tidak ada QR');
}

// ---------------------------------------------------------------------------
console.log('\n6. QR ON pada semua preset posisi (harus tetap di dalam slip)');
{
  const positions: QrPositionPreset[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center', 'custom'];
  for (const position of positions) {
    for (const [label, w, h] of [['upload', 1240, 1754], ['upload rot270', 1754, 1240], ['slip', 1500, 1730]] as const) {
      const { qr, slip } = place(makeItem('x', w, h), { qrPosition: position });
      const inside =
        qr!.x >= slip.drawX - 1e-9 &&
        qr!.y >= slip.drawY - 1e-9 &&
        qr!.x + qr!.size <= slip.drawX + slip.drawW + 1e-9 &&
        qr!.y + qr!.size <= slip.drawY + slip.drawH + 1e-9;
      assert(inside, `${label} posisi ${position}: QR di dalam slip`);
    }
  }
}

// ---------------------------------------------------------------------------
console.log('\n7. Upload biasa tidak terpengaruh mechanism slip');
{
  const withCustomText = place(makeItem('upload.pdf', 1240, 1754), { qrText: 'NO-FAKTUR-99' });
  assert(withCustomText.resolved.qrText === 'NO-FAKTUR-99', 'teks QR global dipakai apa adanya', withCustomText.resolved.qrText);
}

console.log(`\n${failures === 0 ? 'SEMUA LULUS' : 'ADA YANG GAGAL'}: ${checks - failures}/${checks} pemeriksaan lolos`);
if (failures > 0) process.exit(1);