import { ReceiptItem } from './pdfEngine';

export interface ProductionSlipData {
  id: string;
  slipNumber: string;
  employeeName: string;
  department: string;
  period: string;
  date: string;
  workDays?: number | string;
  basicSalary?: number;
  pieceRateSalary?: number; // Upah Borongan / Jahit
  overtimeSalary?: number; // Lembur
  bonus?: number; // Bonus / Tunjangan
  deductions?: number; // Potongan / Kasbon
  totalSalary: number; // Total Sisa Gaji Diterima
  notes?: string;
  companyName?: string;
}

export function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Converts a number to Indonesian terbilang words
 */
export function terbilangRupiah(n: number): string {
  const bilangan = [
    '',
    'Satu',
    'Dua',
    'Tiga',
    'Empat',
    'Lima',
    'Enam',
    'Tujuh',
    'Delapan',
    'Sembilan',
    'Sepuluh',
    'Sebelas',
  ];

  function convert(x: number): string {
    if (x < 12) return bilangan[x];
    if (x < 20) return convert(x - 10) + ' Belas';
    if (x < 100) return convert(Math.floor(x / 10)) + ' Puluh ' + convert(x % 10);
    if (x < 200) return 'Seratus ' + convert(x - 100);
    if (x < 1000) return convert(Math.floor(x / 100)) + ' Ratus ' + convert(x % 100);
    if (x < 2000) return 'Seribu ' + convert(x - 1000);
    if (x < 1000000) return convert(Math.floor(x / 1000)) + ' Ribu ' + convert(x % 1000);
    if (x < 1000000000) return convert(Math.floor(x / 1000000)) + ' Juta ' + convert(x % 1000000);
    return convert(Math.floor(x / 1000000000)) + ' Miliar ' + convert(x % 1000000000);
  }

  const result = convert(Math.round(Math.abs(n))).trim();
  return result ? `${result} Rupiah` : 'Nol Rupiah';
}

/**
 * Draws an authentic Indonesian "Slip Gaji Buku Produksi" on a 2D Canvas
 * Sized 1200 x 820 px (approx 105 mm x 72 mm proportion for 8-up A4)
 */
