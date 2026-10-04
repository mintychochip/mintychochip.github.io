import type { Field } from './field';

export type Light = readonly [number, number, number];

export function unit(a: readonly number[]): Light {
  const n = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / n, a[1] / n, a[2] / n];
}

/** Sprite colours for a part's shadowed, middle and lit bands. */
export type Band = readonly [number, number, number];

/**
 * One part of a cartoon sprite in sprite units (y down): an ellipse [x, y, rx, ry, angle], or a capsule
 * [x0, y0, x1, y1, r0, r1] whose radius tapers from r0 to r1.
 */
export interface Shape {
  ell?: readonly number[];
  cap?: readonly number[];
  band: Band;
  /** Parts of one group join without a line; where groups overlap, the one in front gets a contour. */
  group: number;
  /** Raises the part toward the viewer in the shading. */
  z?: number;
  /** Contours against this part go on the part behind it, so this one stays whole. */
  outer?: boolean;
  /** Contours against this part are drawn even on sprites too small for the others. */
  keep?: boolean;
}

export interface Stroke {
  /** Polyline in sprite units: x0, y0, x1, y1, ... */
  pts: readonly number[];
  color: number;
  /** Only over pixels where a part of this group is in front. */
  on?: number;
  /** Two pixels tall. */
  bold?: boolean;
}

export interface ToonOpts {
  /** Colour of the outline, and of contours against `keep` parts. */
  line: number;
  /** Colour of the other contours; defaults to `line`. */
  seam?: number;
  ang?: number;
  /** Horizontal squash, 1 for none. */
  sx?: number;
  mirror?: boolean;
  /** Rows below this are not drawn (the frog is in the water). */
  clipY?: number;
  /** Contours between every pair of groups, not only around `keep` parts. */
  contours?: boolean;
}

const BLEND = 0.9;

interface Prep {
  sh: Shape;
  cap: boolean;
  a: number; b: number; c: number; d: number; r0: number; r1: number;
  ca: number; sa: number; len2: number; z: number;
  x0: number; x1: number; y0: number; y1: number;
}

/**
 * Draws a flat-coloured sprite with a one-pixel outline into the field's sprite layer. Parts later in
 * `shapes` sit in front. Their union is shaded as one soft surface into three bands, so the moon side
 * gets a lit edge and the far side a shadow.
 */
