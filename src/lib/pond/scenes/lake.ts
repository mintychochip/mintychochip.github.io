import { TAU, mul, sceneTone, set, type Field } from '../field';
import { scatter, type Perch, type SceneContext, type Setting } from '../life';
import { drawStars, glitter, glitterRows, halo, ridge, scatterStars } from '../sky';

interface Pad extends Perch {
  /** Side of the wedge cut into the pad. */
  notch: 1 | -1;
  /** A lotus flower blooms on it until a frog takes the pad. */
  lotus: boolean;
}

const CRATERS: readonly (readonly [number, number, number])[] = [[-0.35, -0.2, 0.28], [0.3, 0.25, 0.22], [0.05, 0.45, 0.15]];

/** The night lake: pines under the moon, lily pads with lotus flowers, reeds at the edges and fireflies. */
export function lake(c: SceneContext): Setting<Pad> {
  const { W, H, k, r, y0, depthAt } = c;
  const moon = { x: W * (0.2 + 0.6 * r()), y: y0 * (0.28 + 0.2 * r()), R: Math.max(3.5, Math.min(W, H) * 0.09) };
  const sx: 1 | -1 = moon.x >= W / 2 ? 1 : -1;
  const far = ridge(c, 3.5, 1.4, 3, 9, 2);
  const top = ridge(c, 1.5, 1, 3, 13, 2.5);

  // Sky, moon and tree lines never move, so they are drawn once.
  const backdrop = new Float32Array(W * H);
  for (let y = 0; y < y0; y++) {
    const g = y / Math.max(1, y0);
    for (let x = 0; x < W; x++) {
      let val = 0.08 + 0.36 * g ** 1.8 + 0.1 * Math.exp(-(y0 - y) / (6 * k));
      const dx = x + 0.5 - moon.x, dy = y + 0.5 - moon.y, d = Math.hypot(dx, dy);
      if (d < moon.R) {
        val = 0.86 + 0.14 * Math.sqrt(1 - (d / moon.R) ** 2);
        for (const [cx, cy, cr] of CRATERS) {
          const ex = x + 0.5 - (moon.x + cx * moon.R), ey = y + 0.5 - (moon.y + cy * moon.R);
          const e = Math.hypot(ex, ey) / (cr * moon.R);
          if (e < 1) val = e > 0.65 && ex * sx + ey > 0 ? 1 : val - 0.12;
        }
      } else {
        val += halo(d, moon.R, 0.24);
      }
      if (y >= far[x]) val = 0.22 + 0.08 * Math.exp(-Math.abs(x - moon.x) / (W * 0.35));
      if (y >= top[x]) val = 0.09;
      backdrop[y * W + x] = sceneTone(val, 0.78, 0.04, 0.98);
    }
  }
  const stars = scatterStars(c, y0, (x, y) => y < far[x] && Math.hypot(x - moon.x, y - moon.y) > moon.R * 2.56);

  const pads = scatter(c, Math.max(c.frogs + 2, Math.round(W / (22 * k))), (): Pad => {
    const y = y0 + 3 * k + r() * Math.max(1, H - y0 - 5 * k);
    const p = depthAt(y);
    const rx = (5.5 + 4.5 * r()) * k * p;
    const x = rx + r() * Math.max(1, W - 2 * rx);
    return { x, y, rx, ry: rx * 0.32, p, floats: true, ph: r() * TAU, notch: r() < 0.5 ? 1 : -1, lotus: r() < 0.3 };
  });

  const reeds: { x: number; h: number; ph: number; cat: boolean }[] = [];
  for (const side of [0, 1]) {
    const n = 1 + Math.floor(r() * 2);
    for (let j = 0; j < n; j++) {
      const x = side ? W - 2 - (j * 0.07 + r() * 0.05) * W : 2 + (j * 0.07 + r() * 0.05) * W;
      reeds.push({ x, h: (0.3 + 0.3 * r()) * H, ph: r() * TAU, cat: r() < 0.7 });
    }
  }

  const rows = new Float32Array(H);
  const notched = (P: Pad, u: number, w: number) => w > 0.1 && Math.abs(u - 0.25 * P.notch) < w * 0.35;

  return {
    perches: pads,
    light: sx,
    backdrop,
    water: (_x, y) => y >= y0,
    back(F, t) {
      drawStars(F, stars, t);
      glitterRows(rows, y0, t);
      const { v } = F;
      for (let y = y0; y < H; y++) {
        const dy = y - y0, depth = dy / Math.max(1, H - y0);
        const base = 0.06 + 0.34 * (1 - depth) ** 1.7 + 0.08 * Math.exp(-dy / (4 * k));
        const wob = Math.round(0.9 * k * Math.sin((y * 0.9) / k + t * 2.2));
        const ry = y0 - dy * 1.1;
        for (let x = 0; x < W; x++) {
          let val = base + 0.04 * Math.sin((y * 1.1) / k + t * 1.6 + Math.sin((x * 0.07) / k + t * 0.4) * 2) * depth;
          const rxx = x + wob < 0 ? 0 : x + wob >= W ? W - 1 : x + wob;
          if (ry >= top[rxx]) val *= 0.3;
          else if (ry >= far[rxx]) val *= 0.62;
          val += glitter(x, y, t, depth, moon.x, moon.R, rows[y]);
          v[y * W + x] = sceneTone(val, 0.8, 0.06, 0.96);
        }
      }
    },
    drawPerch(F, P, py) {
      F.ell(P.x, py + P.ry * 1.25, P.rx * 1.02, P.ry * 0.9, 0, mul(0.35));
      F.ell(P.x, py + P.ry * 0.3, P.rx, P.ry, 0, (old, _q, u, w) => (notched(P, u, w) ? old : 0.03));
      F.ell(P.x, py, P.rx, P.ry, 0, (old, q, u, w) => {
        if (notched(P, u, w)) return old;
        const lit = 0.5 + 0.5 * u * sx, d = Math.sqrt(q);
        if (d > 0.8 && w < 0.15) return 0.42 + 0.5 * lit;
        const a = Math.atan2(w, u);
        const vein = d > 0.18 && d < 0.78 && Math.abs(Math.sin(a * 3.5)) < 0.12 ? -0.1 : 0;
        return 0.24 + 0.36 * lit - 0.08 * w + vein;
      });
      if (P.lotus) {
        const lx = P.x - P.notch * P.rx * 0.35, ly = py - P.ry * 0.2, s = k * P.p;
        const petal = (ox: number, oy: number, rx: number, ry: number, a: number, lit: number) =>
          F.ell(lx + ox * s, ly + oy * s, rx * s, ry * s, a, (_o, q, u) => 0.62 + 0.36 * lit * (0.6 + 0.4 * u * sx) * (1 - 0.3 * q));
        petal(-1.3, -0.5, 1.2, 0.55, -0.35, 0.8);
        petal(1.3, -0.5, 1.2, 0.55, 0.35, 0.8);
        petal(-0.6, -1.0, 0.6, 1.2, -0.3, 1);
        petal(0.6, -1.0, 0.6, 1.2, 0.3, 1);
        petal(0, -1.2, 0.55, 1.3, 0, 1);
        F.ell(lx, ly - 0.2 * s, 0.6 * s, 0.4 * s, 0, set(0.7));
      }
    },
    taken(P) {
      P.lotus = false;
    },
    front(F, t) {
      const { v, ink } = F;
      const put = (x: number, y: number) => {
        if (x < 0 || x >= W || y < 0 || y >= H) return;
        const i = y * W + x;
        v[i] = v[i] > 0.3 || ink[i] ? 0.02 : 0.42;
        ink[i] = 0;
      };
      for (const rd of reeds) {
        const yTop = Math.floor(H - rd.h);
        const sway = (rel: number) => 1.4 * k * Math.sin(t * 0.8 + rd.ph) * (1 - rel) * (1 - rel);
        for (let y = yTop; y < H; y++) put(Math.round(rd.x + sway((y - yTop) / rd.h)), y);
        if (rd.cat) {
          F.ell(rd.x + sway(0) + 0.5, yTop + 2.5 * k, 0.9 * k + 0.3, 2.6 * k, 0,
            (old, q, u) => (old > 0.3 ? 0.02 : 0.16 + 0.4 * (0.5 + 0.5 * u * sx) * (1 - 0.5 * q)));
        }
      }
    },
    fly(F: Field, x: number, y: number, on: number) {
      F.ell(x, y, 3 * k, 3 * k, 0, (old, q) => old + 0.3 * (1 - Math.sqrt(q)) * on, true);
      F.ell(x, y, 0.75, 0.75, 0, set(1));
    },
  };
}
