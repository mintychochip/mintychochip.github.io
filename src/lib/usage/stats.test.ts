import { describe, it, expect } from 'vitest';
import {
  summarizeModels,
  summarizeSeries,
  formatCompactTokens,
  formatUsd,
  formatDate,
  dateRangeLabel,
  metricLabel,
} from './stats';
import type { ModelsResponse, SeriesResponse, Metric } from './api';

const metrics = ['input_tokens', 'output_tokens', 'total_tokens', 'estimated_cost_usd'] as const satisfies readonly Metric[];

const gptDay = {
  model: 'gpt-4o' as const,
  provider: 'openai' as const,
  name: 'GPT-4o' as const,
  variant: 'mini' as const,
};

const claudeDay = {
  model: 'claude-sonnet-4' as const,
  provider: 'anthropic' as const,
  name: 'Claude 3.5 Sonnet' as const,
  variant: null,
};

const modelPoints: ModelsResponse['points'] = [
  {
    date: '2026-07-11',
    models: [
      { ...gptDay, input_tokens: 100, output_tokens: 50, total_tokens: 150, estimated_cost_usd: 0.01 },
      { ...claudeDay, input_tokens: 200, output_tokens: 100, total_tokens: 300, estimated_cost_usd: 0.02 },
    ],
  },
  {
    date: '2026-07-12',
    models: [
      { ...gptDay, input_tokens: 150, output_tokens: 100, total_tokens: 250, estimated_cost_usd: 0.015 },
      { ...claudeDay, input_tokens: 250, output_tokens: 150, total_tokens: 400, estimated_cost_usd: null },
    ],
  },
  {
    date: '2026-07-13',
    models: [
      { ...gptDay, input_tokens: 50, output_tokens: 50, total_tokens: 100, estimated_cost_usd: null },
      { ...claudeDay, input_tokens: 100, output_tokens: 50, total_tokens: 150, estimated_cost_usd: null },
    ],
  },
];

const topLevelModels: ModelsResponse['models'] = [
  { ...claudeDay, input_tokens: 550, output_tokens: 300, total_tokens: 850, estimated_cost_usd: 0.06 },
  { ...gptDay, input_tokens: 300, output_tokens: 200, total_tokens: 500, estimated_cost_usd: 0.03 },
];

const modelsResp: ModelsResponse = {
  schema_version: 1,
  from: '2026-07-11',
  to: '2026-08-26',
  models: topLevelModels,
  points: modelPoints,
};

const modelsRespNoCost: ModelsResponse = {
  ...modelsResp,
  points: modelPoints.map((p) => ({
    ...p,
    models: p.models.map((m) => ({ ...m, estimated_cost_usd: null })),
  })),
};

const seriesResp: SeriesResponse = {
  schema_version: 1,
  from: '2026-07-11',
  to: '2026-08-26',
  metrics: ['input_tokens', 'output_tokens', 'total_tokens', 'estimated_cost_usd'],
  harnesses: null,
  points: [
    { date: '2026-07-11', input_tokens: 300, output_tokens: 150, total_tokens: 450, estimated_cost_usd: 0.03 },
    { date: '2026-07-12', input_tokens: 400, output_tokens: 250, total_tokens: 650, estimated_cost_usd: 0.015 },
    { date: '2026-07-13', input_tokens: 150, output_tokens: 100, total_tokens: 250, estimated_cost_usd: null },
  ],
};

const seriesRespNoCost: SeriesResponse = {
  ...seriesResp,
  points: seriesResp.points.map((p) => ({ ...p, estimated_cost_usd: null })),
};

describe('summarizeModels', () => {
  it('aggregates tokens, averages, peaks, top model, cost, and date range', () => {
    const s = summarizeModels(modelsResp);
    expect(s.totalTokens).toBe(1350);
    expect(s.averageTokens).toBe(450);
    expect(s.peakTokens).toBe(650);
    expect(s.peakLabel).toBe('on Jul 12');
    expect(s.topModel).toEqual({ label: 'Claude 3.5 Sonnet', tokens: 850 });
    expect(s.totalCostUsd).toBe(0.045);
    expect(s.dateRangeLabel).toBe('Jul 11 – Jul 13');
  });

  it('returns null cost when every estimated_cost_usd is null', () => {
    const s = summarizeModels(modelsRespNoCost);
    expect(s.totalTokens).toBe(1350);
    expect(s.totalCostUsd).toBeNull();
  });

  it('handles empty points and model lists', () => {
    const s = summarizeModels({ ...modelsResp, points: [], models: [] });
    expect(s.totalTokens).toBe(0);
    expect(s.averageTokens).toBe(0);
    expect(s.peakTokens).toBe(0);
    expect(s.peakLabel).toBe('');
    expect(s.topModel).toBeNull();
    expect(s.totalCostUsd).toBeNull();
    expect(s.dateRangeLabel).toBe('loaded range');
  });
});

describe('summarizeSeries', () => {
  it('aggregates points and leaves top model null', () => {
    const s = summarizeSeries(seriesResp, metrics);
    expect(s.totalTokens).toBe(1350);
    expect(s.averageTokens).toBe(450);
    expect(s.peakTokens).toBe(650);
    expect(s.peakLabel).toBe('on Jul 12');
    expect(s.topModel).toBeNull();
    expect(s.totalCostUsd).toBe(0.045);
    expect(s.dateRangeLabel).toBe('Jul 11 – Jul 13');
  });

  it('returns null cost when every estimated_cost_usd is null', () => {
    const s = summarizeSeries(seriesRespNoCost, metrics);
    expect(s.totalTokens).toBe(1350);
    expect(s.totalCostUsd).toBeNull();
  });
});

describe('formatCompactTokens', () => {
  it('formats billions', () => {
    expect(formatCompactTokens(1e9)).toBe('1.0B');
    expect(formatCompactTokens(1234567890)).toBe('1.2B');
    expect(formatCompactTokens(1950000000)).toBe('2.0B');
  });

  it('formats millions', () => {
    expect(formatCompactTokens(1e6)).toBe('1.0M');
    expect(formatCompactTokens(1234567)).toBe('1.2M');
  });

  it('formats thousands', () => {
    expect(formatCompactTokens(1e4)).toBe('10k');
    expect(formatCompactTokens(12345)).toBe('12k');
  });

  it('falls back to a locale string for smaller numbers', () => {
    expect(formatCompactTokens(9999)).toBe('9,999');
    expect(formatCompactTokens(1234)).toBe('1,234');
  });

  it('treats non-finite values as 0', () => {
    expect(formatCompactTokens(NaN)).toBe('0');
    expect(formatCompactTokens(Infinity)).toBe('0');
    expect(formatCompactTokens(-Infinity)).toBe('0');
  });

  it('does not special-case negative finite values', () => {
    expect(formatCompactTokens(-12345)).toBe('-12,345');
  });
});

describe('formatUsd', () => {
  it('formats USD with two fraction digits', () => {
    expect(formatUsd(0.045)).toBe('$0.05');
    expect(formatUsd(1234.5)).toBe('$1,234.50');
    expect(formatUsd(0)).toBe('$0.00');
  });
});

describe('formatDate', () => {
  it('returns month short and day', () => {
    expect(formatDate('2026-07-11')).toBe('Jul 11');
    expect(formatDate('2026-08-26')).toBe('Aug 26');
  });

  it('returns the original string for an invalid date', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });
});

describe('dateRangeLabel', () => {
  it('returns loaded range when there are no dates', () => {
    expect(dateRangeLabel([])).toBe('loaded range');
  });

  it('formats a single date', () => {
    expect(dateRangeLabel(['2026-07-11'])).toBe('Jul 11');
  });

  it('sorts, dedupes, and joins the first and last dates', () => {
    expect(dateRangeLabel(['2026-08-26', '2026-07-11', '2026-08-26'])).toBe('Jul 11 – Aug 26');
  });
});

describe('metricLabel', () => {
  it('maps metric keys to human labels', () => {
    expect(metricLabel('input_tokens')).toBe('Input tokens');
    expect(metricLabel('output_tokens')).toBe('Output tokens');
    expect(metricLabel('total_tokens')).toBe('Total tokens');
    expect(metricLabel('estimated_cost_usd')).toBe('Estimated cost (USD)');
  });
});
