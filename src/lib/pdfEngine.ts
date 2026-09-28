/**
 * PDF Engine using pdfjs-dist and jsPDF
 * Precision A4 Layout Engine supporting Portrait (2x4) and Landscape (4x2)
 * with specific inter-receipt Gap (margin antar-nota) and selectable 1-8 slot display.
 * Ultra-High Resolution (4.0x Scale) Lossless PNG Rendering.
 */
import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import { getQrDataUrl } from './qrCodeHelper';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

export type WatermarkMode = 'inherit' | 'custom' | 'disabled';
export type QrMode = 'inherit' | 'custom' | 'disabled';
export type QrPositionPreset = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center' | 'custom';

export interface ReceiptCustomConfig {
  // Skala ukuran khusus nota: 0.70 - 1.30 (1.0 = 100% normal)
  scaleMultiplier?: number;

  // Pangkas bawah mandiri (0 - 60%)
  customBottomCropPct?: number;

  // Rotasi khusus (0, 90, 180, 270)
  rotation?: number;

  // Watermark per file/nota
  watermarkMode?: WatermarkMode;
  watermarkText?: string;
  watermarkPosYPct?: number;
  watermarkColor?: 'gray' | 'red' | 'blue' | 'green';

  // QR Code per file/nota
  qrMode?: QrMode;
  qrText?: string;
  qrPosition?: QrPositionPreset;
  qrPosXPct?: number;
  qrPosYPct?: number;
  qrSizeMm?: number;
}

export interface ReceiptItem {
  id: string;
  sourceFileName: string;
  pageIndex: number;
  dataUrl: string; // active high-res display/print dataUrl (PNG)
  originalDataUrl: string; // pristine uncropped unrotated full-page source dataUrl (PNG)
  width: number;
  height: number;
  aspectRatio: number;
  originalWidth: number;
  originalHeight: number;
  rotation: number; // 0, 90, 180, 270
  isAutoTrimmed: boolean;
  customConfig?: ReceiptCustomConfig;
}

export type PaperOrientation = 'portrait' | 'landscape';

export interface GridOptions {
  paperOrientation: PaperOrientation; // 'portrait' (2x4) or 'landscape' (4x2)
  gapMm: number; // Jarak / margin antar-nota (gap) dalam mm (e.g. 0 - 15 mm)
  displayCount: number; // Berapa nota yang ditampilkan per lembar (1 - 8)
  paddingMm: number; // padding inside each cell (e.g. 1.5mm)
  fitMode: 'contain' | 'stretch';
  repeatSingle: boolean; // if single receipt, repeat up to displayCount
  dashedLineStyle: 'fine' | 'medium' | 'corners-only' | 'none';
  showPageNumbers: boolean;
  globalRotation: number; // 0, 90, 180, 270 degrees
  autoTrimWhite: boolean; // Auto-crop empty white margins/bottom
  customBottomCropPct: number; // manual bottom trim percentage (0 - 60%)

  // Watermark (Tanda Air) settings
  watermarkEnabled?: boolean; // Pilihan ada watermark atau tidak
  watermarkText?: string; // Teks watermark (contoh: LUNAS)
  watermarkPosYPct?: number; // Posisi vertikal % (default 45% agak ke atas di sisa gaji agar aman potong)
  watermarkPosXPct?: number; // Posisi horizontal % (default 50%)
  watermarkAngle?: number; // Sudut kemiringan teks dalam derajat (default -25°)
  watermarkOpacity?: number; // Transparansi 0.05 - 0.70 (default 0.25)
  watermarkFontSize?: number; // Ukuran font pt (default 24)
  watermarkColor?: 'gray' | 'red' | 'blue' | 'green'; // Pilihan warna stempel/watermark

  // QR Code settings
  qrEnabled?: boolean; // Pilihan ada QR Code atau tidak
  qrText?: string; // Teks kustom / tautan URL untuk QR Code
  qrPosition?: QrPositionPreset; // Posisi QR Code
  qrPosXPct?: number; // Posisi horizontal % jika kustom (0 - 100)
  qrPosYPct?: number; // Posisi vertikal % jika kustom (0 - 100)
  qrSizeMm?: number; // Ukuran QR Code dalam mm (default ~14mm)
}

