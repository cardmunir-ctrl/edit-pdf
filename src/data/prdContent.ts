export const PRD_CONTENT_MD = `# Product Requirements Document (PRD)
## Proyek: NotaGrid A4 - Automated Receipt Layout & Print Generator

---

### 1. Ringkasan Eksekutif (Executive Summary)
**NotaGrid A4** adalah aplikasi web utilitas cetak presisi yang dirancang untuk mengonversi berkas nota/faktur PDF berukuran bebas (struk thermal POS, nota Tokopedia/Shopee/TikTok Shop, invoice B2B) ke dalam format cetak lembar standar **A4 (Potret/Portrait)**. Di dalam lembar A4, dokumen disusun secara otomatis menjadi **8 kotak berukuran A8 Lanskap (2 kolom x 4 baris)** yang dilengkapi **garis potong putus-putus tipis (dashed cutting guides)** untuk mempermudah pemotongan manual dengan gunting atau cutter.

---

### 2. Latar Belakang & Masalah (Problem Statement)
* **Pemborosan Kertas (Paper Waste):** Banyak sistem POS atau marketplace menghasilkan faktur PDF ukuran thermal (misal 58mm atau 80mm) atau 1/4 kuarto. Ketika pemilik usaha mencetak menggunakan printer kantor/rumahan biasa (kertas A4), 1 lembar A4 seringkali hanya memuat 1 struk kecil. Hal ini memboroskan hingga 87.5% kertas.
* **Proses Manual Memakan Waktu:** Pelaku UMKM, admin logistik, dan kasir harus meng-copy-paste gambar struk ke Microsoft Word atau Canva satu per satu, mengatur ukuran, menyelaraskan margin, dan membuat garis potong manual.
* **Risiko Privasi Data:** Mengunggah nota belanja berisi data pelanggan ke layanan konverter PDF publik sering melanggar kerahasiaan data.

---

### 3. Tujuan Produk & Metrik Keberhasilan (Goals & OKRs)
* **Goal 1:** Menghemat biaya kertas dan toner operasional UMKM hingga 800% (1 lembar A4 menampung 8 nota).
* **Goal 2:** Menyederhanakan alur kerja dari 10 menit manual menjadi **kurang dari 5 detik**.
* **Goal 3 (Presisi Cetak):** Menghasilkan dokumen PDF 100% skala aktual tanpa distorsi teks, barcode, atau QR code.
* **Key Metrics:**
  - Waktu pemrosesan rata-rata < 2 detik per lembar.
  - Zero-data leak: Pemrosesan 100% di browser (client-side) atau stateless memory di backend.
  - Rating kepuasan keterbacaan hasil cetak > 98%.

---

### 4. Sasaran Pengguna (Target Personas)
1. **Admin Toko Online / E-commerce:** Mencetak puluhan label dan nota pesanan setiap hari untuk diselipkan ke dalam paket pengiriman.
2. **Kasir & Pelaku Usaha Mikro/Kafe:** Menggunakan printer desktop standar untuk mencetak arsip struk transaksi harian.
3. **Akuntan / Finance Staff:** Mencetak bukti pengeluaran dan kwitansi kecil untuk lampiran voucher klaim kas bon (reimbursement).

---

### 5. Spesifikasi Teknis & Matematika Tata Letak (Grid Layout Specifications)
* **Ukuran Dokumen Target:** ISO 216 **A4 Portrait** (210.0 mm x 297.0 mm).
* **Konfigurasi Grid:**
  - Jumlah Kolom: 2 kolom (horizontal)
  - Jumlah Baris: 4 baris (vertikal)
  - Total Kapasitas per Lembar: $2 \\times 4 = 8$ sel A8 Lanskap.
* **Dimensi Setiap Sel (A8 Lanskap):**
  - **Lebar Sel ($W_{cell}$):** $210\\text{ mm} \\div 2 = 105.0\\text{ mm}$
  - **Tinggi Sel ($H_{cell}$):** $297\\text{ mm} \\div 4 = 74.25\\text{ mm}$
* **Spesifikasi Garis Potong (Crop Marks):**
  - Pola Garis: Dashed Line (putus-putus), stroke width 0.2 mm.
  - Panjang strip: 2.0 mm garis, 1.5 mm celah kosong (spacing).
  - Warna: Abu-abu netral (#8c96a0) agar tidak mengaburkan teks nota namun jelas terlihat mata saat dipotong.
* **Batched Pagination:**
  - Jika pengguna mengunggah berkas dengan $N$ halaman nota, sistem secara otomatis menghasilkan $\\lceil N / 8 \\rceil$ lembar A4.
* **Fitur Gandakan (Repeat Mode):**
  - Jika 1 nota diunggah dan opsi "Ulangi 8x" aktif, sistem menduplikat nota tersebut memenuhi ke-8 slot lembar A4 (ideal untuk cetak voucher diskon / kupon massal).

---

### 6. Persyaratan Fungsional (Functional Requirements)
1. **Upload & Ingestion:**
   - Mendukung drag-and-drop file PDF nota tunggal atau multi-halaman.
   - Mendukung gambar nota (PNG/JPG/WEBP).
   - Menyediakan tombol "Uji Coba dengan Contoh Nota Kasir" langsung tanpa perlu file lokal.
2. **Pemrosesan & Rendering:**
   - Menggunakan engine jsPDF dan PDF.js untuk rendering vektor & raster resolusi tinggi (300 DPI).
   - Opsi penyesuaian:
     - Mode Pengepasan: *Fit Inside (Contain)* dengan proteksi aspek rasio, atau *Fill/Stretch*.
     - Auto-Rotate: Otomatis mendeteksi nota berorientasi potret dan memutar 90° agar memanfaatkan lebar kotak 105mm.
     - Pengatur Padding Margin Sel (0mm s/d 5mm) agar teks tidak terpotong saat digunting.
     - Pilihan gaya garis potong: Garis Putus-putus Penuh, Garis Putus-putus Sedang, Sudut Siku Saja (Corner Marks), atau Polos.
3. **Pratinjau Interaktif (Live Preview):**
   - Tampilan visual langsung lembar A4 dengan navigasi halaman (Lembar 1 dari N).
   - Zoom in / Zoom out interaktif.
   - Penomoran slot (Slot 1 s/d Slot 8) untuk verifikasi urutan cetak.
4. **Output & Distribusi:**
   - Tombol "Unduh PDF Siap Cetak (A4 jsPDF)" yang langsung mendownload file PDF siap cetak.
   - Tombol "Cetak Langsung" (Instant Print dialog) dengan pengaturan default 100% Actual Size.

---

### 7. Persyaratan Non-Fungsional (Non-Functional Requirements)
* **Kinerja:** Waktu konversi kurang dari 2 detik untuk dokumen hingga 24 halaman.
* **Keamanan & Privasi:** Pemrosesan client-side memastikan file PDF tidak pernah diunggah atau disimpan di server pihak ketiga.
* **Aksesibilitas & Responsivitas:** Desain ramah pengguna di desktop, tablet, dan smartphone.
* **Kompatibilitas:** Kompatibel dengan semua browser modern (Google Chrome, Edge, Safari, Firefox).

---

### 8. Panduan Penggunaan Cetak (Printing Instructions)
1. Buka file PDF hasil unduhan dengan Adobe Acrobat Reader atau Browser Chrome.
2. Pilih menu **Print (Ctrl + P / Cmd + P)**.
3. Pada pengaturan ukuran kertas, pilih **A4**.
4. **PENTING:** Pada pilihan skala (Scale), pilih **"Actual Size" (Ukuran Sebenarnya / 100%)**, JANGAN memilih "Fit to Page" atau "Shrink to Printable Area", agar dimensi kotak tepat 105 mm x 74.25 mm.
5. Gunting kertas mengikuti panduan garis putus-putus yang tercetak.
`;
