export const TAU = Math.PI * 2;

const BAYER8 = [
  0, 32, 8, 40, 2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44, 4, 36, 14, 46, 6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47, 7, 39, 13, 45, 5, 37,
  63, 31, 55, 23, 61, 29, 53, 21,
];
const BAYER = Float32Array.from(BAYER8, (v) => (v + 0.5) / 64);

export function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

/**
 * Stretches scene tones so ordered dither uses more palette levels instead of
 * parking everything in the two darkest bins (gamma < 1 lifts shadows).
 */
export function sceneTone(v: number, gamma = 0.82, lo = 0.05, hi = 0.97): number {
  const t = clamp((v - lo) / (hi - lo), 0, 1);
  return clamp(lo + (hi - lo) * t ** gamma, 0, 1);
}

/** Shading callback for `Field.ell`: q is the squared ellipse radius (0 centre, 1 rim), u/w the local axes. */
export type Shade = (old: number, q: number, u: number, w: number) => number;

export const set = (val: number): Shade => () => val;
export const mul = (m: number): Shade => (old) => old * m;
export const add = (d: number): Shade => (old) => old + d;

/** A grid of tone values in 0..1 that `quantize` turns into palette pixels, under a layer of sprite colours. */
export class Field {
  readonly W: number;
  readonly H: number;
  readonly v: Float32Array;
  /** Sprite colour per pixel, shown as is instead of the dithered tone: 0 for none, n for sprite colour n - 1. */
  readonly ink: Uint8Array;

  constructor(W: number, H: number) {
    this.W = W;
    this.H = H;
    this.v = new Float32Array(W * H);
    this.ink = new Uint8Array(W * H);
  }

  fill(val: number) {
    this.v.fill(val);
    this.ink.fill(0);
  }

  /** Shades the pixels inside an ellipse. Unless `over` is set, they also cover any sprite colour there. */
  ell(cx: number, cy: number, rx: number, ry: number, ang: number, fn: Shade, over = false) {
    if (rx <= 0 || ry <= 0) return;
    const { W, H, v, ink } = this;
    const R = Math.max(rx, ry) + 1;
    const x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(W - 1, Math.ceil(cx + R));
    const y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(H - 1, Math.ceil(cy + R));
    const c = Math.cos(ang), s = Math.sin(ang);
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - cy;
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx;
        const u = (dx * c + dy * s) / rx, w = (dy * c - dx * s) / ry;
        const q = u * u + w * w;
        if (q <= 1) {
          const i = y * W + x;
          v[i] = fn(v[i], q, u, w);
          if (!over) ink[i] = 0;
        }
      }
    }
  }

  dot(x: number, y: number, val: number) {
    const X = Math.floor(x), Y = Math.floor(y);
    if (X >= 0 && Y >= 0 && X < this.W && Y < this.H) {
      this.v[Y * this.W + X] = val;
      this.ink[Y * this.W + X] = 0;
    }
  }

  /** Sets a pixel to sprite colour `color`. */
  paint(x: number, y: number, color: number) {
    const X = Math.floor(x), Y = Math.floor(y);
    if (X >= 0 && Y >= 0 && X < this.W && Y < this.H) this.ink[Y * this.W + X] = color + 1;
  }

  get(x: number, y: number): number {
    const X = Math.floor(x), Y = Math.floor(y);
    return X >= 0 && Y >= 0 && X < this.W && Y < this.H ? this.v[Y * this.W + X] : 0;
  }

  line(xa: number, ya: number, xb: number, yb: number, val: number, width = 1) {
    const n = Math.ceil(Math.hypot(xb - xa, yb - ya)) + 1;
    for (let j = 0; j <= n; j++) {
      const x = xa + ((xb - xa) * j) / n, y = ya + ((yb - ya) * j) / n;
      this.dot(x, y, val);
      if (width > 1) {
        this.dot(x + 1, y, val);
        this.dot(x, y + 1, val);
      }
    }
  }
}

/** Packs `#rrggbb` colours as little-endian RGBA words for an ImageData Uint32 view. */
export function packPalette(hexes: readonly string[]): Uint32Array {
  return Uint32Array.from(hexes, (h) => {
    const n = parseInt(h.slice(1), 16);
    return ((255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | ((n >> 16) & 255)) >>> 0;
  });
}

/**
 * Ordered (8×8 Bayer) dither from tone values to palette entries. A value that sits exactly on a level never
 * dithers. Pixels with a sprite colour take it from `inks` instead.
 */
export function quantize(field: Field, pal: Uint32Array, out: Uint32Array, inks?: Uint32Array) {
  const { W, H, v, ink } = field;
  const L = pal.length - 1;
  for (let y = 0; y < H; y++) {
    const row = (y & 7) * 8;
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (inks && ink[i]) {
        out[i] = inks[ink[i] - 1];
        continue;
      }
      const raw = v[i];
      const val = (raw < 0 ? 0 : raw > 1 ? 1 : raw) * L;
      const base = Math.floor(val + 1e-4);
      out[i] = pal[Math.min(L, base + (val - base > BAYER[row + (x & 7)] ? 1 : 0))];
    }
  }
}

/** Index form of `quantize`, for tests and tools that need levels rather than colours. */
export function levelsOf(field: Field, levels: number): Uint8Array {
  const out = new Uint8Array(field.W * field.H);
  const L = levels - 1;
  for (let y = 0; y < field.H; y++) {
    const row = (y & 7) * 8;
    for (let x = 0; x < field.W; x++) {
      const i = y * field.W + x;
      const raw = field.v[i];
      const val = (raw < 0 ? 0 : raw > 1 ? 1 : raw) * L;
      const base = Math.floor(val + 1e-4);
      out[i] = Math.min(L, base + (val - base > BAYER[row + (x & 7)] ? 1 : 0));
    }
  }
  return out;
}