// A4 Base Dimensions in mm
export const A4_PORTRAIT_WIDTH_MM = 210.0;
export const A4_PORTRAIT_HEIGHT_MM = 297.0;

// Legacy constants for backwards-compatibility
export const A4_WIDTH_MM = 210.0;
export const A4_HEIGHT_MM = 297.0;
export const COLS = 2;
export const ROWS = 4;
export const CELLS_PER_PAGE = 8;
export const CELL_WIDTH_MM = 105.0;
export const CELL_HEIGHT_MM = 74.25;

export interface SlotRect {
  x: number;
  y: number;
  width: number;
  height: number;
  col: number;
  row: number;
}

/**
 * Precision grid calculation with customizable inter-receipt gap (gapMm)
 * and paper orientation.
 */
export function calculateGridLayout(
  orientation: PaperOrientation = 'portrait',
  gapMm: number = 4.0,
  pageMarginMm: number = 4.0
) {
  const isLandscape = orientation === 'landscape';
  const pageWidth = isLandscape ? 297.0 : 210.0;
  const pageHeight = isLandscape ? 210.0 : 297.0;
  const cols = isLandscape ? 4 : 2;
  const rows = isLandscape ? 2 : 4;
  const cellsPerPage = cols * rows; // 8

  const safeGap = Math.max(0, gapMm);
  const safeMargin = Math.max(0, pageMarginMm);

  // Total gaps between adjacent notes
  const totalGapX = (cols - 1) * safeGap;
  const totalGapY = (rows - 1) * safeGap;

  // Available dimension for the note cells
  const availWidth = pageWidth - safeMargin * 2 - totalGapX;
  const availHeight = pageHeight - safeMargin * 2 - totalGapY;

  const cellWidth = Math.max(5, availWidth / cols);
  const cellHeight = Math.max(5, availHeight / rows);

  const getSlotRect = (slotIndex: number): SlotRect => {
    const col = slotIndex % cols;
    const row = Math.floor(slotIndex / cols);
    const x = safeMargin + col * (cellWidth + safeGap);
    const y = safeMargin + row * (cellHeight + safeGap);
    return {
      x,
      y,
      width: cellWidth,
      height: cellHeight,
      col,
      row,
    };
  };

  return {
    isLandscape,
    pageWidth,
    pageHeight,
    cols,
    rows,
    cellsPerPage,
    cellWidth,
    cellHeight,
    safeMargin,
    safeGap,
    getSlotRect,
  };
}

/**
 * Returns dynamic grid dimensions (backwards-compatible)
 */
export function getGridDimensions(orientation: PaperOrientation = 'portrait') {
  return calculateGridLayout(orientation, 4.0, 4.0);
}

/**
 * Intelligent Content Auto-Trim:
 * Scans canvas pixels and crops out large empty margins and empty bottom areas
 * while preserving safe internal padding so text, barcodes, and borders are never clipped.
 */
