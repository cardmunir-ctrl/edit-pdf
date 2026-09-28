/**
 * Safari < 18.4 tidak menyediakan global `Iterator`.
 *
 * pdfjs-dist (build/pdf.mjs) mengakses `Iterator.prototype.join` di top-level
 * module. Pada runtime tanpa global tersebut, module evaluation melempar
 * `ReferenceError: Iterator is not defined`. Karena pdfjs ter-inline ke entry
 * bundle, error terjadi sebelum `createRoot().render()` di main.tsx sehingga
 * aplikasi hanya menampilkan layar putih. Chrome >= 122 sudah punya global ini,
 * jadi Android tidak terpengaruh.
 *
 * Modul ini wajib diimpor sebelum modul apa pun yang menarik pdfjs-dist.
 */

type AnyFn = (...args: never[]) => unknown;

/** %IteratorPrototype%, nenek moyang bersama iterator native (Array, Map, Set, String). */
function getIteratorPrototype(): object {
  return Object.getPrototypeOf(Object.getPrototypeOf([][Symbol.iterator]())) as object;
}

/**
 * Membungkus iterator biasa dengan object yang mewarisi %IteratorPrototype%,
 * agar method helper tetap tersedia pada hasil chained call
 * (mis. keys().filter(...).toArray()).
 */
function makeIterator(underlying: Iterator<unknown>): object {
  const wrapper = Object.create(getIteratorPrototype());
  let done = false;
  Object.defineProperties(wrapper, {
    next: {
      value: () => (done ? { done: true, value: undefined } : underlying.next()),
      writable: true,
      configurable: true,
    },
    [Symbol.iterator]: {
      value: () => wrapper,
      writable: true,
      configurable: true,
    },
  });
  return wrapper;
}

/**
 * Menambahkan method iterator helper yang dipakai pdfjs-dist, bukan seluruh
 * Iterator Helpers:
 *   - join  : dipanggil di top-level module (penyebab layar putih)
 *   - some  : AnnotationStorage#values().some(...)
 *   - find  : PDFFileStream#_rangeReaders.keys().find(...)
 *   - filter: TextLayerSet#keys().filter(...).toArray()
 */
function defineHelpers(prototype: object): void {
  const target = prototype as Record<string, unknown>;
  const define = (name: string, value: AnyFn) => {
    if (typeof target[name] !== 'function') {
      Object.defineProperty(prototype, name, {
        value,
        writable: true,
        enumerable: false,
        configurable: true,
      });
    }
  };

  define('join', function join(this: Iterable<unknown>, separator = ',') {
    let out = '';
    for (const value of this) {
      if (out) out += separator;
      out += String(value);
    }
    return out;
  });

  define('some', function some(this: Iterable<unknown>, predicate: (v: unknown) => boolean) {
    for (const value of this) if (predicate(value)) return true;
    return false;
  });

  define('find', function find(this: Iterable<unknown>, predicate: (v: unknown) => boolean) {
    for (const value of this) if (predicate(value)) return value;
    return undefined;
  });

  define('filter', function filter(
    this: Iterable<unknown>,
    predicate: (v: unknown) => boolean
  ) {
    const kept: unknown[] = [];
    for (const value of this) if (predicate(value)) kept.push(value);
    return makeIterator(kept[Symbol.iterator]());
  });

  define('toArray', function toArray(this: Iterable<unknown>) {
    return Array.from(this);
  });
}

if (typeof (globalThis as { Iterator?: unknown }).Iterator !== 'function') {
  const iteratorPrototype = getIteratorPrototype();
  defineHelpers(iteratorPrototype);

  // pdfjs masih membutuhkan global `Iterator` untuk menyentuh
  // `Iterator.prototype.join` di top-level.
  const shim = function Iterator() {
    throw new TypeError('Iterator tidak dapat dikonstruksi secara langsung');
  } as unknown as { prototype: object };
  shim.prototype = iteratorPrototype;
  (globalThis as { Iterator?: unknown }).Iterator = shim;
}

export {};
