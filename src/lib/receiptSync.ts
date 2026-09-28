import { ReceiptItem } from './pdfEngine';

export interface MobileReceiptData {
  id: string;
  sourceFileName: string;
  dataUrl: string;
  width: number;
  height: number;
  rotation: number;
  watermarkText?: string;
  watermarkColor?: 'gray' | 'red' | 'blue' | 'green';
  watermarkPosYPct?: number;
  date: string;
  transactionId?: string;
  scaleMultiplier?: number;
}

const LOCAL_STORAGE_PREFIX = 'nota_mobile_data_';

/**
 * Saves receipt to server and local storage so it can be viewed on mobile devices
 */
export async function syncReceiptToServer(
  item: ReceiptItem,
  watermarkText?: string,
  watermarkColor?: 'gray' | 'red' | 'blue' | 'green',
  watermarkPosYPct?: number
): Promise<string> {
  const transactionId = item.id.replace(/-/g, '').slice(0, 8).toUpperCase();
  const payload: MobileReceiptData = {
    id: item.id,
    sourceFileName: item.sourceFileName,
    dataUrl: item.dataUrl,
    width: item.width,
    height: item.height,
    rotation: item.rotation,
    watermarkText: watermarkText || (item.customConfig?.watermarkMode !== 'disabled' ? item.customConfig?.watermarkText : undefined),
    watermarkColor: watermarkColor || (item.customConfig?.watermarkColor as any),
    watermarkPosYPct: watermarkPosYPct ?? item.customConfig?.watermarkPosYPct ?? 45,
    date: new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    transactionId: `#${transactionId}`,
    scaleMultiplier: item.customConfig?.scaleMultiplier ?? 1.0,
  };

  // Cache in localStorage
  try {
    localStorage.setItem(LOCAL_STORAGE_PREFIX + item.id, JSON.stringify(payload));
  } catch (e) {
    // LocalStorage quota might be full for large images, ignore
  }

  // Send to server
  try {
    await fetch('/api/receipts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('Gagal sinkronisasi nota ke server, menggunakan penyimpanan lokal:', err);
  }

  return getReceiptMobileUrl(item.id);
}

/**
 * Get the full mobile scanner URL for a receipt
 */
export function getReceiptMobileUrl(receiptId: string): string {
  if (typeof window === 'undefined') return `/?nota=${receiptId}`;
  return `${window.location.origin}/?nota=${receiptId}`;
}

/**
 * Retrieve receipt data by ID (first tries server API, then localStorage fallback)
 */
export async function fetchReceiptData(id: string): Promise<MobileReceiptData | null> {
  // 1. Try server API
  try {
    const res = await fetch(`/api/receipts/${id}`);
    if (res.ok) {
      const data = await res.json();
      return data as MobileReceiptData;
    }
  } catch (err) {
    console.warn('Gagal memuat dari server API, mencoba cache lokal...', err);
  }

  // 2. Try localStorage fallback
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_PREFIX + id);
    if (cached) {
      return JSON.parse(cached) as MobileReceiptData;
    }
  } catch (e) {
    console.error('Gagal membaca cache lokal:', e);
  }

  return null;
}
