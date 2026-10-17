import { Field, TAU, clamp, hash } from '../field';
import { scatter, type Perch, type SceneContext, type Setting } from '../life';

interface Stone extends Perch {
  /** How far the stone reaches down into the river. */
  h: number;
}

/**
 * A waterfall and river: mossy cliffs with leafy trees on top, the fall pouring into mist towards one end, and a
 * river running away from it past stepping stones.
 */
export function waterfall(c: SceneContext): Setting<Stone> {
  const { W, H, k, r, y0, depthAt, frogAt } = c;
  const light: 1 | -1 = -1;
  const fx = W * (r() < 0.5 ? 0.18 + 0.12 * r() : 0.7 + 0.12 * r());
  const fw = Math.max(2.5 * k, W * 0.05);
  const riverEnd = Math.round(y0 + (H - y0) * 0.72);
  /** The river runs away from the fall. */
  const flow = fx < W / 2 ? 1 : -1;
  const ph = r() * TAU;
  // The cliff top: ragged, dipping where the water pours over.
  const cliff = Float32Array.from({ length: W }, (_, x) =>
    y0 * 0.22 + (Math.sin((x * 0.11) / k + ph) + 0.5 * Math.sin((x * 0.31) / k + ph * 3)) * 0.8 * k +
    Math.max(0, 1 - Math.abs(x - fx) / (fw * 2.2)) * 1.5 * k);
  const col = Float32Array.from({ length: W }, () => r() * TAU);

  const B = new Field(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let val: number;
      if (y < cliff[x]) val = 0.9 - 0.06 * (y / Math.max(1, cliff[x]));
      else if (y < y0) {
        // Ledges of rock with moss along their tops, cracked here and there, darker towards the water.
        const band = (y + (0.7 * Math.sin((x * 0.07) / k + ph * 2) + 0.35 * Math.sin((x * 0.21) / k + ph)) * k) / (3.4 * k);
        const along = band - Math.floor(band);
        const grain = hash(`${x},${y}`) % 100 < 9 ? 0.05 : 0;
        val = along < 0.3 ? 0.4 + 0.08 * (1 - along / 0.3) + grain : 0.15 + 0.05 * along + grain;
        if (along >= 0.3 && hash(`crack:${Math.floor((x + band * 3) / (1.6 * k))}`) % 8 === 0) val -= 0.07;
        val -= 0.1 * ((y - cliff[x]) / Math.max(1, y0 - cliff[x])) ** 2;
      } else if (y < riverEnd) val = 0.5;
      else val = 0.24 - 0.08 * ((y - riverEnd) / Math.max(1, H - riverEnd)) + (hash(`${x},${y}`) % 100 < 10 ? 0.06 : 0);
      B.v[y * W + x] = val;
    }
  }
  // Leafy trees along the cliff top, none over the fall.
  for (let tx = r() * 4 * k; tx < W; tx += (5 + 5 * r()) * k) {
    if (Math.abs(tx - fx) < fw * 2.5) continue;
    const R = (2.2 + 1.8 * r()) * k, cy = cliff[Math.min(W - 1, Math.round(tx))] - R * 0.6;
    B.ell(tx, cy, R, R * 0.85, 0, (_o, q, u, w) => 0.28 + 0.16 * (0.5 + 0.5 * u * light) - 0.08 * w - 0.04 * q);
  }

  // The river is the band of water between its banks. Stones stand at least 3.5 units inside it, which keeps the spot
  // a frog swimming up climbs onto (a little below a stone's middle) in the water for the biggest stone, and none stands
  // in the fall's pool.
  const top = y0 + 0.5 * k, bottom = riverEnd - 0.5 * k;
  const stones = scatter(c, Math.max(c.frogs + 2, Math.round(W / (18 * k))), (): Stone | undefined => {
    const y = y0 + 3.5 * k + r() * Math.max(1, riverEnd - y0 - 7 * k);
    const p = depthAt(y);
    // Wide enough for a frog to sit on: the core seats a frog only where twice the half-width covers most of the frog.
    const rx = Math.max((3.5 + 1.8 * r()) * k * p, 0.45 * frogAt(p).w + 0.5 * k);
    const x = rx + r() * Math.max(1, W - 2 * rx);
    if (Math.abs(x - fx) < fw * 1.8 + rx) return undefined;
    return { x, y, rx, ry: rx * 0.42, p, floats: false, ph: r() * TAU, h: (1 + r()) * k * p };
  });
  const tufts = Array.from({ length: Math.ceil(W / (4 * k)) }, () => ({ x: r() * W, h: (1.2 + 2 * r()) * k, ph: r() * TAU }));

  return {
    perches: stones,
    light,
    backdrop: B.v,
    water: (_x, y) => y > top && y < bottom,
    back(F, t) {
      const { v } = F;
      // The fall: bright streaks pouring down between dark wet rock, brightest at the lip.
      const lip = Math.floor(Math.min(cliff[clamp(Math.round(fx), 0, W - 1)], y0));
      for (let y = lip; y < y0; y++) {
        for (let x = Math.max(0, Math.floor(fx - fw - 1)); x <= Math.min(W - 1, Math.ceil(fx + fw + 1)); x++) {
          const e = Math.abs(x + 0.5 - fx) / fw;
          if (e > 1) v[y * W + x] = 0.1;
          else v[y * W + x] = (y - lip < k ? 0.97 : 0.8 + 0.18 * Math.sin((y * 0.8) / k - t * 10 + col[x])) - 0.3 * e * e;
        }
      }
      // The river: streaks running away from the fall, white water where it lands.
      for (let y = y0; y < riverEnd; y++) {
        const depth = (y - y0) / Math.max(1, riverEnd - y0);
        for (let x = 0; x < W; x++) {
          let val = 0.46 + 0.12 * depth + 0.1 * Math.sin((x * 0.25 * flow) / k - t * 3 + y * 1.7 + Math.sin(x * 0.05) * 2);
          const d = Math.hypot((x + 0.5 - fx) / (fw * 1.8), (y - y0) / (2.5 * k));
          if (d < 1) val += 0.4 * (1 - d) * (0.8 + 0.2 * Math.sin(t * 7 + x));
          v[y * W + x] = val;
        }
      }
    },
    drawPerch(F, P, top, t) {
      const f = 0.5 + 0.5 * Math.sin(t * 3 + P.ph);
      // Foam piling up on the side the water comes from.
      F.ell(P.x - flow * P.rx * 0.5, top + P.h + 0.3 * k, P.rx * (0.9 + 0.2 * f), P.ry * 0.8, 0, (old, q) => (q > 0.45 ? 0.9 : old), true);
      F.ell(P.x, top + P.h * 0.5, P.rx * 1.04, P.h * 0.6 + P.ry, 0, (_o, _q, u, w) => 0.14 + 0.14 * (0.5 + 0.5 * u * light) - 0.04 * w);
      F.ell(P.x, top, P.rx, P.ry, 0, (_o, q, u) => 0.34 + 0.2 * (0.5 + 0.5 * u * light) - 0.08 * q);
    },
    front(F, t) {
      // Mist puffing up from the foot of the fall.
      for (let i = 0; i < 5; i++) {
        const a = (t * 0.3 + i / 5) % 1;
        const R = (2.5 + 3 * a) * k;
        F.ell(fx + (i - 2) * fw * 0.6, y0 - a * 4 * k, R, R * 0.7, 0, (old, q) => old + 0.34 * (1 - a) * (1 - q), true);
      }
      for (const tf of tufts) {
        const sway = 0.6 * k * Math.sin(t * 1.3 + tf.ph);
        for (let j = 0; j < tf.h; j++) F.dot(tf.x + sway * (j / tf.h) ** 2, H - 1 - j, 0.1);
      }
    },
    fly(F, x, y) {
      F.dot(x, y, 0.08);
    },
  };
}