export function autoTrimCanvas(
  sourceCanvas: HTMLCanvasElement,
  paddingPx: number = 32
): HTMLCanvasElement {
  const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return sourceCanvas;

  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  // Step of 3 pixels for rapid analysis on ultra-high-res canvases
  const step = 3;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      // A pixel is content if not pure white/light-gray background
      if (a > 30 && (r < 242 || g < 242 || b < 242)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }

  // If no content or content is too small, return original
  if (!found || (maxX - minX < 100) || (maxY - minY < 100)) {
    return sourceCanvas;
  }

  // Add safe padding around detected content bounds
  minX = Math.max(0, minX - paddingPx);
  minY = Math.max(0, minY - paddingPx);
  maxX = Math.min(w, maxX + paddingPx);
  maxY = Math.min(h, maxY + paddingPx);

  const cropW = maxX - minX;
  const cropH = maxY - minY;

  // If content already fills more than 92% of both dimensions, no trim needed
  if (cropW > w * 0.92 && cropH > h * 0.92) {
    return sourceCanvas;
  }

  const cropped = document.createElement('canvas');
  cropped.width = cropW;
  cropped.height = cropH;
  const cropCtx = cropped.getContext('2d', { alpha: false })!;
  cropCtx.imageSmoothingEnabled = true;
  cropCtx.imageSmoothingQuality = 'high';
  cropCtx.fillStyle = '#FFFFFF';
  cropCtx.fillRect(0, 0, cropW, cropH);
  cropCtx.drawImage(sourceCanvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

  return cropped;
}

/**
 * Process a pristine image Data URL with auto-trim, manual bottom crop, and rotation.
 * All operations use integer pixel dimensions to preserve maximum text clarity.
 */
export function processReceiptImage(
  pristineDataUrl: string,
  autoTrim: boolean,
  bottomCropPct: number,
  rotationDegree: number
): Promise<{ dataUrl: string; width: number; height: number; aspectRatio: number; isTrimmed: boolean }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // 1. Draw to canvas
      let canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width);
      canvas.height = Math.round(img.height);
      let ctx = canvas.getContext('2d', { alpha: false })!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      let isTrimmed = false;

      // 2. Auto-Trim white space if enabled
      if (autoTrim) {
        const trimmed = autoTrimCanvas(canvas, 32);
        if (trimmed.width !== canvas.width || trimmed.height !== canvas.height) {
          canvas = trimmed;
          isTrimmed = true;
        }
      }

      // 3. Manual bottom crop if specified
      if (bottomCropPct > 0 && bottomCropPct < 80) {
        const keepH = Math.round(canvas.height * (1 - bottomCropPct / 100));
        const cropped = document.createElement('canvas');
        cropped.width = canvas.width;
        cropped.height = Math.max(50, keepH);
        const cCtx = cropped.getContext('2d', { alpha: false })!;
        cCtx.imageSmoothingEnabled = true;
        cCtx.imageSmoothingQuality = 'high';
        cCtx.fillStyle = '#FFFFFF';
        cCtx.fillRect(0, 0, cropped.width, cropped.height);
        cCtx.drawImage(canvas, 0, 0, canvas.width, cropped.height, 0, 0, canvas.width, cropped.height);
        canvas = cropped;
        isTrimmed = true;
      }

      // 4. Clean Rotation with integer pixel alignment
      const deg = ((rotationDegree % 360) + 360) % 360;
      if (deg !== 0) {
        const rotCanvas = document.createElement('canvas');
        const is90or270 = deg === 90 || deg === 270;
        rotCanvas.width = is90or270 ? canvas.height : canvas.width;
        rotCanvas.height = is90or270 ? canvas.width : canvas.height;

        const rCtx = rotCanvas.getContext('2d', { alpha: false })!;
        rCtx.imageSmoothingEnabled = true;
        rCtx.imageSmoothingQuality = 'high';
        rCtx.fillStyle = '#FFFFFF';
        rCtx.fillRect(0, 0, rotCanvas.width, rotCanvas.height);

        rCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
        rCtx.rotate((deg * Math.PI) / 180);
        // Integer coordinate placement prevents 0.5px subpixel blurring
        rCtx.drawImage(
          canvas,
          -Math.round(canvas.width / 2),
          -Math.round(canvas.height / 2)
        );
        canvas = rotCanvas;
      }

      const finalDataUrl = canvas.toDataURL('image/png');
      resolve({
        dataUrl: finalDataUrl,
        width: canvas.width,
        height: canvas.height,
        aspectRatio: canvas.width / canvas.height,
        isTrimmed,
      });
    };

    img.src = pristineDataUrl;
  });
}

/**
 * Extract pages from PDF File as ultra-high resolution lossless PNG data URLs.
 * Uses scale 4.0 (~300 DPI) for crystal clear, vector-grade print quality.
 */
