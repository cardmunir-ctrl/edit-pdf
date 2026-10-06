import React from 'react';

export interface SlipGajiItemDetail {
  name: string;
  qty: number;
  rate: number;
  maxQty?: number;
  parent_session_id?: string;
}

export interface SlipGajiItem {
  id: string;
  tanggal: string;
  worker_id?: string;
  worker_name: string;
  items_detail: SlipGajiItemDetail[];
  gaji_pokok?: number;
  sisa_gaji: number;
  potongan: number;
  total: number;
  status?: string;
  tipe?: string;
  parent_session_id?: string;
  created_at?: string;
}

const cleanNameDisplay = (name: string) => {
  if (!name) return "";
  return name.replace(/"/g, '').split(' - ')[0].split('(')[0].trim();
};

const formatTanggal = (tanggal: string) =>
  new Date(tanggal).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const sumSubtotal = (items: SlipGajiItemDetail[]) =>
  (items || []).reduce((s, d) => s + ((d.qty || 0) * (d.rate || 0)), 0);

interface SlipGajiBukuProduksiTemplateProps {
  item: SlipGajiItem;
}

export const SlipGajiBukuProduksiTemplate: React.FC<SlipGajiBukuProduksiTemplateProps> = ({ item }) => {
  const details = item.items_detail && Array.isArray(item.items_detail) ? item.items_detail : [];

  return (
    <div id="receipt-template-static" className="bg-white p-10 w-[600px] text-slate-900 font-sans">
      <div className="flex justify-end items-start border-b-2 border-slate-900 pb-4 mb-6">
        <div className="text-right">
          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">ID Transaksi</div>
          <div className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded">#{item.id.substring(0, 8).toUpperCase()}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <span className="text-[8px] font-black text-slate-400 uppercase block tracking-widest">Penerima</span>
          <span className="text-sm font-black border-b border-slate-100 pb-1 block">{cleanNameDisplay(item.worker_name)}</span>
        </div>
        <div className="text-right">
          <span className="text-[8px] font-black text-slate-400 uppercase block tracking-widest">Tanggal</span>
          <span className="text-sm font-black border-b border-slate-100 pb-1 block">{formatTanggal(item.tanggal)}</span>
        </div>
      </div>
      <div className="mb-6">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-slate-900">
              <th className="text-left py-2 text-[8px] font-black text-slate-400 uppercase">RINCIAN KERJA</th>
              <th className="text-center py-2 text-[8px] font-black text-slate-400 uppercase">UPAH</th>
              <th className="text-center py-2 text-[8px] font-black text-slate-400 uppercase">QTY</th>
              <th className="text-right py-2 text-[8px] font-black text-slate-400 uppercase">SUBTOTAL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {details.length > 0 ? details.map((d, i) => (
              <tr key={i}>
                <td className="py-2.5 text-[10px] font-bold text-slate-700">{cleanNameDisplay(d.name)}</td>
                <td className="py-2.5 text-center text-[10px] font-black text-slate-900">Rp {(d.rate || 0).toLocaleString()}</td>
                <td className="py-2.5 text-center text-[10px] font-black text-slate-900">{d.qty}</td>
                <td className="py-2.5 text-right text-[10px] font-black text-slate-900">Rp {((d.qty || 0) * (d.rate || 0)).toLocaleString()}</td>
              </tr>
            )) : <tr><td colSpan={4} className="py-4 text-[10px] font-bold text-slate-400 italic">Manual / Lainnya</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end pt-2">
        <div className="w-1/2 space-y-2">
          <div className="flex justify-between text-[9px] font-bold text-slate-600 border-t border-slate-100 pt-2">
            <span>Sisa Gaji Produksi</span>
            <span>Rp {sumSubtotal(details).toLocaleString()}</span>
          </div>
          {item.sisa_gaji > 0 && (
            <div className="flex justify-between text-[9px] font-bold text-teal-700 bg-teal-50/50 px-2 py-1 rounded">
              <span>Tambah Sisa Gaji</span>
              <span>+ Rp {item.sisa_gaji.toLocaleString()}</span>
            </div>
          )}
          {item.potongan > 0 && (
            <div className="flex justify-between text-[9px] font-bold text-rose-500 bg-rose-50/50 px-2 py-1 rounded">
              <span>Potongan Kasbon</span>
              <span>- Rp {item.potongan.toLocaleString()}</span>
            </div>
          )}
          <div className="border-t-2 border-slate-900 pt-3 flex justify-between items-center font-black">
            <div className="flex flex-col">
              <span className="text-[8px] uppercase tracking-widest text-slate-400">Total Gaji Bersih</span>
            </div>
            <span className="text-xl text-slate-900">Rp {(item.total || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlipGajiBukuProduksiTemplate;
