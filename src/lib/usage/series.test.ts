import { describe, expect, it } from 'vitest';
import type { ModelUse, ModelsResponse } from './api';
import { chartData, displayName, formatUsdCompact, rangeDays, rangesFor, toDaily } from './series';

const use = (name: string, total: number, cost: number | null = null): ModelUse => ({
  model: name, provider: null, name, variant: null,
  input_tokens: total, output_tokens: 0, total_tokens: total, estimated_cost_usd: cost,
});

const resp = (points: ModelsResponse['points']): ModelsResponse => ({
  schema_version: 1, from: points[0]?.date ?? '2026-01-01', to: points.at(-1)?.date ?? '2026-01-01', models: [], points,
});

describe('toDaily', () => {
  it('fills missing days with zeros and merges models by display name', () => {
    const d = toDaily(resp([
      { date: '2026-08-01', models: [use('a/gpt', 5, 1.5), use('b/gpt', 2)] },
      { date: '2026-08-04', models: [use('Unknown model', 7, null)] },
    ]));
    expect(d.dates).toEqual(['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04']);
    expect(d.totals).toEqual([7, 0, 0, 7]);
    expect(d.byName[0].get('gpt')).toBe(7);
    expect(d.cost).toBe(1.5);
  });

  it('reports no cost when no model has one', () => {
    expect(toDaily(resp([{ date: '2026-08-01', models: [use('x', 1)] }])).cost).toBeNull();
  });
});

describe('chartData', () => {
  const daily = toDaily(resp([
    { date: '2026-08-01', models: [use('Unknown model', 100), use('luna', 10), use('sol', 1)] },
    { date: '2026-08-02', models: [use('luna', 20), use('sol', 5), use('tiny', 2)] },
    { date: '2026-08-03', models: [use('sol', 30)] },
  ]));

  it('stacks everything else under the two biggest named models', () => {
    const c = chartData(daily, 3);
    expect(c.series).toEqual(['everything else', 'sol', 'luna']);
    expect(c.rows).toEqual([[100, 1, 10], [2, 5, 20], [0, 30, 0]]);
    expect(c.totals).toEqual([111, 27, 30]);
    expect(c.from).toBe('2026-08-01');
    expect(c.to).toBe('2026-08-03');
  });

  it('only counts the window when picking models', () => {
    const c = chartData(daily, 1);
    expect(c.series).toEqual(['everything else', 'sol']);
    expect(c.rows).toEqual([[0, 30]]);
  });

  it('switches to weekly bars for long windows', () => {
    const points = Array.from({ length: 140 }, (_, i) => ({
      date: new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10),
      models: [use('luna', 1)],
    }));
    const c = chartData(toDaily(resp(points)), 140);
    expect(c.bucket).toBe(7);
    expect(c.rows).toHaveLength(20);
    expect(c.totals[0]).toBe(7);
  });
});

describe('ranges', () => {
  it('offers presets shorter than the data, then all', () => {
    expect(rangesFor(47)).toEqual(['7d', '30d', 'all']);
    expect(rangesFor(5)).toEqual(['all']);
    expect(rangeDays('30d', 47)).toBe(30);
    expect(rangeDays('all', 47)).toBe(47);
  });
});

describe('formatting', () => {
  it('drops routing prefixes from model names', () => {
    expect(displayName('openai-codex/gpt-5.6-luna')).toBe('gpt-5.6-luna');
    expect(displayName('Unknown model')).toBe('Unknown model');
  });

  it('compacts dollars', () => {
    expect(formatUsdCompact(10_912)).toBe('$10.9K');
    expect(formatUsdCompact(882.7)).toBe('$883');
  });
});
