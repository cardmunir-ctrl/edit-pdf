# edit-pdf - Penata & Pencetak PDF A4

Aplikasi web modern untuk mengubah format nota/faktur PDF ukuran bebas menjadi susunan siap cetak pada lembar A4 (8 kotak) dengan orientasi potret/lanskap, kontrol celah antar-nota (*gap*), serta pemilihan jumlah kotak (1–8).

## 🚀 Panduan Deploy ke Vercel

Aplikasi ini adalah React Vite SPA murni (client-side PDF engine menggunakan jsPDF & PDF.js), sehingga sangat ringan, cepat, dan 100% kompatibel untuk di-deploy ke Vercel secara gratis.

### Cara 1: Deploy Lewat GitHub (Paling Mudah & Otomatis)

1. **Upload / Push Kode ke GitHub:**
   - Buat repository baru di [GitHub](https://github.com/new) dengan nama `edit-pdf`.
   - Jalankan perintah berikut di folder proyek Anda:
     ```bash
     git init
     git add .
     git commit -m "Deploy edit-pdf ke Vercel"
     git branch -M main
     git remote add origin https://github.com/USERNAME/edit-pdf.git
     git push -u origin main
     ```

2. **Hubungkan ke Vercel:**
   - Buka [vercel.com](https://vercel.com) dan login (bisa login dengan akun GitHub).
   - Klik tombol **"Add New..."** -> **"Project"**.
   - Pilih repository `edit-pdf` yang baru saja Anda buat, lalu klik **"Import"**.

3. **Konfigurasi Project:**
   - **Project Name:** `edit-pdf`
   - **Framework Preset:** `Vite` (Vercel akan otomatis mendeteksinya).
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - Klik tombol **"Deploy"**.

4. **Selesai!**
   - Dalam ~30 detik, website Anda sudah aktif dengan domain gratis seperti `edit-pdf.vercel.app`.
   - Domain tersebut bisa langsung dibuka di PC, laptop, tablet, maupun smartphone Android/iOS.

---

### Cara 2: Deploy Langsung Menggunakan Vercel CLI (Lewat Terminal)

1. Pasang Vercel CLI di komputer Anda jika belum ada:
   ```bash
   npm install -g vercel
   ```

2. Jalankan perintah deploy di folder proyek:
   ```bash
   vercel
   ```
   - Ikuti panduan di layar:
     - *Set up and deploy?* -> Tekan `y`
     - *Which scope?* -> Pilih akun Vercel Anda
     - *Link to existing project?* -> `n`
     - *Project name?* -> `edit-pdf`
     - *Directory located?* -> `./`
     - *Want to modify settings?* -> `n`

3. Untuk deploy versi produksi (live domain utama):
   ```bash
   vercel --prod
   ```

---

## 🛠️ Pengembangan Lokal (Local Development)

```bash
# Install dependensi
npm install

# Jalankan server lokal
npm run dev
```
Buka browser di `http://localhost:3000`.
