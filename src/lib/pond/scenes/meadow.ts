import { Field, TAU, clamp, hash, mul, set } from '../field';
import { scatter, type Perch, type SceneContext, type Setting } from '../life';
import { INK } from '../palette';
import { halo } from '../sky';

interface Seat extends Perch {
  mushroom: boolean;
  /** How far the stone, or the mushroom's stem, reaches down to the grass. */
  h: number;
}

/** Cloud puffs as [dx, dy, radius], in units of the cloud's size. */
const PUFFS: readonly (readonly [number, number, number])[] = [[-1.1, 0.25, 0.75], [0, -0.25, 1], [1, 0.15, 0.85], [0.45, 0.45, 0.7], [-0.45, 0.45, 0.7]];

/**
 * A meadow by day: rolling hills fading into a blue sky with puffy clouds, one round tree, tall grass and
 * wildflowers, mossy stones and spotted mushrooms to sit on, and butterflies. There is no water.
 */
export function meadow(c: SceneContext): Setting<Seat> {
  const { W, H, k, r, y0, depthAt, frogAt } = c;
  const sun = { x: W * (0.15 + 0.7 * r()), y: y0 * (0.18 + 0.14 * r()), R: Math.max(3, Math.min(W, H) * 0.08) };
  const light: 1 | -1 = sun.x >= W / 2 ? 1 : -1;
  // Three rolling hills, palest furthest away.
  const hills = [
    { base: 6.5, amp: 2.2, f: 0.035, tone: 0.72 },
    { base: 4, amp: 1.8, f: 0.05, tone: 0.58 },
    { base: 1.5, amp: 1.4, f: 0.07, tone: 0.38 },
  ].map(({ base, amp, f, tone }) => {
    const ph = r() * TAU;
    const top = Float32Array.from({ length: W }, (_, x) => y0 - (base + amp * (Math.sin((x * f) / k + ph) + 0.5 * Math.sin((x * f * 2.3) / k + ph * 1.7))) * k);
    return { top, tone };
  });
  const tx = Math.round(W * (0.15 + 0.7 * r()));
  const ty = hills[0].top[clamp(tx, 0, W - 1)];

  const B = new Field(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let val: number;
      if (y < y0) {
        const d = Math.hypot(x + 0.5 - sun.x, y + 0.5 - sun.y);
        val = d < sun.R ? 1 : Math.min(0.97, 0.86 + 0.09 * (y / Math.max(1, y0)) + halo(d, sun.R, 0.1, 2));
        for (const hl of hills) if (y >= hl.top[x]) val = hl.tone - 0.03 * Math.min(1, (y - hl.top[x]) / (4 * k));
      } else {
        const depth = (y - y0) / Math.max(1, H - y0);
        val = 0.42 - 0.14 * depth + 0.03 * Math.sin(x * 1.7 + y * 0.9) + (hash(`${x},${y}`) % 100 < 8 ? 0.06 : 0);
      }
      B.v[y * W + x] = val;
    }
  }
  // One round tree on the far hill.
  B.line(tx, ty, tx, ty - 3 * k, 0.3);
  B.ell(tx, ty - 3.6 * k, 2.4 * k, 2 * k, 0, (_o, q, u, w) => 0.42 + 0.12 * (0.5 + 0.5 * u * light) - 0.06 * w - 0.04 * q);

  const PETALS = [INK.petalPink, INK.petalYellow, INK.petalWhite];
  const flowers = Array.from({ length: Math.min(80, Math.round((W * (H - y0)) / 90)) }, () => ({
    x: Math.floor(r() * W), y: Math.floor(y0 + 2 * k + r() * Math.max(1, H - y0 - 3 * k)), ink: PETALS[Math.floor(r() * PETALS.length)],
  }));
  const seats = scatter(c, Math.max(c.frogs + 2, Math.round(W / (20 * k))), (): Seat => {
    const ground = y0 + 4 * k + r() * Math.max(1, H - y0 - 7 * k);
    const p = depthAt(ground);
    const mushroom = r() < 0.3;
    // Wide enough for a frog to sit on: the core seats a frog only where twice the half-width covers most of the
    // frog, and the meadow stones run small near the horizon. The extra roll keeps every width distinct.
    const rx = Math.max((4.5 + (mushroom ? 2 : 3.5) * r()) * k * p, 0.45 * frogAt(p).w + (0.5 + 0.5 * r()) * k);
    const x = rx + r() * Math.max(1, W - 2 * rx);
    const h = (mushroom ? 3 + 2 * r() : 1.5 + 1.5 * r()) * k * p;
    return { x, y: ground - h, rx, ry: rx * (mushroom ? 0.32 : 0.4), p, floats: false, ph: r() * TAU, mushroom, h };
  });
  const clouds = Array.from({ length: 2 + Math.floor(r() * 3) }, () => ({
    x: r() * W, y: y0 * (0.15 + 0.4 * r()), s: (2.2 + 1.8 * r()) * k, v: (0.4 + 0.6 * r()) * k,
  }));
  const flutter = Array.from({ length: W > 90 ? 3 : 2 }, () => ({
    cx: r() * W, cy: y0 * (0.6 + 0.6 * r()), ax: (8 + 14 * r()) * k, ay: (2 + 3 * r()) * k,
    fx: 0.25 + 0.3 * r(), fy: 0.5 + 0.6 * r(), ph: r() * TAU, ink: r() < 0.5 ? INK.petalYellow : INK.petalPink,
  }));
  const blades = Array.from({ length: Math.ceil(W / 2) }, (_, i) => ({ x: i * 2 + (r() < 0.5 ? 0 : 1), h: (1.5 + 2.5 * r()) * k, ph: r() * TAU }));

  /** A mushroom cap: red, a darker rim, white spots, domed under the seat at `top`. */
  function cap(F: Field, P: Seat, top: number) {
    const cx = P.x, cy = top + P.ry * 0.4, ax = P.rx * 1.1, ay = P.ry * 1.6;
    for (let y = Math.floor(cy - ay); y <= Math.ceil(cy + ay); y++) {
      for (let x = Math.floor(cx - ax); x <= Math.ceil(cx + ax); x++) {
        const u = (x + 0.5 - cx) / ax, w = (y + 0.5 - cy) / ay;
        if (u * u + w * w > 1) continue;
        const spot = w < 0.2 && (Math.round(x - cx) * 3 + Math.round(y - cy) * 5 + Math.round(P.ph * 7)) % 7 === 0;
        F.paint(x, y, w > 0.45 ? INK.capShade : spot ? INK.eye : INK.capRed);
      }
    }
  }

  return {
    perches: seats,
    light,
    backdrop: B.v,
    back(F, t) {
      for (const cl of clouds) {
        const span = W + 6 * cl.s;
        const x = ((((cl.x + cl.v * t) % span) + span) % span) - 3 * cl.s;
        for (const [dx, dy, rr] of PUFFS) F.ell(x + dx * cl.s, cl.y + dy * cl.s, rr * cl.s, rr * cl.s * 0.8, 0, (_o, _q, _u, w) => 1 - 0.07 * Math.max(0, w));
      }
      for (const fl of flowers) F.paint(fl.x, fl.y, fl.ink);
    },
    drawPerch(F, P, top) {
      F.ell(P.x - light * P.rx * 0.25, top + P.h + 0.4 * k, P.rx * 1.1, Math.max(1, P.ry * 0.7), 0, mul(0.65));
      if (P.mushroom) {
        F.ell(P.x, top + P.h * 0.55, Math.max(1, P.rx * 0.26), P.h * 0.55, 0, (_o, _q, u) => 0.82 + 0.1 * u * light);
        cap(F, P, top);
      } else {
        F.ell(P.x, top + P.h * 0.5, P.rx * 1.02, P.h * 0.6 + P.ry * 0.9, 0, (_o, _q, u, w) => 0.16 + 0.08 * (0.5 + 0.5 * u * light) - 0.04 * w);
        F.ell(P.x, top + 1, P.rx * 1.05, P.ry * 1.15, 0, set(0.1));
        F.ell(P.x, top, P.rx, P.ry, 0, (_o, q, u) => 0.44 + 0.2 * (0.5 + 0.5 * u * light) - 0.08 * q);
      }
    },
    front(F, t) {
      for (const b of blades) {
        const sway = 0.8 * k * Math.sin(t * 1.1 + b.ph + b.x * 0.05);
        for (let j = 0; j < b.h; j++) {
          const rel = j / b.h;
          F.dot(b.x + sway * rel * rel, H - 1 - j, rel > 0.7 ? 0.3 : 0.14);
        }
      }
      for (const b of flutter) {
        const x = Math.round(b.cx + b.ax * Math.sin(t * b.fx + b.ph)), y = Math.round(b.cy + b.ay * Math.sin(t * b.fy + b.ph * 2));
        const up = Math.sin(t * 9 + b.ph) > 0 ? 1 : 0;
        F.paint(x, y, INK.line);
        for (let i = 1; i <= 2; i++) {
          F.paint(x - i, y - up, b.ink);
          F.paint(x + i, y - up, b.ink);
        }
      }
    },
    fly(F, x, y) {
      F.dot(x, y, 0.12);
    },
  };
}