export function renderSlipToDataUrl(data: ProductionSlipData): string {
  if (typeof document === 'undefined') return '';

  const width = 1200;
  const height = 820;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background Paper
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Border Outer Box
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  // Inner Accent Border
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1;
  ctx.strokeRect(25, 25, width - 50, height - 50);

  // Header Banner
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(26, 26, width - 52, 90);

  // Header Titles
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText((data.companyName || 'BUKU PRODUKSI KONVEKSI').toUpperCase(), 48, 65);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 20px Helvetica, Arial, sans-serif';
  ctx.fillText('SLIP LAPORAN GAJI & UPAH BORONGAN', 48, 96);

  // Right Header: No Slip & Date
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'normal 18px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`NO: ${data.slipNumber}`, width - 50, 60);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 18px Helvetica, Arial, sans-serif';
  ctx.fillText(`TGL: ${data.date}`, width - 50, 92);

  // Employee Info Box
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(36, 130, width - 72, 75);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.strokeRect(36, 130, width - 72, 75);

  // Left Column Info
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 18px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Nama Karyawan :', 52, 160);
  ctx.fillText('Bagian / Divisi :', 52, 190);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 22px Helvetica, Arial, sans-serif';
  ctx.fillText(data.employeeName.toUpperCase(), 215, 160);

  ctx.fillStyle = '#2563eb';
  ctx.font = 'bold 19px Helvetica, Arial, sans-serif';
  ctx.fillText(data.department || 'Produksi', 215, 190);

  // Right Column Info
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 18px Helvetica, Arial, sans-serif';
  ctx.fillText('Periode :', 700, 160);
  if (data.workDays) {
    ctx.fillText('Kehadiran :', 700, 190);
  }

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 19px Helvetica, Arial, sans-serif';
  ctx.fillText(data.period || '-', 800, 160);
  if (data.workDays) {
    ctx.fillText(`${data.workDays} Hari Kerja`, 820, 190);
  }

  // Earnings & Deductions Table Header
  const tableY = 225;
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(36, tableY, width - 72, 34);
  ctx.strokeStyle = '#94a3b8';
  ctx.strokeRect(36, tableY, width - 72, 34);

  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 18px Helvetica, Arial, sans-serif';
  ctx.fillText('RINCIAN PENDAPATAN & UPAH', 52, tableY + 23);
  ctx.textAlign = 'right';
  ctx.fillText('JUMLAH (RP)', width - 52, tableY + 23);

  // Table Rows
  let curY = tableY + 62;
  const rowHeight = 36;

  const rows: { label: string; amount: number; isDeduction?: boolean }[] = [];

  if (data.basicSalary && data.basicSalary > 0) {
    rows.push({ label: 'Gaji Pokok / Harian', amount: data.basicSalary });
  }
  if (data.pieceRateSalary && data.pieceRateSalary > 0) {
    rows.push({ label: 'Upah Borongan Jahit / Potong', amount: data.pieceRateSalary });
  } else if (!data.basicSalary) {
    rows.push({
      label: 'Upah Hasil Produksi Borongan',
      amount: data.totalSalary + (data.deductions || 0) - (data.overtimeSalary || 0) - (data.bonus || 0),
    });
  }
  if (data.overtimeSalary && data.overtimeSalary > 0) {
    rows.push({ label: 'Upah Lembur (Overtime)', amount: data.overtimeSalary });
  }
  if (data.bonus && data.bonus > 0) {
    rows.push({ label: 'Bonus Kerajinan / Target', amount: data.bonus });
  }
  if (data.deductions && data.deductions > 0) {
    rows.push({ label: 'Potongan Kasbon / Pinjaman / Absen', amount: data.deductions, isDeduction: true });
  }

  rows.forEach((r, idx) => {
    ctx.fillStyle = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
    ctx.fillRect(36, curY - 26, width - 72, rowHeight);

    ctx.textAlign = 'left';
    ctx.fillStyle = r.isDeduction ? '#b91c1c' : '#334155';
    ctx.font = r.isDeduction ? 'bold 18px Helvetica, Arial, sans-serif' : 'normal 18px Helvetica, Arial, sans-serif';
    ctx.fillText(`${idx + 1}. ${r.label}`, 52, curY);

    ctx.textAlign = 'right';
    ctx.fillStyle = r.isDeduction ? '#b91c1c' : '#0f172a';
    ctx.font = 'bold 18px monospace';
    const amtStr = r.isDeduction ? `(${formatRupiah(r.amount)})` : formatRupiah(r.amount);
    ctx.fillText(amtStr, width - 52, curY);

    curY += rowHeight;
  });

  // Table Line Separator
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(36, curY - 10);
  ctx.lineTo(width - 36, curY - 10);
  ctx.stroke();

  // Total Take-home Pay (Total Sisa Gaji / Gaji Bersih)
  const totalY = Math.max(curY + 12, 480);

  // Total Box
  ctx.fillStyle = '#eff6ff';
  ctx.fillRect(36, totalY, width - 72, 60);
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.strokeRect(36, totalY, width - 72, 60);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 22px Helvetica, Arial, sans-serif';
  ctx.fillText('TOTAL DITERIMA (SISA GAJI BERSIH) :', 52, totalY + 38);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#1d4ed8';
  ctx.font = 'bold 32px monospace';
  ctx.fillText(formatRupiah(data.totalSalary), width - 52, totalY + 41);

  // Terbilang Section
  const terbilangY = totalY + 88;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748b';
  ctx.font = 'italic 16px Helvetica, Arial, sans-serif';
  const terbilangStr = `Terbilang: "# ${terbilangRupiah(data.totalSalary)} #"`;
  ctx.fillText(terbilangStr, 40, terbilangY);

  // Signatures Section
  const signY = terbilangY + 35;

  ctx.textAlign = 'center';
  ctx.font = 'normal 17px Helvetica, Arial, sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText('Karyawan / Penerima,', 220, signY);
  ctx.fillText('Disetujui Admin Produksi,', width - 220, signY);

  // Signature Dots line
  ctx.strokeStyle = '#94a3b8';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(120, signY + 68);
  ctx.lineTo(320, signY + 68);
  ctx.moveTo(width - 320, signY + 68);
  ctx.lineTo(width - 120, signY + 68);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = 'bold 16px Helvetica, Arial, sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(`( ${data.employeeName} )`, 220, signY + 86);
  ctx.fillText('( Bag. Keuangan / Kasir )', width - 220, signY + 86);

  // Bottom Footer Bar
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(26, height - 48, width - 52, 26);
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'normal 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    'Dokumen ini dicetak otomatis dari Sistem Buku Produksi & siap dipotong lembar A4 (8 slip/lembar)',
    width / 2,
    height - 31
  );

  return canvas.toDataURL('image/jpeg', 0.92);
}

/**
 * Converts ProductionSlipData to a ReceiptItem ready for the grid
 */
export function convertSlipToReceiptItem(
  data: ProductionSlipData,
  index: number
): ReceiptItem {
  const dataUrl = renderSlipToDataUrl(data);
  return {
    id: data.id || `bp-slip-${Date.now()}-${index}`,
    sourceFileName: `Slip_${data.employeeName.replace(/\s+/g, '_')}_${data.slipNumber}`,
    dataUrl,
    originalDataUrl: dataUrl,
    width: 1200,
    height: 820,
    aspectRatio: 1200 / 820,
    originalWidth: 1200,
    originalHeight: 820,
    pageIndex: index + 1,
    rotation: 0,
    isAutoTrimmed: true,
    customConfig: {
      scaleMultiplier: 1.0,
      watermarkMode: 'inherit',
      watermarkText: 'LUNAS',
      watermarkPosYPct: 45, // exact vertical center over total / details
      qrMode: 'inherit',
    },
  };
}
