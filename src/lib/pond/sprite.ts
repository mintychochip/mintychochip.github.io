import type { Field } from './field';

/** An ellipsoid: [localX, localY, radiusX, radiusY, localAngle, tone, z]. Forward is +x, up is -y; z lifts it toward the viewer. */
export type Part = [number, number, number, number, number, number, number];
/** A tone mark over the surface: [localX, localY, radiusX, radiusY, localAngle, tone, flat]. Flat marks ignore lighting. */
export type Mark = [number, number, number, number, number, number, number?];
export type Light = readonly [number, number, number];

export interface SpriteOpts {
  /** Palette size; tones are 0..1 fractions of it and every pixel lands exactly on a level. */
  levels: number;
  /** Rotation of the whole sprite, radians. */
  ang?: number;
  /** Horizontal squash, 1 = normal; used for turning around. */
  sx?: number;
  /** Pixels below this row are not drawn (a frog half under water). */
  clipY?: number;
  /** Group id per part. A part outlines itself where it sits in front of a different group. */
  groups?: readonly number[];
  /** Level for the outline and the seams on the smallest sprites. */
  ink?: number;
}

const BLEND = 0.9;

export function unit(a: readonly number[]): Light {
  const n = Math.hypot(...a);
  return [a[0] / n, a[1] / n, a[2] / n];
}

/**
 * Cel-shaded sprite from ellipsoid parts: soft-max heights give one surface, lighting picks one of
 * three bands around each part's tone, then a 1px outline and inner seams separate the shapes.
 */
export function sprite(F: Field, parts: readonly Part[], marks: readonly Mark[], cx: number, cy: number, s: number, mirror: boolean, L: Light, o: SpriteOpts) {
  const { W, H, v } = F;
  const top = o.levels - 1;
  const ga = o.ang ?? 0, gc = Math.cos(ga), gs = Math.sin(ga);
  const sx = o.sx ?? 1;
  const ink = o.ink ?? 0;
  const place = (lx: number, ly: number): [number, number] => {
    const mx = (mirror ? -lx : lx) * sx;
    return [cx + (mx * gc - ly * gs) * s, cy + (mx * gs + ly * gc) * s];
  };
  const squash = 0.35 + 0.65 * sx;
  const P = parts.map(([lx, ly, rx, ry, la, tone, z]) => {
    const a = ga + (mirror ? -la : la);
    const [X, Y] = place(lx, ly);
    const RX = Math.max(0.5, rx * s * squash), RY = Math.max(0.5, ry * s);
    return { X, Y, rx: RX, ry: RY, c: Math.cos(a), sn: Math.sin(a), tone, z: z * s, R: Math.max(RX, RY) + 1, hr: Math.min(RX, RY) };
  });
  const M = marks.map(([lx, ly, rx, ry, la, tone, flat]) => {
    const a = ga + (mirror ? -la : la);
    const [X, Y] = place(lx, ly);
    return { X, Y, rx: Math.max(0.5, rx * s * squash), ry: Math.max(0.5, ry * s), c: Math.cos(a), sn: Math.sin(a), tone, flat: !!flat };
  });
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of P) {
    x0 = Math.min(x0, p.X - p.R); x1 = Math.max(x1, p.X + p.R);
    y0 = Math.min(y0, p.Y - p.R); y1 = Math.max(y1, p.Y + p.R);
  }
  x0 = Math.max(0, Math.floor(x0) - 1); y0 = Math.max(0, Math.floor(y0) - 1);
  x1 = Math.min(W - 1, Math.ceil(x1) + 1); y1 = Math.min(H - 1, Math.ceil(y1) + 1);
  const clip = o.clipY === undefined ? Infinity : Math.floor(o.clipY);
  y1 = Math.min(y1, clip);
  if (x1 < x0 || y1 < y0) return;
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const h = new Float32Array(bw * bh).fill(-1);
  const pid = new Int8Array(bw * bh).fill(-1);
  const tone = new Float32Array(bw * bh);
  const flat = new Uint8Array(bw * bh);
  const q = (p: { X: number; Y: number; rx: number; ry: number; c: number; sn: number }, px: number, py: number) => {
    const dx = px - p.X, dy = py - p.Y;
    const u = (dx * p.c + dy * p.sn) / p.rx, w = (dy * p.c - dx * p.sn) / p.ry;
    return u * u + w * w;
  };
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const px = x0 + x + 0.5, py = y0 + y + 0.5, i = y * bw + x;
      let sum = 0, best = -1;
      for (let j = 0; j < P.length; j++) {
        const p = P[j];
        const d = q(p, px, py);
        if (d > 1) continue;
        const hh = p.z + Math.sqrt(1 - d) * p.hr;
        sum += Math.exp(BLEND * hh);
        if (hh > best) { best = hh; pid[i] = j; tone[i] = p.tone; }
      }
      if (sum <= 0) continue;
      h[i] = Math.max(0, Math.log(sum) / BLEND);
      for (const m of M) if (q(m, px, py) <= 1) { tone[i] = m.tone; flat[i] = m.flat ? 1 : 0; }
    }
  }
  const hl = Math.hypot(L[0], L[1], L[2] + 1);
  const Hx = L[0] / hl, Hy = L[1] / hl, Hz = (L[2] + 1) / hl;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= bw || y >= bh || h[y * bw + x] < 0 ? 0 : h[y * bw + x]);
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < bw && y < bh && h[y * bw + x] >= 0;
  const groups = o.groups;
  const seamAt = (x: number, y: number, i: number) => {
    if (!groups) return false;
    const g = groups[pid[i]], z = P[pid[i]].z;
    for (const [ax, ay] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (!inside(ax, ay)) continue;
      const n = pid[ay * bw + ax];
      if (groups[n] !== g && P[n].z < z) return true;
    }
    return false;
  };
  const lv = (n: number) => (n < 0 ? 0 : n > top ? top : Math.round(n)) / top;
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const i = y * bw + x, j = (y0 + y) * W + x0 + x;
      if (h[i] < 0) {
        if (y0 + y <= clip && (inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1))) v[j] = ink / top;
        continue;
      }
      const base = tone[i] * top;
      if (flat[i]) { v[j] = lv(base); continue; }
      if (seamAt(x, y, i)) { v[j] = lv(Math.min(base - 2, ink + 1)); continue; }
      let nx = (at(x - 1, y) - at(x + 1, y)) / 2, ny = (at(x, y - 1) - at(x, y + 1)) / 2, nz = 1;
      const n = Math.hypot(nx, ny, nz);
      nx /= n; ny /= n; nz /= n;
      const lam = nx * L[0] + ny * L[1] + nz * L[2];
      const spec = Math.max(0, nx * Hx + ny * Hy + nz * Hz);
      let lev = base + (lam > 0.86 ? 1 : lam > 0.5 ? 0 : -1);
      if (spec > 0.985) lev = top;
      v[j] = lv(lev);
    }
  }
}
