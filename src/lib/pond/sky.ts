import { TAU, hash, type Field } from './field';
import type { SceneContext } from './life';

/**
 * A silhouette line per column, as the row its top reaches: a wavy base `base` units above the horizon (units are
 * art pixels per frog unit, `k`), with triangular spikes `hMin`..`hMax` units tall every `step` units, each about
 * `spread` times as wide as it is tall. Narrow spikes are pines, wide ones mountain peaks.
 */
export function ridge(c: SceneContext, base: number, wave: number, hMin: number, hMax: number, step: number, spread = 0.26): Float32Array {
  const { W, k, r, y0 } = c;
  const a = new Float32Array(W), ph = r() * 10;
  for (let x = 0; x < W; x++) a[x] = y0 - (base + wave * (Math.sin((x * 0.09) / k + ph) + 0.6 * Math.sin((x * 0.23) / k + ph * 2))) * k;
  for (let tx = -4 * k; tx < W + 4 * k; tx += (step + 4 * r()) * k) {
    const th = (hMin + (hMax - hMin) * r() * r()) * k, hw = th * (spread + 0.1 * r());
    for (let x = Math.max(0, Math.floor(tx - hw)); x <= Math.min(W - 1, Math.ceil(tx + hw)); x++) {
      const dx = Math.abs(x + 0.5 - tx) / hw;
      if (dx <= 1) a[x] = Math.min(a[x], y0 - base * k - th * (1 - dx));
    }
  }
  return a;
}

export interface Star {
  x: number;
  y: number;
  ph: number;
  sp: number;
}

/** Stars over the top `rows` rows, about one per 70 pixels, kept where `free` allows. */
export function scatterStars(c: SceneContext, rows: number, free: (x: number, y: number) => boolean): Star[] {
  const { W, r } = c;
  return Array.from({ length: Math.round((W * rows) / 70) }, () => ({
    x: Math.floor(r() * W), y: Math.floor(r() * rows * 0.8), ph: r() * TAU, sp: 0.8 + 2 * r(),
  })).filter((s) => free(s.x, s.y));
}

/** Twinkles the stars over whatever is already drawn there. */
export function drawStars(F: Field, stars: readonly Star[], t: number) {
  const { v, W } = F;
  for (const s of stars) {
    const i = s.y * W + s.x;
    v[i] = Math.max(v[i], 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph)));
  }
}

/** Per-row randomness for a light's glitter on water, from row `from` down, re-rolled three times a second. */
export function glitterRows(rows: Float32Array, from: number, t: number) {
  for (let y = from; y < rows.length; y++) rows[y] = hash(`${y}:${Math.floor(t * 3 + y * 0.37)}`) / 4294967296;
}

/**
 * How much a light of radius `R` over column `cx` brightens water at (x, y), where `depth` runs 0 at the horizon to
 * 1 at the near edge and `row` is that row's glitter from `glitterRows`.
 */
export function glitter(x: number, y: number, t: number, depth: number, cx: number, R: number, row: number): number {
  const gw = R * (0.35 + 1.1 * depth) * (0.35 + 0.9 * row);
  const mdx = Math.abs(x + 0.5 - (cx + (row - 0.5) * R * 0.6));
  if (mdx >= gw || Math.sin(y * 1.25 + t * 2.1 + Math.sin(x * 0.45 + t * 0.9) * 1.3) <= 0.3) return 0;
  return 0.72 * Math.pow(1 - mdx / gw, 1.2) * (1 - 0.5 * depth);
}

/** Glow `amp` at distance `d` from the centre of a disc of radius `R`, fading out over `reach` radii past its edge. */
export function halo(d: number, R: number, amp: number, reach = 2.6): number {
  if (d < R || d >= R * (1 + reach)) return 0;
  return amp * Math.pow(1 - (d - R) / (R * reach), 2.2);
}