export async function extractPagesFromPdf(
  file: File,
  autoTrim: boolean = true,
  onProgress?: (current: number, total: number) => void
): Promise<ReceiptItem[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const items: ReceiptItem[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    // Render at scale 4.0 for sharp, legible text and barcodes
    const scale = 4.0;
    const viewport = page.getViewport({ scale });

    let canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d', { alpha: false });

    if (!ctx) continue;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Fill pure white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport: viewport,
      canvas: canvas,
    } as any).promise;

    const originalDataUrl = canvas.toDataURL('image/png');
    const originalWidth = canvas.width;
    const originalHeight = canvas.height;

    // Apply auto-trim if enabled
    let activeDataUrl = originalDataUrl;
    let activeWidth = originalWidth;
    let activeHeight = originalHeight;
    let isTrimmed = false;

    if (autoTrim) {
      const trimmedCanvas = autoTrimCanvas(canvas, 32);
      if (trimmedCanvas.width !== canvas.width || trimmedCanvas.height !== canvas.height) {
        activeDataUrl = trimmedCanvas.toDataURL('image/png');
        activeWidth = trimmedCanvas.width;
        activeHeight = trimmedCanvas.height;
        isTrimmed = true;
      }
    }

    items.push({
      id: `${file.name}-p${i}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sourceFileName: file.name,
      pageIndex: i,
      dataUrl: activeDataUrl,
      originalDataUrl,
      width: activeWidth,
      height: activeHeight,
      aspectRatio: activeWidth / activeHeight,
      originalWidth,
      originalHeight,
      rotation: 0,
      isAutoTrimmed: isTrimmed,
    });

    if (onProgress) {
      onProgress(i, numPages);
    }
  }

  return items;
}

/**
 * Resolves effective configuration for a receipt, merging global GridOptions
 * with any individual item customConfig overrides (per-file / per-receipt).
 */
export function resolveReceiptSettings(
  item: ReceiptItem,
  globalOptions: GridOptions
) {
  const conf = item.customConfig;

  // 1. Watermark resolution
  let watermarkEnabled = globalOptions.watermarkEnabled ?? false;
  let watermarkText = globalOptions.watermarkText || 'LUNAS';
  let watermarkPosYPct = globalOptions.watermarkPosYPct ?? 45;
  let watermarkPosXPct = globalOptions.watermarkPosXPct ?? 50;
  let watermarkAngle = globalOptions.watermarkAngle ?? -25;
  let watermarkOpacity = globalOptions.watermarkOpacity ?? 0.25;
  let watermarkFontSize = globalOptions.watermarkFontSize ?? 24;
  let watermarkColor = globalOptions.watermarkColor || 'gray';

  if (conf?.watermarkMode === 'disabled') {
    watermarkEnabled = false;
  } else if (conf?.watermarkMode === 'custom') {
    watermarkEnabled = true;
    if (conf.watermarkText !== undefined) watermarkText = conf.watermarkText;
    if (conf.watermarkPosYPct !== undefined) watermarkPosYPct = conf.watermarkPosYPct;
    if (conf.watermarkColor !== undefined) watermarkColor = conf.watermarkColor;
  }

  // 2. QR Code resolution
  let qrEnabled = globalOptions.qrEnabled ?? false;
  let qrText = globalOptions.qrText || '';
  let qrPosition: QrPositionPreset = globalOptions.qrPosition || 'bottom-right';
  let qrPosXPct = globalOptions.qrPosXPct ?? 85;
  let qrPosYPct = globalOptions.qrPosYPct ?? 82;
  let qrSizeMm = globalOptions.qrSizeMm ?? 14;

  if (conf?.qrMode === 'disabled') {
    qrEnabled = false;
  } else if (conf?.qrMode === 'custom') {
    qrEnabled = true;
    if (conf.qrText !== undefined) qrText = conf.qrText;
    if (conf.qrPosition !== undefined) qrPosition = conf.qrPosition;
    if (conf.qrPosXPct !== undefined) qrPosXPct = conf.qrPosXPct;
    if (conf.qrPosYPct !== undefined) qrPosYPct = conf.qrPosYPct;
    if (conf.qrSizeMm !== undefined) qrSizeMm = conf.qrSizeMm;
  }

  // Automatic Mobile URL: If qrText is not explicitly set, auto-link to the mobile digital receipt viewer
  if (qrEnabled && !qrText.trim() && typeof window !== 'undefined') {
    qrText = `${window.location.origin}/?nota=${item.id}`;
  }

  // 3. Scale factor (e.g. 0.70 to 1.30, default 1.0)
  const scaleMultiplier = Math.max(0.6, Math.min(1.4, conf?.scaleMultiplier ?? 1.0));

  return {
    watermarkEnabled,
    watermarkText,
    watermarkPosYPct,
    watermarkPosXPct,
    watermarkAngle,
    watermarkOpacity,
    watermarkFontSize,
    watermarkColor,

    qrEnabled,
    qrText,
    qrPosition,
    qrPosXPct,
    qrPosYPct,
    qrSizeMm,

    scaleMultiplier,
  };
}

/**
 * Creates high-resolution lossless transparent PNG watermark overlay.
 * Uses the exact same 2D Canvas coordinate transform as the HTML CSS preview,
 * ensuring 100% pixel-perfect position and rotation sync between Preview and PDF.
 */
export function createWatermarkOverlayDataUrl(
  text: string,
  widthMm: number,
  heightMm: number,
  posXPct: number = 50,
  posYPct: number = 45,
  angleDeg: number = -25,
  opacity: number = 0.25,
  color: 'gray' | 'red' | 'blue' | 'green' = 'gray',
  fontSizePt: number = 24
): string {
  if (typeof document === 'undefined') return '';

  const scale = 3.5; // High-resolution rendering
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(50, Math.round(widthMm * 3.78 * scale));
  canvas.height = Math.max(50, Math.round(heightMm * 3.78 * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width * (Math.max(5, Math.min(95, posXPct)) / 100);
  const cy = canvas.height * (Math.max(5, Math.min(95, posYPct)) / 100);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((angleDeg * Math.PI) / 180);

  // Set color with opacity
  let r = 148, g = 163, b = 184;
  if (color === 'red') {
    r = 220; g = 38; b = 38;
  } else if (color === 'blue') {
    r = 37; g = 99; b = 235;
  } else if (color === 'green') {
    r = 5; g = 150; b = 105;
  }
  const safeOpacity = Math.max(0.05, Math.min(0.9, opacity));
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${safeOpacity})`;

  // Responsive font size based on note height
  const pixelFontSize = Math.round(
    fontSizePt * 1.333 * scale * (heightMm / 65.0)
  );
  ctx.font = `bold ${Math.max(16, pixelFontSize)}px Helvetica, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.trim().toUpperCase(), 0, 0);
  ctx.restore();

  return canvas.toDataURL('image/png');
}

/**
 * Precision millimeter positioning calculation for QR code inside receipt bounds
 */
export function calculateQrPositionMm(
  position: QrPositionPreset,
  drawX: number,
  drawY: number,
  drawW: number,
  drawH: number,
  sizeMm: number,
  customXPct: number = 85,
  customYPct: number = 80
): { x: number; y: number; size: number } {
  const safeSize = Math.max(7, Math.min(sizeMm, drawW * 0.45, drawH * 0.45));
  const marginMm = 2.0;

  let x = drawX + drawW - safeSize - marginMm;
  let y = drawY + drawH - safeSize - marginMm;

  if (position === 'top-right') {
    x = drawX + drawW - safeSize - marginMm;
    y = drawY + marginMm;
  } else if (position === 'top-left') {
    x = drawX + marginMm;
    y = drawY + marginMm;
  } else if (position === 'bottom-left') {
    x = drawX + marginMm;
    y = drawY + drawH - safeSize - marginMm;
  } else if (position === 'center') {
    x = drawX + (drawW - safeSize) / 2;
    y = drawY + (drawH - safeSize) / 2;
  } else if (position === 'custom') {
    x = drawX + (drawW - safeSize) * (customXPct / 100);
    y = drawY + (drawH - safeSize) * (customYPct / 100);
  }

  return { x, y, size: safeSize };
}

/**
 * Build jsPDF Document supporting Portrait (2x4) and Landscape (4x2)
 * using the specific inter-receipt gap (gapMm) and user-selected displayCount (1 to 8).
 * Supports per-receipt customization, watermark, and QR Code generation.
 */
export async function buildA4GridPdf(
  receipts: ReceiptItem[],
  options: GridOptions
): Promise<jsPDF> {
  const gapMm = typeof options.gapMm === 'number' ? options.gapMm : 4.0;
  const layout = calculateGridLayout(options.paperOrientation || 'portrait', gapMm, 4.0);

  const doc = new jsPDF({
    orientation: layout.isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: false, // Don't lossy-compress images to preserve crystal clear text
  });

  let activeReceipts = [...receipts];

  if (activeReceipts.length === 0) {
    return doc;
  }

  // Determine how many slots to display (1 to 8, default 8)
  const effectiveCount = Math.min(
    layout.cellsPerPage,
    Math.max(1, typeof options.displayCount === 'number' ? options.displayCount : 8)
  );

  // If repeatSingle is enabled and there's 1 receipt, duplicate to fill up to effectiveCount slots
  if (options.repeatSingle && activeReceipts.length === 1) {
    const single = activeReceipts[0];
    activeReceipts = Array.from({ length: effectiveCount }, () => single);
  }

  // Calculate pages based on effectiveCount per page
  const totalPages = Math.max(1, Math.ceil(activeReceipts.length / effectiveCount));

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    if (pageIdx > 0) {
      doc.addPage('a4', layout.isLandscape ? 'landscape' : 'portrait');
    }

    const startIdx = pageIdx * effectiveCount;
    const pageItems = activeReceipts.slice(startIdx, startIdx + effectiveCount);

    // 1. Draw receipt images for each active slot
    for (let slot = 0; slot < effectiveCount; slot++) {
      const slotRect = layout.getSlotRect(slot);
      const item = pageItems[slot];

      if (item) {
        const resolved = resolveReceiptSettings(item, options);
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
            // Gambar lebih lebar: samakan lebar, tengahkan vertikal
            drawW = availW;
            drawH = availW / imgAspect;
            drawY = slotRect.y + pad + (availH - drawH) / 2;
          } else {
            // Gambar lebih tinggi: samakan tinggi, tengahkan horizontal
            drawH = availH;
            drawW = availH * imgAspect;
            drawX = slotRect.x + pad + (availW - drawW) / 2;
          }
        }

        // Apply scale multiplier if customized per item
        if (resolved.scaleMultiplier && resolved.scaleMultiplier !== 1.0) {
          const scaledW = drawW * resolved.scaleMultiplier;
          const scaledH = drawH * resolved.scaleMultiplier;
          drawX = drawX + (drawW - scaledW) / 2;
          drawY = drawY + (drawH - scaledH) / 2;
          drawW = scaledW;
          drawH = scaledH;
        }

        // Draw image cleanly without any jsPDF matrix bugs using lossless PNG
        try {
          doc.addImage(
            item.dataUrl,
            'PNG',
            drawX,
            drawY,
            drawW,
            drawH,
            undefined,
            'NONE' // Maximum sharpness, zero downsampling compression
          );
        } catch (err) {
          console.error('Gagal menggambar nota ke PDF:', err);
        }

        // Draw Watermark (Tanda Air) if enabled
        if (resolved.watermarkEnabled && resolved.watermarkText?.trim()) {
          try {
            const wmPng = createWatermarkOverlayDataUrl(
              resolved.watermarkText,
              drawW,
              drawH,
              resolved.watermarkPosXPct ?? 50,
              resolved.watermarkPosYPct ?? 45,
              resolved.watermarkAngle ?? -25,
              resolved.watermarkOpacity ?? 0.25,
              resolved.watermarkColor || 'gray',
              resolved.watermarkFontSize ?? 24
            );

            if (wmPng) {
              doc.addImage(
                wmPng,
                'PNG',
                drawX,
                drawY,
                drawW,
                drawH,
                undefined,
                'NONE'
              );
            }
          } catch (wmErr) {
            console.error('Gagal menggambar watermark pada nota:', wmErr);
          }
        }

        // Draw QR Code if enabled for this receipt
        if (resolved.qrEnabled && resolved.qrText?.trim()) {
          try {
            const qrDataUrl = await getQrDataUrl(resolved.qrText.trim());
            if (qrDataUrl) {
              const { x: qrX, y: qrY, size: qrSize } = calculateQrPositionMm(
                resolved.qrPosition,
                drawX,
                drawY,
                drawW,
                drawH,
                resolved.qrSizeMm,
                resolved.qrPosXPct,
                resolved.qrPosYPct
              );

              // Small white backing for high contrast readability
              doc.setFillColor(255, 255, 255);
              doc.setDrawColor(205, 210, 220);
              doc.setLineWidth(0.2);
              doc.roundedRect(qrX - 0.4, qrY - 0.4, qrSize + 0.8, qrSize + 0.8, 0.6, 0.6, 'FD');

              doc.addImage(
                qrDataUrl,
                'PNG',
                qrX,
                qrY,
                qrSize,
                qrSize,
                undefined,
                'NONE'
              );
            }
          } catch (qrErr) {
            console.error('Gagal menambahkan QR code ke PDF:', qrErr);
          }
        }
      }
    }

    // 2. Draw Cutting Guidelines (only if user explicitly selected lines in settings)
    if (options.dashedLineStyle !== 'none') {
      drawUnifiedCuttingGridWithGap(doc, options.dashedLineStyle, layout, effectiveCount);
    }

    // 3. Footer indicator (only if explicitly enabled)
    if (options.showPageNumbers) {
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `edit-pdf • Halaman ${pageIdx + 1} dari ${totalPages} (${effectiveCount} Kotak) • Cetak Skala 100% (Actual Size)`,
        layout.pageWidth / 2,
        layout.pageHeight - 2.5,
        { align: 'center' }
      );
    }
  }

  return doc;
}

/**
 * Draw Cutting Grid Lines taking into account inter-receipt gap
 */
function drawUnifiedCuttingGridWithGap(
  doc: jsPDF,
  style: 'fine' | 'medium' | 'corners-only',
  layout: ReturnType<typeof calculateGridLayout>,
  effectiveCount: number
) {
  doc.setDrawColor(180, 180, 180);

  const {
    cols,
    rows,
    pageWidth,
    pageHeight,
    cellWidth,
    cellHeight,
    safeGap,
    safeMargin,
  } = layout;

  if (style === 'corners-only') {
    doc.setLineWidth(0.3);
    const cornerSize = 4.0;
    for (let c = 1; c < cols; c++) {
      const x = safeMargin + c * cellWidth + (c - 0.5) * safeGap;
      for (let r = 1; r < rows; r++) {
        const y = safeMargin + r * cellHeight + (r - 0.5) * safeGap;
        doc.line(x - cornerSize, y, x + cornerSize, y);
        doc.line(x, y - cornerSize, x, y + cornerSize);
      }
    }
    return;
  }

  const lineWidth = style === 'medium' ? 0.35 : 0.2;
  doc.setLineWidth(lineWidth);
  doc.setLineDashPattern([2.5, 2.5], 0);

  // Vertical column dividers through the center of gaps
  for (let c = 1; c < cols; c++) {
    const x = safeMargin + c * cellWidth + (c - 0.5) * safeGap;
    doc.line(x, safeMargin, x, pageHeight - safeMargin);
  }

  // Horizontal row dividers through the center of gaps
  for (let r = 1; r < rows; r++) {
    const y = safeMargin + r * cellHeight + (r - 0.5) * safeGap;
    doc.line(safeMargin, y, pageWidth - safeMargin, y);
  }

  // Outer Border around content area
  doc.rect(safeMargin, safeMargin, pageWidth - safeMargin * 2, pageHeight - safeMargin * 2);
  doc.setLineDashPattern([], 0);
}

/**
 * Generates and downloads a clean single-receipt PDF sized perfectly for mobile viewing
 * and direct mobile printing (e.g. 80mm width standard thermal / mobile format).
 */
export async function downloadSingleReceiptPdf(
  receipt: {
    id: string;
    sourceFileName: string;
    dataUrl: string;
    width: number;
    height: number;
    rotation?: number;
    watermarkText?: string;
    watermarkColor?: 'gray' | 'red' | 'blue' | 'green';
    watermarkPosYPct?: number;
  },
  fileName?: string
): Promise<jsPDF> {
  const aspect = receipt.width / receipt.height;
  const pdfWidthMm = 80;
  const pdfHeightMm = Math.round(pdfWidthMm / aspect);

  const doc = new jsPDF({
    orientation: pdfHeightMm > pdfWidthMm ? 'portrait' : 'landscape',
    unit: 'mm',
    format: [pdfWidthMm, Math.max(40, pdfHeightMm)],
  });

  doc.addImage(
    receipt.dataUrl,
    'JPEG',
    0,
    0,
    pdfWidthMm,
    pdfHeightMm,
    undefined,
    'FAST'
  );

  if (receipt.watermarkText?.trim()) {
    try {
      const wmPng = createWatermarkOverlayDataUrl(
        receipt.watermarkText,
        pdfWidthMm,
        pdfHeightMm,
        50,
        receipt.watermarkPosYPct ?? 45,
        -25,
        0.28,
        receipt.watermarkColor || 'gray',
        22
      );
      if (wmPng) {
        doc.addImage(wmPng, 'PNG', 0, 0, pdfWidthMm, pdfHeightMm, undefined, 'NONE');
      }
    } catch (e) {
      console.error('Error drawing watermark on single PDF:', e);
    }
  }

  const safeName =
    fileName ||
    `Nota_${receipt.sourceFileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_') || receipt.id.slice(0, 8)}.pdf`;
  doc.save(safeName);
  return doc;
}

