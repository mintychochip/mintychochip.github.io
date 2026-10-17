import { Field, TAU, clamp, hash, set } from '../field';
import { scatter, type Perch, type SceneContext, type Setting } from '../life';
import { INK } from '../palette';
import { glitter, glitterRows } from '../sky';

interface Shelf extends Perch {
  mushroom: boolean;
  /** How far the rock, or the mushroom's stalk, reaches down into the water. */
  h: number;
}

/**
 * A cave lake: stalactites overhead, crystal clusters glowing and mirrored in black water, drips that ring the
 * water, glowing mushroom caps and flat rocks to sit on, and drifting glow motes.
 */
export function cave(c: SceneContext): Setting<Shelf> {
  const { W, H, k, r, y0, depthAt, frogAt } = c;
  // A ragged ceiling with stalactites hanging from it.
  const ph = r() * TAU;
  const ceil = Float32Array.from({ length: W }, (_, x) => (1.5 + Math.sin((x * 0.08) / k + ph) + 0.5 * Math.sin((x * 0.21) / k + ph * 2)) * k);
  const tips: { x: number; y: number }[] = [];
  for (let tx = r() * 3 * k; tx < W; tx += (3 + 4 * r()) * k) {
    const len = Math.min(y0 * 0.55, (2 + ((y0 * 0.45) / k) * r() * r()) * k), hw = 0.6 + len * 0.15;
    for (let x = Math.max(0, Math.floor(tx - hw)); x <= Math.min(W - 1, Math.ceil(tx + hw)); x++) {
      const dx = Math.abs(x + 0.5 - tx) / hw;
      if (dx <= 1) ceil[x] = Math.max(ceil[x], 1.5 * k + len * (1 - dx));
    }
    if (len > 4 * k) tips.push({ x: Math.round(tx), y: 1.5 * k + len });
  }
  const n = clamp(Math.round(W / (40 * k)), 2, 4);
  const crystals = Array.from({ length: n }, (_, i) => ({
    x: W * ((i + 0.25 + 0.5 * r()) / n), y: y0 - r() * 3 * k, R: (2.5 + 2 * r()) * k, ph: r() * TAU,
    shards: Array.from({ length: 3 + Math.floor(r() * 3) }, () => ({
      dx: (r() * 2 - 1) * 2 * k, len: (2.5 + 3.5 * r()) * k, w: (0.7 + 0.6 * r()) * k, a: (r() * 2 - 1) * 0.45,
    })),
  }));
  const light: 1 | -1 = crystals[0].x >= W / 2 ? 1 : -1;

  const B = new Field(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let val: number;
      if (y < ceil[x]) val = 0.03;
      else if (y < y0) {
        const grain = Math.sin((x * 0.21) / k + Math.sin((y * 0.17) / k) * 2) * Math.sin((y * 0.31) / k + x * 0.05);
        val = y - ceil[x] < 0.8 ? 0.16 : 0.08 + 0.05 * grain + 0.06 * (y / y0);
      } else val = 0.05;
      for (const cr of crystals) val += 0.2 * Math.max(0, 1 - Math.hypot(x - cr.x, y - cr.y) / (cr.R * 3)) ** 2;
      B.v[y * W + x] = val;
    }
  }
  // Crystals: pointed prisms leaning this way and that, one face toward the light brighter, with a white tip.
  for (const cr of crystals) {
    for (const s of cr.shards) {
      const bx = cr.x + s.dx, ux = Math.sin(s.a), uy = -Math.cos(s.a);
      for (let y = Math.max(0, Math.floor(cr.y - s.len - s.w)); y < Math.min(H, Math.ceil(cr.y + 1)); y++) {
        for (let x = Math.max(0, Math.floor(bx - s.len - s.w)); x < Math.min(W, Math.ceil(bx + s.len + s.w)); x++) {
          const px = x + 0.5 - bx, py = y + 0.5 - cr.y;
          const along = (px * ux + py * uy) / s.len, across = px * -uy + py * ux;
          if (along < 0 || along > 1 || Math.abs(across) > s.w * Math.min(1, (1 - along) / 0.4)) continue;
          B.v[y * W + x] = along > 0.88 ? 1 : across * light < 0 ? 0.92 : 0.74;
        }
      }
    }
  }

  /** Drops fall from the longest stalactites, gravity in art pixels a second squared. */
  const G = 60 * k;
  const drips = tips.slice(0, 4).map((tp) => ({ ...tp, land: y0 + (1 + 4 * r()) * k, period: 2.5 + 2.5 * r(), off: r() * 5, last: 0 }));
  // Seats stand in the water below the horizon, so the spot a frog swimming up climbs onto (a little below a seat's middle)
  // is in the water too. Mushroom stalks and rock bodies reach down from a seat's top, and the tallest still ends 2 units
  // above the bottom of the frame.
  const shelves = scatter(c, Math.max(c.frogs + 2, Math.round(W / (22 * k))), (): Shelf => {
    const y = y0 + 3 * k + r() * Math.max(1, H - y0 - 11.6 * k);
    const p = depthAt(y);
    const mushroom = r() < 0.45;
    // Wide enough for a frog to sit on: the core seats a frog only where twice the half-width covers most of the frog.
    const rx = Math.max((4 + 3 * r()) * k * p, 0.45 * frogAt(p).w + 0.5 * k);
    const h = (mushroom ? 3.5 + 2 * r() : 1 + r()) * k * p;
    const x = rx + r() * Math.max(1, W - 2 * rx);
    return { x, y, rx, ry: rx * (mushroom ? 0.3 : 0.4), p, floats: false, ph: r() * TAU, mushroom, h };
  });
  const rows = new Float32Array(H);

  return {
    perches: shelves,
    light,
    backdrop: B.v,
    water: (_x, y) => y > y0 + 1,
    back(F, t) {
      glitterRows(rows, y0, t);
      const { v } = F;
      for (let y = y0; y < H; y++) {
        const depth = (y - y0) / Math.max(1, H - y0);
        for (let x = 0; x < W; x++) {
          let val = 0.04 + 0.04 * (1 - depth) + 0.02 * Math.sin((y * 1.1) / k + t * 1.2 + Math.sin((x * 0.07) / k + t * 0.3) * 2);
          for (const cr of crystals) val += 0.8 * glitter(x, y, t, depth, cr.x, cr.R, rows[y]);
          v[y * W + x] = val;
        }
      }
      // Crystals pulse; now and then one catches a spark.
      for (const cr of crystals) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 1.3 + cr.ph);
        F.ell(cr.x, cr.y - cr.R, cr.R * 2.6, cr.R * 2.2, 0, (old, q) => old + 0.12 * pulse * (1 - q), true);
        const s = cr.shards[0];
        if (hash(`${cr.ph}:${Math.floor(t * 3)}`) % 4 === 0) F.paint(cr.x + s.dx, cr.y - s.len * 0.7, INK.crystal);
      }
      for (const d of drips) {
        const fall = Math.sqrt((2 * (d.land - d.y)) / G);
        const phase = (t + d.off) % d.period;
        if (phase < fall) F.dot(d.x, d.y + 0.5 * G * phase * phase, 0.75);
        if (d.last < fall && phase >= fall) c.ripple(d.x, d.land, t, 0.6);
        d.last = phase;
      }
    },
    drawPerch(F, P, top, t) {
      if (P.mushroom) {
        // A pale stalk down into the water, a glowing cap with a darker underside, and a few bright spots.
        F.ell(P.x, top + P.h * 0.55, Math.max(1.2, P.rx * 0.2), P.h * 0.55, 0, (_o, _q, u) => 0.5 + 0.12 * u * light);
        const glow = 0.86 + 0.08 * Math.sin(t * 1.7 + P.ph);
        F.ell(P.x, top + P.ry * 0.3, P.rx * 1.9, P.ry * 2.6, 0, (old, q) => old + 0.14 * (1 - q), true);
        F.ell(P.x, top + P.ry * 0.3, P.rx * 1.05, P.ry * 1.5, 0, (_o, q, _u, w) => (w > 0.4 ? 0.55 : glow - 0.1 * q));
        for (let i = 0; i < 3; i++) F.dot(P.x + P.rx * 0.6 * Math.sin(P.ph * 3 + i * 2.1), top - P.ry * 0.1 + P.ry * 0.5 * Math.cos(P.ph + i * 1.7), 1);
      } else {
        F.ell(P.x, top + P.h * 0.5, P.rx * 1.04, P.h * 0.6 + P.ry, 0, (_o, _q, u, w) => 0.12 + 0.1 * (0.5 + 0.5 * u * light) - 0.04 * w);
        F.ell(P.x, top, P.rx, P.ry, 0, (_o, q, u) => 0.26 + 0.22 * (0.5 + 0.5 * u * light) - 0.12 * q);
      }
    },
    front() {},
    fly(F, x, y, on) {
      F.ell(x, y, 2 * k, 2 * k, 0, (old, q) => old + 0.25 * (1 - Math.sqrt(q)) * on, true);
      F.ell(x, y, 0.75, 0.75, 0, set(0.95));
    },
  };
}
