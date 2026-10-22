// Normalisasi warna CSS modern (oklab/oklch/lab/lch/hwb/color()/color-mix/dll)
// menjadi rgb/rgba agar html2canvas (yang hanya mendukung rgb/hsl/hex) bisa
// merender slip PNG. Hanya dipakai pada DOM hasil clone proses ekspor PNG.

const COLOR_FUNCTION_NAMES = new Set([
  'oklab',
  'oklch',
  'lab',
  'lch',
  'hwb',
  'color',
  'color-mix',
]);

const COLOR_FUNCTION_PATTERN =
  /\b(oklab|oklch|lab|lch|hwb|color-mix|color)\s*\(/i;

export function needsColorConversion(value: string): boolean {
  return COLOR_FUNCTION_PATTERN.test(value);
}

function isIdentChar(ch: string): boolean {
  return /[A-Za-z0-9_-]/.test(ch);
}

// Mengganti setiap fungsi warna (termasuk yang bersarang di dalam gradien,
// shadow, border, dll.) dengan hasil konversi dari `convertColor`. Struktur
// CSS lain (linear-gradient, calc, url, ...) dipertahankan; hanya isi
// fungsi warna yang dikonversi secara rekursif.
const SHORTHAND_SKIP = new Set([
  'background',
  'border',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'outline',
  'text-decoration',
  'font',
]);

export function convertModernColorValue(
  value: string,
  convertColor: (colorText: string) => string,
): string {
  let i = 0;
  const n = value.length;
  let out = '';

  while (i < n) {
    const ch = value[i];
    if (/[A-Za-z]/.test(ch)) {
      let j = i;
      while (j < n && isIdentChar(value[j])) j++;
      const name = value.slice(i, j);

      if (j < n && value[j] === '(') {
        let depth = 0;
        let k = j;
        for (; k < n; k++) {
          if (value[k] === '(') depth++;
          else if (value[k] === ')') {
            depth--;
            if (depth === 0) {
              k++;
              break;
            }
          }
        }

        if (depth !== 0) {
          // Tidak ada penutup seimbang: salin sisa string apa adanya.
          out += value.slice(i);
          i = n;
          continue;
        }

        const funcText = value.slice(i, k);
        const inner = value.slice(j + 1, k - 1);
        const lower = name.toLowerCase();

        if (COLOR_FUNCTION_NAMES.has(lower)) {
          out += convertColor(funcText);
          i = k;
          continue;
        }

        const convertedInner = convertModernColorValue(inner, convertColor);
        out += name + '(' + convertedInner + ')';
        i = k;
        continue;
      }

      out += value[i++];
      continue;
    }

    out += value[i++];
  }

  return out;
}

// Cache global untuk hasil konversi warna modern -> rgb/rgba. Deterministik
// (canvas 2D), sehingga aman dipakai ulang antar capture dan menghindari
// normalisasi warna berulang pada nilai yang sama.
const COLOR_CONVERSION_CACHE = new Map<string, string>();

export function normalizeModernColors(clonedDoc: Document, root?: Element | null): void {
  const win = clonedDoc.defaultView;
  if (!win) return;

  const canvas = clonedDoc.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const convertColor = (colorText: string): string => {
    const cached = COLOR_CONVERSION_CACHE.get(colorText);
    if (cached !== undefined) return cached;

    let result = colorText;
    try {
      ctx.fillStyle = 'rgb(1, 2, 3)';
      ctx.fillStyle = colorText;
      if (ctx.fillStyle === 'rgb(1, 2, 3)') {
        result = colorText;
      } else {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        const alpha = d[3] / 255;
        if (alpha >= 0.999) {
          result = `rgb(${d[0]}, ${d[1]}, ${d[2]})`;
        } else {
          result = `rgba(${d[0]}, ${d[1]}, ${d[2]}, ${Number(alpha.toFixed(3))})`;
        }
      }
    } catch {
      result = colorText;
    }

    COLOR_CONVERSION_CACHE.set(colorText, result);
    return result;
  };

  const visited = new WeakSet<Element>();

  // Normalisasi hanya style elemen ini (tanpa menelusuri anak), dipakai untuk
  // elemen root dokumen (html/body) yang dibaca html2canvas untuk latar belakang
  // default, tanpa memproses seluruh pohon DOM.
  const normalizeElement = (el: Element | null, pseudo?: string | null) => {
    if (!el || el.nodeType !== 1) return;
    const htmlEl = el as HTMLElement;

    let style: CSSStyleDeclaration | null = null;
    try {
      style = win.getComputedStyle(htmlEl, pseudo || undefined);
    } catch {
      style = null;
    }

    if (style) {
      for (let i = 0; i < style.length; i++) {
        const prop = style.item(i);
        if (SHORTHAND_SKIP.has(prop)) continue;
        const value = style.getPropertyValue(prop);
        if (!value || !needsColorConversion(value)) continue;
        const converted = convertModernColorValue(value, convertColor);
        if (converted && converted !== value) {
          // Untuk pseudo-element, inline style pada elemen induk tidak cukup;
          // simpan hasil konversi pada elemen via atribut data agar bisa dipakai
          // ulang. html2canvas membaca getComputedStyle pseudo dari clone, yang
          // tetap berisi nilai asli, sehingga pseudo ditangani lewat stylesheet
          // clone (lihat injectNormalizedStylesheet di bawah).
          htmlEl.style.setProperty(prop, converted);
        }
      }
    }
  };

  const visit = (el: Element | null) => {
    if (!el || el.nodeType !== 1) return;
    if (visited.has(el)) return;
    visited.add(el);
    const htmlEl = el as HTMLElement;

    normalizeElement(htmlEl, null);

    // Tangani pseudo-element ::before dan ::after yang dibaca html2canvas.
    for (const pseudo of [':before', ':after']) {
      let pseudoStyle: CSSStyleDeclaration | null = null;
      try {
        pseudoStyle = win.getComputedStyle(htmlEl, pseudo);
      } catch {
        pseudoStyle = null;
      }
      if (pseudoStyle) {
        for (let i = 0; i < pseudoStyle.length; i++) {
          const prop = pseudoStyle.item(i);
          if (SHORTHAND_SKIP.has(prop)) continue;
          const value = pseudoStyle.getPropertyValue(prop);
          if (!value || !needsColorConversion(value)) continue;
          // Simpan di cache; aturan stylesheet ditangani terpisah di bawah.
          convertModernColorValue(value, convertColor);
        }
      }
    }

    for (const child of Array.from(htmlEl.children || [])) {
      visit(child as Element);
    }
  };

  // Normalisasi elemen root dokumen (html/body) tanpa menelusuri seluruh DOM,
  // karena html2canvas membaca backgroundColor documentElement/body.
  normalizeElement(clonedDoc.documentElement, null);
  if (clonedDoc.body && clonedDoc.body !== clonedDoc.documentElement) {
    normalizeElement(clonedDoc.body, null);
  }

  // Tangani stylesheet clone: tulis ulang aturan CSS yang mengandung fungsi
  // warna modern menjadi sRGB, termasuk pseudo-element dan kelas global.
  try {
    const sheets = Array.from(clonedDoc.styleSheets || []);
    for (const sheet of sheets) {
      let rules: CSSRuleList | null = null;
      try {
        rules = sheet.cssRules;
      } catch {
        rules = null;
      }
      if (!rules) continue;
      for (let i = 0; i < rules.length; i++) {
        const rule = rules[i] as CSSStyleRule;
        if (!rule || !rule.style) continue;
        for (let j = 0; j < rule.style.length; j++) {
          const prop = rule.style.item(j);
          // Stylesheet: normalisasi juga shorthand (background, border, ...) karena
          // nilai aslinya mengandung fungsi warna; convertModernColorValue
          // mempertahankan struktur CSS.
          const value = rule.style.getPropertyValue(prop);
          if (!value || !needsColorConversion(value)) continue;
          const converted = convertModernColorValue(value, convertColor);
          if (converted && converted !== value) {
            rule.style.setProperty(prop, converted);
          }
        }
      }
    }
  } catch {
    // Abaikan error akses stylesheet lintas-origin.
  }

  const startRoot = root && root.nodeType === 1 ? root : clonedDoc.documentElement;
  visit(startRoot);

  // Verifikasi: laporkan sisa fungsi warna modern pada computed style yang
  // masih bisa mencapai parser html2canvas. Hanya peringatan, tidak mengubah.
  const verifyElement = (el: Element | null, pseudo?: string | null) => {
    if (!el || el.nodeType !== 1) return;
    let st: CSSStyleDeclaration | null = null;
    try {
      st = win.getComputedStyle(el, pseudo || undefined);
    } catch {
      st = null;
    }
    if (st) {
      for (let i = 0; i < st.length; i++) {
        const prop = st.item(i);
        const value = st.getPropertyValue(prop);
        if (value && needsColorConversion(value)) {
          console.warn('[colorNormalize] sisa warna modern:', el.nodeName, pseudo || '', prop, value);
        }
      }
    }
  };
  // Verifikasi hanya root dokumen (tanpa subtree) dan subtree slip.
  verifyElement(clonedDoc.documentElement, null);
  verifyElement(clonedDoc.documentElement, ':before');
  verifyElement(clonedDoc.documentElement, ':after');
  if (clonedDoc.body && clonedDoc.body !== clonedDoc.documentElement) {
    verifyElement(clonedDoc.body, null);
    verifyElement(clonedDoc.body, ':before');
    verifyElement(clonedDoc.body, ':after');
  }
  const verifyTree = (el: Element | null) => {
    if (!el || el.nodeType !== 1) return;
    verifyElement(el, null);
    verifyElement(el, ':before');
    verifyElement(el, ':after');
    for (const child of Array.from((el as HTMLElement).children || [])) {
      verifyTree(child as Element);
    }
  };
  verifyTree(startRoot);

}