export function toon(F: Field, shapes: readonly Shape[], strokes: readonly Stroke[], cx: number, cy: number, s: number, L: Light, o: ToonOpts) {
  const { W, H } = F;
  const ga = o.ang ?? 0, gc = Math.cos(ga), gs = Math.sin(ga);
  const kx = (o.mirror ? -1 : 1) * (o.sx ?? 1);
  const toX = (lx: number, ly: number) => cx + (lx * kx * gc - ly * gs) * s;
  const toY = (lx: number, ly: number) => cy + (lx * kx * gs + ly * gc) * s;
  const clip = o.clipY ?? Infinity;

  let bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
  const preps: Prep[] = [];
  for (const sh of shapes) {
    let mx: number, my: number, R: number;
    const p: Prep = { sh, cap: !!sh.cap, a: 0, b: 0, c: 0, d: 0, r0: 0, r1: 0, ca: 1, sa: 0, len2: 1, z: sh.z ?? 0, x0: 0, x1: 0, y0: 0, y1: 0 };
    if (sh.cap) {
      const [xa, ya, xb, yb, r0, r1] = sh.cap;
      if (r0 <= 0 && r1 <= 0) continue;
      Object.assign(p, { a: xa, b: ya, c: xb - xa, d: yb - ya, r0, r1, len2: Math.max(1e-6, (xb - xa) ** 2 + (yb - ya) ** 2) });
      mx = (xa + xb) / 2; my = (ya + yb) / 2; R = Math.hypot(xb - xa, yb - ya) / 2 + Math.max(r0, r1);
    } else {
      const [x, y, rx, ry, a = 0] = sh.ell!;
      if (rx <= 0 || ry <= 0) continue;
      Object.assign(p, { a: x, b: y, c: rx, d: ry, ca: Math.cos(a), sa: Math.sin(a) });
      mx = x; my = y; R = Math.max(rx, ry);
    }
    const px = toX(mx, my), py = toY(mx, my), pr = R * s + 1;
    p.x0 = px - pr; p.x1 = px + pr; p.y0 = py - pr; p.y1 = py + pr;
    bx0 = Math.min(bx0, p.x0); bx1 = Math.max(bx1, p.x1); by0 = Math.min(by0, p.y0); by1 = Math.max(by1, p.y1);
    preps.push(p);
  }
  if (!preps.length) return;

  // One pixel of margin for the outline and the normals.
  const X0 = Math.max(0, Math.floor(bx0) - 1), X1 = Math.min(W - 1, Math.ceil(bx1) + 1);
  const Y0 = Math.max(0, Math.floor(by0) - 1), Y1 = Math.min(H - 1, Math.ceil(by1) + 1, Math.floor(clip));
  const bw = X1 - X0 + 1, bh = Y1 - Y0 + 1;
  if (bw <= 0 || bh <= 0) return;

  // Each group is shaded as its own soft surface, so small parts don't speckle the big ones.
  const top = new Int16Array(bw * bh).fill(-1);
  const hgt = new Float32Array(bw * bh);
  const hs = new Float64Array(preps.length);
  const row: number[] = [];
  for (let y = 0; y < bh; y++) {
    const py = Y0 + y + 0.5;
    row.length = 0;
    for (let j = 0; j < preps.length; j++) if (py >= preps[j].y0 && py <= preps[j].y1) row.push(j);
    if (!row.length) continue;
    for (let x = 0; x < bw; x++) {
      const px = X0 + x + 0.5;
      const dx = px - cx, dy = py - cy;
      const lx = (dx * gc + dy * gs) / (kx * s), ly = (dy * gc - dx * gs) / s;
      let best = -1;
      for (const j of row) hs[j] = NaN;
      for (const j of row) {
        const p = preps[j];
        if (px < p.x0 || px > p.x1) continue;
        if (p.cap) {
          const t0 = ((lx - p.a) * p.c + (ly - p.b) * p.d) / p.len2, t = t0 < 0 ? 0 : t0 > 1 ? 1 : t0;
          const r = p.r0 + (p.r1 - p.r0) * t, ex = lx - p.a - p.c * t, ey = ly - p.b - p.d * t;
          const d2 = (ex * ex + ey * ey) / (r * r);
          if (d2 > 1) continue;
          hs[j] = p.z + Math.sqrt(1 - d2) * r;
        } else {
          const ex = lx - p.a, ey = ly - p.b;
          const u = (ex * p.ca + ey * p.sa) / p.c, w = (ey * p.ca - ex * p.sa) / p.d;
          const q = u * u + w * w;
          if (q > 1) continue;
          hs[j] = p.z + Math.sqrt(1 - q) * Math.min(p.c, p.d);
        }
        best = j;
      }
      if (best < 0) continue;
      const g = preps[best].sh.group;
      let sum = 0;
      for (const j of row) if (hs[j] === hs[j] && preps[j].sh.group === g) sum += Math.exp(BLEND * hs[j] * s);
      top[y * bw + x] = best;
      hgt[y * bw + x] = Math.log(sum) / BLEND;
    }
  }

  const col = new Int16Array(bw * bh).fill(-1);
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= bw || y >= bh ? -1 : top[y * bw + x]);
  /** Height for the normal at (x, y): outside the sprite is the ground, another group is ignored. */
  const hAt = (x: number, y: number, g: number, h: number) => {
    const n = at(x, y);
    return n < 0 ? 0 : preps[n].sh.group === g ? hgt[y * bw + x] : h;
  };
  const nb = [0, 0, 0, 0];
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const i = y * bw + x, me = top[i];
      nb[0] = at(x - 1, y); nb[1] = at(x + 1, y); nb[2] = at(x, y - 1); nb[3] = at(x, y + 1);
      if (me < 0) {
        if (nb[0] >= 0 || nb[1] >= 0 || nb[2] >= 0 || nb[3] >= 0) col[i] = o.line;
        continue;
      }
      const A = preps[me].sh;
      let line = -1;
      for (const n of nb) {
        if (n < 0 || n === me) continue;
        const B = preps[n].sh;
        if (A.group === B.group || !((me > n && !A.outer) || (n > me && B.outer))) continue;
        if (A.keep || B.keep) { line = o.line; break; }
        if (o.contours) line = o.seam ?? o.line;
      }
      if (line >= 0) { col[i] = line; continue; }
      const g = A.group, h = hgt[i];
      const gx = (hAt(x + 1, y, g, h) - hAt(x - 1, y, g, h)) / 2, gy = (hAt(x, y + 1, g, h) - hAt(x, y - 1, g, h)) / 2;
      const lam = (-gx * L[0] - gy * L[1] + L[2]) / Math.hypot(gx, gy, 1);
      col[i] = A.band[lam > 0.92 ? 2 : lam > 0.12 ? 1 : 0];
    }
  }

  for (const st of strokes) {
    const { pts } = st;
    for (let j = 0; j === 0 || j + 3 < pts.length; j += 2) {
      const e = j + 3 < pts.length ? j + 2 : j;
      const xa = toX(pts[j], pts[j + 1]), ya = toY(pts[j], pts[j + 1]);
      const xb = toX(pts[e], pts[e + 1]), yb = toY(pts[e], pts[e + 1]);
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(xb - xa), Math.abs(yb - ya))));
      for (let q = 0; q <= n; q++) {
        const x = Math.floor(xa + ((xb - xa) * q) / n) - X0, y0 = Math.floor(ya + ((yb - ya) * q) / n) - Y0;
        for (let y = y0; y <= y0 + (st.bold ? 1 : 0); y++) {
          if (x < 0 || y < 0 || x >= bw || y >= bh) continue;
          const p = top[y * bw + x];
          if (st.on !== undefined && (p < 0 || preps[p].sh.group !== st.on)) continue;
          col[y * bw + x] = st.color;
        }
      }
    }
  }

  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const c = col[y * bw + x];
      if (c >= 0) F.ink[(Y0 + y) * W + X0 + x] = c + 1;
    }
  }
}
