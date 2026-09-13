<script lang="ts">
  import type { UsageStats } from './stats';
  import { formatCompactTokens, formatUsd } from './stats';

  interface Props {
    stats: UsageStats;
  }

  let { stats }: Props = $props();
</script>

<div class="stats">
  <div class="stat">
    <span class="stat-label">Total tokens</span>
    <span class="stat-value">{formatCompactTokens(stats.totalTokens)}</span>
  </div>

  <div class="stat">
    <span class="stat-label">Daily average</span>
    <span class="stat-value">{formatCompactTokens(stats.averageTokens)}</span>
  </div>

  <div class="stat">
    <span class="stat-label">Peak day</span>
    <span class="stat-value">{formatCompactTokens(stats.peakTokens)}</span>
    {#if stats.peakLabel}
      <span class="stat-note">{stats.peakLabel}</span>
    {/if}
  </div>

  <div class="stat">
    <span class="stat-label">Top model</span>
    <span class="stat-value">{stats.topModel?.label ?? '—'}</span>
    {#if stats.topModel}
      <span class="stat-note">{formatCompactTokens(stats.topModel.tokens)}</span>
    {/if}
  </div>

  {#if stats.totalCostUsd !== null}
    <div class="stat">
      <span class="stat-label">Estimated cost</span>
      <span class="stat-value">{formatUsd(stats.totalCostUsd)}</span>
      <span class="stat-note">{stats.dateRangeLabel}</span>
    </div>
  {/if}
</div>

<style>
  .stats {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
    margin: 0 0 20px;
    display: grid;
  }
  .stat {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    flex-direction: column;
    gap: 6px;
    padding: 16px 18px;
    display: flex;
  }
  .stat-label {
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
  }
  .stat-value {
    font-size: var(--text-xl);
    font-weight: 500;
    font-family: var(--font-mono);
    color: var(--text);
    overflow-wrap: break-word;
    font-variant-numeric: tabular-nums;
  }
  .stat-note {
    font-family: var(--font-sans);
    font-size: var(--text-xs);
    color: var(--text-muted);
    display: block;
  }
</style>
