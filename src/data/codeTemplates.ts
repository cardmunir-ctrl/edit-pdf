export interface CodeSnippet {
  id: string;
  title: string;
  language: string;
  filename: string;
  description: string;
  command: string;
  code: string;
}

export const CODE_SNIPPETS: CodeSnippet[] = [
  {
    id: 'python-streamlit',
    title: 'Python (Streamlit)',
    language: 'python',
    filename: 'app_streamlit.py',
    description: 'Aplikasi web interaktif 1 berkas menggunakan Streamlit, pypdf/pymupdf, dan reportlab untuk menyusun nota ke A4 2x4 A8 Lanskap.',
    command: 'pip install streamlit reportlab pymupdf\nstreamlit run app_streamlit.py',
    code: `import io
import math
import streamlit as st
import fitz  # PyMuPDF
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from PIL import Image

# Konfigurasi Dimensi A4 dan Grid 2x4 (A8 Lanskap)
A4_WIDTH_PT, A4_HEIGHT_PT = A4  # 595.27 x 841.89 points (210 x 297 mm)
COLS = 2
ROWS = 4
CELLS_PER_PAGE = COLS * ROWS  # 8 kotak
CELL_WIDTH = A4_WIDTH_PT / COLS   # ~297.6 pt (105.0 mm)
CELL_HEIGHT = A4_HEIGHT_PT / ROWS # ~210.5 pt (74.25 mm)

st.set_page_config(page_title="NotaGrid A4 - Streamlit", page_icon="🧾", layout="wide")

st.title("🧾 NotaGrid A4: Penata Nota Siap Cetak (2x4 A8 Lanskap)")
st.caption("Ubah nota/faktur PDF ukuran bebas menjadi susunan siap cetak A4 dengan garis potong putus-putus presisi.")

uploaded_file = st.file_uploader("Pilih Berkas PDF Nota / Faktur", type=["pdf"])
col_opt1, col_opt2, col_opt3 = st.columns(3)
with col_opt1:
    padding = st.slider("Padding Margin Sel (mm)", 0, 10, 2)
with col_opt2:
    repeat_single = st.checkbox("Gandakan 1 nota menjadi 8 kotak dalam 1 lembar", value=True)
with col_opt3:
    show_dashed = st.checkbox("Tampilkan garis potong putus-putus", value=True)

padding_pt = padding * 2.83465 # Konversi mm ke points

def process_pdf(pdf_bytes):
    doc_in = fitz.open(stream=pdf_bytes, filetype="pdf")
    receipt_images = []
    
    # Ekstraksi setiap halaman PDF sumber menjadi gambar resolusi tinggi
    for page in doc_in:
        pix = page.get_pixmap(dpi=200)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        receipt_images.append(img)
        
    if not receipt_images:
        return None
        
    if repeat_single and len(receipt_images) == 1:
        receipt_images = receipt_images * CELLS_PER_PAGE
        
    out_buffer = io.BytesIO()
    c = canvas.Canvas(out_buffer, pagesize=A4)
    total_pages = math.ceil(len(receipt_images) / CELLS_PER_PAGE)
    
    for page_idx in range(total_pages):
        page_items = receipt_images[page_idx * CELLS_PER_PAGE : (page_idx + 1) * CELLS_PER_PAGE]
        
        for slot in range(CELLS_PER_PAGE):
            col = slot % COLS
            row = slot // COLS
            # Koordinat ReportLab dimulai dari kiri-bawah (0, 0)
            x = col * CELL_WIDTH
            y = A4_HEIGHT_PT - ((row + 1) * CELL_HEIGHT)
            
            # Gambar Nota
            if slot < len(page_items):
                img = page_items[slot]
                img_w, img_h = img.size
                avail_w = CELL_WIDTH - (2 * padding_pt)
                avail_h = CELL_HEIGHT - (2 * padding_pt)
                
                # Pertahankan Aspek Rasio (Fit Contain)
                aspect = img_w / img_h
                target_aspect = avail_w / avail_h
                if aspect > target_aspect:
                    draw_w = avail_w
                    draw_h = avail_w / aspect
                else:
                    draw_h = avail_h
                    draw_w = avail_h * aspect
                    
                draw_x = x + padding_pt + (avail_w - draw_w) / 2
                draw_y = y + padding_pt + (avail_h - draw_h) / 2
                
                img_reader = ImageReader(img)
                c.drawImage(img_reader, draw_x, draw_y, width=draw_w, height=draw_h)
            
            # Gambar Garis Potong Putus-Putus (Dashed Line)
            if show_dashed:
                c.saveState()
                c.setStrokeColorRGB(0.55, 0.6, 0.65)
                c.setLineWidth(0.5)
                c.setDash(4, 3) # 4pt solid, 3pt gap
                c.rect(x, y, CELL_WIDTH, CELL_HEIGHT)
                c.restoreState()
                
        c.showPage()
        
    c.save()
    out_buffer.seek(0)
    return out_buffer

if uploaded_file is not None:
    with st.spinner("Sedang menyusun layout nota ke lembar A4..."):
        result_pdf = process_pdf(uploaded_file.read())
        
    if result_pdf:
        st.success("Nota berhasil disusun ke format 2x4 A8 Lanskap!")
        st.download_button(
            label="⬇️ Unduh PDF A4 Siap Cetak (Skala 100%)",
            data=result_pdf,
            file_name="Nota_A4_SiapCetak_2x4.pdf",
            mime="application/pdf"
        )
`
  },
  {
    id: 'python-flask',
    title: 'Python (Flask API & HTML)',
    language: 'python',
    filename: 'app_flask.py',
    description: 'Server Flask ringan dengan REST endpoint /api/convert yang menerima upload PDF dan mengembalikan PDF A4 tersusun.',
    command: 'pip install flask reportlab pymupdf pillow\npython app_flask.py',
    code: `from flask import Flask, request, send_file, render_template_string
import fitz  # PyMuPDF
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from PIL import Image
import io
import math

app = Flask(__name__)

# Konfigurasi A4 & 2x4 Grid
A4_W, A4_H = A4
CELL_W = A4_W / 2  # 105mm
CELL_H = A4_H / 4  # 74.25mm

HTML_PAGE = """
<!DOCTYPE html>
<html>
<head>
    <title>NotaGrid A4 Flask</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
</head>
<body class="bg-light py-5">
    <div class="container" style="max-width: 600px;">
        <div class="card shadow-sm p-4">
            <h3 class="fw-bold mb-3">NotaGrid A4 (Flask)</h3>
            <p class="text-muted">Ubah nota PDF ukuran bebas menjadi susunan siap cetak 2x4 A8 Lanskap.</p>
            <form action="/convert" method="post" enctype="multipart/form-data">
                <div class="mb-3">
                    <label class="form-label">Pilih Berkas PDF Nota</label>
                    <input class="form-control" type="file" name="pdf_file" accept=".pdf" required>
                </div>
                <div class="form-check mb-3">
                    <input class="form-check-input" type="checkbox" name="repeat" id="repeat" checked>
                    <label class="form-check-label" for="repeat">Gandakan 1 nota menjadi 8 kotak jika nota hanya 1 halaman</label>
                </div>
                <button type="submit" class="btn btn-primary w-100">Proses & Unduh PDF A4</button>
            </form>
        </div>
    </div>
</body>
</html>
"""

@app.route("/")
def index():
    return render_template_string(HTML_PAGE)

@app.route("/convert", methods=["POST"])
def convert():
    file = request.files.get("pdf_file")
    if not file:
        return "No file uploaded", 400
        
    repeat = request.form.get("repeat") == "on"
    doc_in = fitz.open(stream=file.read(), filetype="pdf")
    receipt_images = []
    
    for page in doc_in:
        pix = page.get_pixmap(dpi=200)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        receipt_images.append(img)
        
    if repeat and len(receipt_images) == 1:
        receipt_images = receipt_images * 8
        
    out = io.BytesIO()
    c = canvas.Canvas(out, pagesize=A4)
    total_pages = math.ceil(len(receipt_images) / 8)
    pad = 6.0 # points padding
    
    for p in range(total_pages):
        items = receipt_images[p*8 : (p+1)*8]
        for slot in range(8):
            col = slot % 2
            row = slot // 2
            x = col * CELL_W
            y = A4_H - ((row + 1) * CELL_H)
            
            if slot < len(items):
                img = items[slot]
                w, h = img.size
                avail_w = CELL_W - (2 * pad)
                avail_h = CELL_H - (2 * pad)
                aspect = w / h
                target_aspect = avail_w / avail_h
                if aspect > target_aspect:
                    dw = avail_w
                    dh = avail_w / aspect
                else:
                    dh = avail_h
                    dw = avail_h * aspect
                c.drawImage(ImageReader(img), x + pad + (avail_w-dw)/2, y + pad + (avail_h-dh)/2, dw, dh)
                
            # Dashed lines
            c.saveState()
            c.setStrokeColorRGB(0.5, 0.5, 0.5)
            c.setLineWidth(0.5)
            c.setDash(4, 3)
            c.rect(x, y, CELL_W, CELL_H)
            c.restoreState()
        c.showPage()
        
    c.save()
    out.seek(0)
    return send_file(out, mimetype="application/pdf", as_attachment=True, download_name="Nota_A4_SiapCetak.pdf")

if __name__ == "__main__":
    app.run(port=5000, debug=True)
`
  },
  {
    id: 'node-express',
    title: 'Node.js (Express & PDF-lib)',
    language: 'javascript',
    filename: 'server.js',
    description: 'Backend Node.js murni menggunakan Express, Multer, dan pdf-lib untuk menyusun halaman PDF ke lembar A4 2x4 tanpa perlu rasterisasi gambar.',
    command: 'npm install express multer pdf-lib\nnode server.js',
    code: `const express = require('express');
const multer = require('multer');
const { PDFDocument, rgb, LineCapStyle } = require('pdf-lib');
const fs = require('fs');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Dimensi A4 dalam point (72 points/inch)
// 1 mm = 2.83465 pt -> 210mm = 595.28 pt, 297mm = 841.89 pt
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const COLS = 2;
const ROWS = 4;
const CELL_W = A4_WIDTH / COLS;   // ~297.64 pt
const CELL_H = A4_HEIGHT / ROWS; // ~210.47 pt

app.post('/api/arrange-receipts', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File PDF nota wajib diunggah' });
    }

    const srcPdf = await PDFDocument.load(req.file.buffer);
    const srcPageCount = srcPdf.getPageCount();
    const outPdf = await PDFDocument.create();

    // Salin halaman sebagai embedded pages
    let embeddedPages = await outPdf.embedPages(srcPdf.getPages());

    // Opsi duplikasi jika hanya 1 nota
    const shouldRepeat = req.query.repeat === 'true';
    if (shouldRepeat && embeddedPages.length === 1) {
      embeddedPages = Array(8).fill(embeddedPages[0]);
    }

    const totalSheets = Math.ceil(embeddedPages.length / 8);

    for (let pageIdx = 0; pageIdx < totalSheets; pageIdx++) {
      const page = outPdf.addPage([A4_WIDTH, A4_HEIGHT]);
      const currentItems = embeddedPages.slice(pageIdx * 8, (pageIdx + 1) * 8);

      for (let slot = 0; slot < 8; slot++) {
        const col = slot % COLS;
        const row = Math.floor(slot / COLS);
        const x = col * CELL_W;
        // Sistem koordinat PDF: Y=0 di kiri bawah
        const y = A4_HEIGHT - ((row + 1) * CELL_H);

        // 1. Gambar halaman nota jika ada
        if (slot < currentItems.length) {
          const item = currentItems[slot];
          const pad = 6; // ~2mm margin
          const availW = CELL_W - (pad * 2);
          const availH = CELL_H - (pad * 2);

          const { width: origW, height: origH } = item;
          const aspect = origW / origH;
          const targetAspect = availW / availH;

          let dw, dh;
          if (aspect > targetAspect) {
            dw = availW;
            dh = availW / aspect;
          } else {
            dh = availH;
            dw = availH * aspect;
          }

          const drawX = x + pad + (availW - dw) / 2;
          const drawY = y + pad + (availH - dh) / 2;

          page.drawPage(item, {
            x: drawX,
            y: drawY,
            width: dw,
            height: dh,
          });
        }

        // 2. Gambar Garis Potong Putus-Putus (Dashed Border)
        page.drawRectangle({
          x: x,
          y: y,
          width: CELL_W,
          height: CELL_H,
          borderColor: rgb(0.6, 0.65, 0.7),
          borderWidth: 0.5,
          borderDashArray: [4, 3], // Garis putus-putus
        });
      }
    }

    const pdfBytes = await outPdf.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="NotaGrid_A4_SiapCetak.pdf"');
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memproses PDF: ' + err.message });
  }
});

app.listen(3001, () => {
  console.log('NotaGrid server running on http://localhost:3001');
});
`
  }
];
