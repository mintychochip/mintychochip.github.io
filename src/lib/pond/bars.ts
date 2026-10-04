import { Field } from './field';
import { LEVELS } from './palette';

export interface BarsOpts {
  /** Palette size. Every bar pixel is an exact level, so only the background gradient dithers. */
  levels?: number;
  /** Background tone at the top and bottom, 0..1. */
  bg?: [number, number];
  bgPow?: number;
  /** Level per stack index, bottom of each bar first. */
  series: readonly number[];
  /** Level of the dotted tick lines; omit for none. */
  grid?: number;
  /** Level of the baseline row; omit for none. */
  axis?: number;
  /** Bar to single out (the hovered one); every other bar drops a level so series colours stay true. */
  highlight?: number;
  /** Rows of empty space above the tallest bar. */
  headroom?: number;
  gap?: number;
  maxBar?: number;
  /** About how many tick lines to draw. */
  ticks?: number;
}

export interface BarsLayout {
  F: Field;
  /** Left edge of bar i. */
  bx: (i: number) => number;
  bw: number;
  /** Row of the top of the stack for a value. */
  sy: (value: number) => number;
  ticks: { value: number; y: number }[];
  max: number;
  peak: number;
}

/** 1, 2, 2.5 or 5 times a power of ten, at least `raw`. */
export function niceStep(raw: number): number {
  if (!(raw > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= raw) return m * p;
  return 10 * p;
}

/** Stacked bars drawn into a tone field. `rows[i]` holds bar i's stack values, bottom first. */
export function bars(W: number, H: number, rows: readonly (readonly number[])[], o: BarsOpts): BarsLayout {
  const top = (o.levels ?? LEVELS) - 1;
  const lv = (n: number) => Math.min(top, Math.max(0, n)) / top;
  const F = new Field(W, H);
  const [bgTop, bgBot] = o.bg ?? [0, 0];
  for (let y = 0; y < H; y++) {
    const val = bgTop + (bgBot - bgTop) * Math.pow(y / Math.max(1, H - 1), o.bgPow ?? 1);
    F.v.fill(val, y * W, (y + 1) * W);
  }
  const sums = rows.map((r) => r.reduce((a, b) => a + b, 0));
  const peak = sums.length ? sums.indexOf(Math.max(...sums)) : -1;
  const step = niceStep((Math.max(0, ...sums) || 1) / (o.ticks ?? 3));
  const max = Math.max(step, Math.ceil((Math.max(0, ...sums) || 1) / step) * step);
  const base = H - 2, head = o.headroom ?? 2;
  const sy = (m: number) => base - Math.round((m * (base - head)) / max);
  const ticks: { value: number; y: number }[] = [];
  for (let m = step; m <= max + 1e-9; m += step) ticks.push({ value: m, y: sy(m) });
  if (o.grid !== undefined) for (const tk of ticks) for (let x = 0; x < W; x += 2) F.v[tk.y * W + x] = lv(o.grid);
  const n = rows.length, gap = o.gap ?? 2;
  const bw = Math.max(1, Math.min(o.maxBar ?? Infinity, Math.floor((W - (n - 1) * gap) / Math.max(1, n))));
  const xs = Math.max(0, Math.floor((W - (n * bw + (n - 1) * gap)) / 2));
  const bx = (i: number) => xs + i * (bw + gap);
  rows.forEach((row, i) => {
    const origX = bx(i), lift = o.highlight === undefined || i === o.highlight ? 0 : -1;
    if (origX < 0 || origX >= W) return;
    const x0 = origX;
    const x1 = Math.min(W, x0 + bw);
    if (x0 >= x1) return;
    let acc = 0;
    row.forEach((m, j) => {
      const ya = sy(acc + m), yb = sy(acc);
      acc += m;
      const val = lv((o.series[j] ?? top) + lift);
      for (let y = Math.max(0, ya); y < yb; y++) F.v.fill(val, y * W + x0, y * W + x1);
    });
  });
  if (o.axis !== undefined) F.v.fill(lv(o.axis), (H - 1) * W, H * W);
  return { F, bx, bw, sy, ticks, max, peak };
}
