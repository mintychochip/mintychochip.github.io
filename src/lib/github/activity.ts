/// <reference lib="dom" />
import { Field } from '../pond/field';
import { site } from '../site';

export interface ContribDay {
  date: string;
  count: number;
  level: number;
}

export interface ActivitySummary {
  totalLastYear: number;
  currentStreak: number;
  longestStreak: number;
  best: { date: string; count: number };
  /** One GitHub-style column per week (7 rows, Sunday first). */
  columns: number[][];
  days: ContribDay[];
}

const LEVEL_MAP = [1, 3, 4, 5, 6];

export function levelToShade(level: number): number {
  const i = Math.max(0, Math.min(4, Math.floor(level)));
  return LEVEL_MAP[i] / 7;
}

/** Swatch colours for GitHub contribution levels 0–4, matching `quantize` at each tone (no dither). */
export function heatmapLegendColors(palette: readonly string[]): string[] {
  const L = palette.length - 1;
  return [0, 1, 2, 3, 4].map((gh) => {
    const tone = levelToShade(gh);
    const val = tone * L;
    const idx = Math.min(L, Math.floor(val + 1e-4));
    return palette[idx];
  });
}

function parseDay(raw: unknown): ContribDay | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) return null;
  const count = typeof r.count === 'number' && r.count >= 0 ? r.count : 0;
  const level = typeof r.level === 'number' ? r.level : count > 0 ? 1 : 0;
  return { date: r.date, count, level };
}

export function toWeekColumns(days: ContribDay[]): number[][] {
  const cols: number[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    const col: number[] = [];
    for (let r = 0; r < 7; r++) col.push(days[i + r]?.level ?? 0);
    cols.push(col);
  }
  return cols;
}

/** Consecutive-day streaks from sorted contribution days (count > 0). */
export function streaks(days: ContribDay[]): { current: number; longest: number } {
  const active = days.filter((d) => d.count > 0).map((d) => d.date);
  if (!active.length) return { current: 0, longest: 0 };
  active.sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < active.length; i++) {
    const prev = Date.parse(`${active[i - 1]}T12:00:00Z`);
    const cur = Date.parse(`${active[i]}T12:00:00Z`);
    if (cur - prev === 86_400_000) run++;
    else {
      longest = Math.max(longest, run);
      run = 1;
    }
  }
  longest = Math.max(longest, run);

  let current = 1;
  for (let i = active.length - 1; i > 0; i--) {
    const prev = Date.parse(`${active[i - 1]}T12:00:00Z`);
    const cur = Date.parse(`${active[i]}T12:00:00Z`);
    if (cur - prev === 86_400_000) current++;
    else break;
  }
  return { current, longest };
}

export function summarize(days: ContribDay[], totalLastYear: number): ActivitySummary {
  const best = days.reduce(
    (b, d) => (d.count > b.count ? { date: d.date, count: d.count } : b),
    { date: days[0]?.date ?? '', count: 0 },
  );
  const { current, longest } = streaks(days);
  return {
    totalLastYear,
    currentStreak: current,
    longestStreak: longest,
    best,
    columns: toWeekColumns(days),
    days,
  };
}

export function parseContributions(raw: unknown): { totalLastYear: number; days: ContribDay[] } {
  if (typeof raw !== 'object' || raw === null) throw new Error('unexpected response');
  const r = raw as Record<string, unknown>;
  const total =
    typeof r.total === 'object' && r.total !== null && typeof (r.total as Record<string, unknown>).lastYear === 'number'
      ? (r.total as Record<string, number>).lastYear
      : 0;
  if (!Array.isArray(r.contributions)) throw new Error('no contributions');
  const days: ContribDay[] = [];
  for (const item of r.contributions) {
    const d = parseDay(item);
    if (d) days.push(d);
  }
  if (!days.length) throw new Error('empty year');
  days.sort((a, b) => a.date.localeCompare(b.date));
  return { totalLastYear: total, days };
}

const CONTRIB_URL = (user: string) =>
  `https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(user)}?y=last`;

export async function fetchContributions(user = site.githubUser, signal?: AbortSignal): Promise<ActivitySummary> {
  const res = await fetch(CONTRIB_URL(user), { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`contributions API answered ${res.status}`);
  const { totalLastYear, days } = parseContributions(await res.json());
  return summarize(days, totalLastYear);
}

export interface HeatmapLayout {
  F: Field;
  cell: number;
  gap: number;
  /** Left edge of column i in art pixels. */
  cx: (i: number) => number;
  /** Top edge of row r (0 = Sunday). */
  ry: (r: number) => number;
  cols: number;
}

/** Pixel grid for the contribution heatmap (night palette levels on a dark field). */
export function heatmapField(columns: number[][]): HeatmapLayout {
  const cell = 3;
  const gap = 1;
  const cols = columns.length;
  const W = cols * (cell + gap) - gap + 2;
  const H = 7 * (cell + gap) - gap + 2;
  const F = new Field(W, H);
  F.fill(0.12);
  const cx = (i: number) => 1 + i * (cell + gap);
  const ry = (r: number) => 1 + r * (cell + gap);
  for (let i = 0; i < cols; i++) {
    for (let r = 0; r < 7; r++) {
      const tone = levelToShade(columns[i][r] ?? 0);
      const x0 = cx(i);
      const y0 = ry(r);
      for (let y = 0; y < cell; y++) {
        for (let x = 0; x < cell; x++) {
          F.v[(y0 + y) * W + x0 + x] = tone;
        }
      }
    }
  }
  return { F, cell, gap, cx, ry, cols };
}

export function formatShortDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function columnDates(days: ContribDay[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < days.length; i += 7) out.push(days[i].date);
  return out;
}
