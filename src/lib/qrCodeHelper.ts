import QRCode from 'qrcode';

const qrCache = new Map<string, string>();

export interface QrRenderOptions {
  margin?: number;
  width?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

/**
 * Generate high-contrast, lossless PNG Data URL from custom text / URL
 * with in-memory caching for zero rendering lag.
 */
export async function getQrDataUrl(
  text: string,
  options?: QrRenderOptions
): Promise<string> {
  if (!text || !text.trim()) return '';
  const clean = text.trim();
  const width = options?.width || 256;
  const margin = options?.margin ?? 1;
  const ec = options?.errorCorrectionLevel || 'M';
  const cacheKey = `${clean}_${width}_${margin}_${ec}`;

  if (qrCache.has(cacheKey)) {
    return qrCache.get(cacheKey)!;
  }

  try {
    const url = await QRCode.toDataURL(clean, {
      margin,
      width,
      errorCorrectionLevel: ec,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    qrCache.set(cacheKey, url);
    return url;
  } catch (err) {
    console.error('Gagal membuat QR Code:', err);
    return '';
  }
}
