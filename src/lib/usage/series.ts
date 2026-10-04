import type { ModelsResponse } from './api';

export interface Daily {
  /** Every date from the first point to the last, ascending, including empty days. */
  dates: string[];
  totals: number[];
  byName: Map<string, number>[];
  /** Estimated cost over all days, from the models that report one. */
  cost: number | null;
}

export type RangeId = '7d' | '30d' | '90d' | '1y' | 'all';
const RANGE_LEN: Record<Exclude<RangeId, 'all'>, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };

export interface ChartData {
  /** Series names, bottom of the stack first. */
  series: string[];
  rows: number[][];
  totals: number[];
  /** First date of each bar. */
  starts: string[];
  /** Days per bar. */
  bucket: number;
  from: string;
  to: string;
}

const OTHER = 'everything else';

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Model names without the routing prefix: `openai-codex/gpt-5.6-luna` becomes `gpt-5.6-luna`. */
export function displayName(name: string): string {
  return name.slice(name.lastIndexOf('/') + 1) || name;
}

export function toDaily(resp: ModelsResponse): Daily {
  const byDate = new Map<string, Map<string, number>>();
  let cost = 0, anyCost = false;
  for (const p of resp.points) {
    const day = byDate.get(p.date) ?? new Map<string, number>();
    for (const seg of p.models) {
      const name = displayName(seg.name || seg.model);
      day.set(name, (day.get(name) ?? 0) + (seg.total_tokens || 0));
      if (seg.estimated_cost_usd != null) {
        cost += seg.estimated_cost_usd;
        anyCost = true;
      }
    }
    byDate.set(p.date, day);
  }
  const known = [...byDate.keys()].sort();
  const dates: string[] = [];
  if (known.length) for (let d = known[0]; d <= known[known.length - 1]; d = addDays(d, 1)) dates.push(d);
  const byName = dates.map((d) => byDate.get(d) ?? new Map<string, number>());
  const totals = byName.map((m) => [...m.values()].reduce((a, b) => a + b, 0));
  return { dates, totals, byName, cost: anyCost ? cost : null };
}

/** The preset ranges shorter than the data, then 'all'. */
export function rangesFor(days: number): RangeId[] {
  const out = (Object.keys(RANGE_LEN) as Exclude<RangeId, 'all'>[]).filter((r) => RANGE_LEN[r] < days);
  return [...out, 'all'];
}

export function rangeDays(range: RangeId, days: number): number {
  return range === 'all' ? days : Math.min(days, RANGE_LEN[range]);
}

/**
 * Bars for the last `days` days of data: the `top` biggest named models in that window,
 * with everything else (unattributed tokens included) stacked underneath. Long windows use weekly bars.
 */
export function chartData(daily: Daily, days: number, top = 2): ChartData {
  const n = Math.min(days, daily.dates.length);
  const start = daily.dates.length - n;
  const window = daily.byName.slice(start);
  const sums = new Map<string, number>();
  for (const day of window) for (const [name, v] of day) sums.set(name, (sums.get(name) ?? 0) + v);
  const picks = [...sums]
    .filter(([name, v]) => v > 0 && !/^unknown\b/i.test(name))
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([name]) => name);
  const bucket = n > 120 ? 7 : 1;
  const rows: number[][] = [], starts: string[] = [], totals: number[] = [];
  for (let i = 0; i < n; i += bucket) {
    const row = new Array(picks.length + 1).fill(0);
    let total = 0;
    for (const day of window.slice(i, i + bucket)) {
      for (const [name, v] of day) {
        const j = picks.indexOf(name);
        row[j < 0 ? 0 : j + 1] += v;
        total += v;
      }
    }
    rows.push(row);
    totals.push(total);
    starts.push(daily.dates[start + i]);
  }
  return {
    series: [OTHER, ...picks],
    rows,
    totals,
    starts,
    bucket,
    from: daily.dates[start] ?? '',
    to: daily.dates[daily.dates.length - 1] ?? '',
  };
}

export function formatUsdCompact(n: number): string {
  if (n >= 1000) return `$${(Math.round(n / 100) / 10).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}
