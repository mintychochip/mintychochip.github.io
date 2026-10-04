import { describe, expect, it } from 'vitest';
import { bars } from './bars';
import { heatmapField } from '../github/activity';
import { chartData, toDaily } from '../usage/series';
import type { ModelsResponse } from '../usage/api';

describe('Responsive Bars Layout', () => {
  it('prevents buffer out-of-bounds corruption on very narrow mobile widths', () => {
    // 90 bars (e.g. 90-day range) in a narrow width of 30 art pixels
    const rows = Array.from({ length: 90 }, () => [5000, 10000]);
    const layout = bars(30, 25, rows, {
      series: [3, 6],
      gap: 1,
    });

    expect(layout.F.v.every((v) => v >= 0 && v <= 1)).toBe(true);
    expect(Number.isFinite(layout.max)).toBe(true);
    expect(layout.max).toBeGreaterThan(0);
    expect(layout.bx(0)).toBeGreaterThanOrEqual(0);
    expect(layout.bx(89)).toBeLessThanOrEqual(layout.bx(90) ?? Infinity);
  });

  it('handles 1 bar on extreme narrow width (10px)', () => {
    const layout = bars(10, 20, [[100]], { series: [3], gap: 1 });
    expect(layout.F.v.every((v) => v >= 0 && v <= 1)).toBe(true);
    expect(layout.bx(0)).toBeGreaterThanOrEqual(0);
  });

  it('scales bars and ticks correctly when width is generous', () => {
    const rows = Array.from({ length: 30 }, () => [100, 200]);
    const layout = bars(200, 50, rows, { series: [3, 6], gap: 2 });
    expect(layout.F.v.every((v) => v >= 0 && v <= 1)).toBe(true);
    expect(layout.ticks.length).toBeGreaterThan(0);
  });
});

describe('Heatmap Field Responsive Layout', () => {
  it('generates non-empty field with valid boundaries for 53 weeks', () => {
    const columns = Array.from({ length: 53 }, () => [0, 1, 2, 3, 4, 1, 0]);
    const layout = heatmapField(columns);
    expect(layout.cols).toBe(53);
    expect(layout.F.W).toBeGreaterThan(200);
    expect(layout.F.H).toBe(29);
    expect(layout.F.v.every((v) => v >= 0 && v <= 1)).toBe(true);
  });
});

describe('Usage Series Responsive Bucketing', () => {
  it('buckets 365 days into weekly bars for readable mobile rendering', () => {
    const points = Array.from({ length: 365 }, (_, i) => ({
      date: new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10),
      models: [{
        model: 'test-model',
        provider: null,
        name: 'test-model',
        variant: null,
        input_tokens: 1000,
        output_tokens: 500,
        total_tokens: 1500,
        estimated_cost_usd: 0.01,
      }],
    }));

    const resp: ModelsResponse = {
      schema_version: 1,
      from: points[0].date,
      to: points[points.length - 1].date,
      models: [],
      points,
    };

    const daily = toDaily(resp);
    const data = chartData(daily, 365);
    // Over 120 days should bucket weekly (7 days per bar) so bar count is ~53 instead of 365
    expect(data.bucket).toBe(7);
    expect(data.rows.length).toBeLessThanOrEqual(53);
  });
});
