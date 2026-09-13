import type { Metric, ModelsResponse, SeriesResponse } from './api';

export interface UsageStats {
  totalTokens: number;
  averageTokens: number;
  peakTokens: number;
  peakLabel: string;
  topModel: { label: string; tokens: number } | null;
  totalCostUsd: number | null;
  dateRangeLabel: string;
}

export function summarizeModels(resp: ModelsResponse): UsageStats {
  const points = resp.points;
  const days = points.length;

  let totalTokens = 0;
  let peakTokens = 0;
  let peakDate = '';
  let anyCost = false;
  let totalCost = 0;

  for (const point of points) {
    let dayTokens = 0;
    for (const model of point.models) {
      dayTokens += model.total_tokens;
      if (model.estimated_cost_usd != null) {
        anyCost = true;
        totalCost += model.estimated_cost_usd;
      }
    }

    totalTokens += dayTokens;
    if (dayTokens > peakTokens) {
      peakTokens = dayTokens;
      peakDate = point.date;
    }
  }

  const averageTokens = days > 0 ? Math.round(totalTokens / days) : 0;
  const peakLabel = peakTokens > 0 ? `on ${formatDate(peakDate)}` : '';

  const first = resp.models[0] ?? null;
  const topModel = first
    ? { label: first.variant ? `${first.name} · ${first.variant}` : first.name, tokens: first.total_tokens }
    : null;

  return {
    totalTokens,
    averageTokens,
    peakTokens,
    peakLabel,
    topModel,
    totalCostUsd: anyCost ? totalCost : null,
    dateRangeLabel: dateRangeLabel(points.map((p) => p.date)),
  };
}

export function summarizeSeries(resp: SeriesResponse, _metrics: readonly Metric[]): UsageStats {
  const points = resp.points;
  const days = points.length;

  let totalTokens = 0;
  let peakTokens = 0;
  let peakDate = '';
  let anyCost = false;
  let totalCost = 0;

  for (const point of points) {
    const dayTokens = point.total_tokens ?? 0;
    totalTokens += dayTokens;

    if (dayTokens > peakTokens) {
      peakTokens = dayTokens;
      peakDate = point.date;
    }

    const cost = point.estimated_cost_usd;
    if (cost != null) {
      anyCost = true;
      totalCost += cost;
    }
  }

  const averageTokens = days > 0 ? Math.round(totalTokens / days) : 0;
  const peakLabel = peakTokens > 0 ? `on ${formatDate(peakDate)}` : '';

  return {
    totalTokens,
    averageTokens,
    peakTokens,
    peakLabel,
    topModel: null,
    totalCostUsd: anyCost ? totalCost : null,
    dateRangeLabel: dateRangeLabel(points.map((p) => p.date)),
  };
}

export function formatCompactTokens(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n >= 1_000_000_000) return `${(Math.round(n / 100_000_000) / 10).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(Math.round(n / 100_000) / 10).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}k`;
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function formatUsd(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  return `${month} ${d.getDate()}`;
}

export function dateRangeLabel(dates: string[]): string {
  const unique = [...new Set(dates)].sort();
  if (unique.length === 0) return 'loaded range';
  if (unique.length === 1) return formatDate(unique[0]);
  return `${formatDate(unique[0])} – ${formatDate(unique[unique.length - 1])}`;
}

export function metricLabel(m: Metric): string {
  switch (m) {
    case 'input_tokens':
      return 'Input tokens';
    case 'output_tokens':
      return 'Output tokens';
    case 'total_tokens':
      return 'Total tokens';
    case 'estimated_cost_usd':
      return 'Estimated cost (USD)';
  }
}
