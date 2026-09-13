<script lang="ts">
  import type { ModelsResponse, SeriesResponse, RangeKey, Metric } from './api';
  import { fetchModels, fetchSeries, rangeToDates, METRICS, RANGE_DAYS, isAbortError } from './api';
  import { summarizeModels, summarizeSeries, type UsageStats } from './stats';
  import StackedChart from './StackedChart.svelte';
  import LinesChart from './LinesChart.svelte';
  import StatCards from './StatCards.svelte';
  import { theme } from '../theme.svelte';

  let view = $state<'models' | 'metrics'>('models');
  let stackBy = $state<'model' | 'provider' | 'variant'>('model');
  let range = $state<RangeKey>('1y');
  let data = $state<ModelsResponse | SeriesResponse | null>(null);
  let error = $state<string | null>(null);
  let loading = $state(false);
  let hiddenKeys = $state(new Set<string>());

  const RANGE_KEYS = Object.keys(RANGE_DAYS) as RangeKey[];
  const chartTheme = $derived(theme.effective);

  let stats = $derived.by<UsageStats | null>(() => {
    if (!data) return null;
    if (view === 'models') return summarizeModels(data as ModelsResponse);
    return summarizeSeries(data as SeriesResponse, METRICS);
  });

  // Clear per-view legend toggles when the chart type changes.
  $effect(() => {
    view;
    hiddenKeys = new Set<string>();
  });

  // Fetch data when the view or date range changes. stackBy and hiddenKeys
  // are handled client-side by the chart components.
  $effect(() => {
    const currentView = view;
    const currentRange = range;
    const controller = new AbortController();

    data = null;
    error = null;
    loading = true;

    const { from, to } = rangeToDates(currentRange);

    (async () => {
      try {
        const resp =
          currentView === 'models'
            ? await fetchModels(from, to, { signal: controller.signal })
            : await fetchSeries(from, to, METRICS, { signal: controller.signal });
        data = resp;
      } catch (e) {
        if (isAbortError(e)) return;
        error = e instanceof Error ? e.message : 'Failed to load usage data';
      } finally {
        loading = false;
      }
    })();

    return () => {
      controller.abort();
    };
  });

  function toggleModel(key: string) {
    const next = new Set(hiddenKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    hiddenKeys = next;
  }

  function toggleMetric(metric: Metric) {
    toggleModel(metric);
  }
</script>

<section class="section tokens" id="usage">
  <header class="tokens-header">
    <h2 class="section-title">Tokens</h2>

    <div class="tokens-controls">
      <div class="toggle-group" role="group" aria-label="Chart type">
        <button
          type="button"
          class="toggle"
          class:is-active={view === 'models'}
          aria-pressed={view === 'models'}
          onclick={() => (view = 'models')}
        >
          Models
        </button>
        <button
          type="button"
          class="toggle"
          class:is-active={view === 'metrics'}
          aria-pressed={view === 'metrics'}
          onclick={() => (view = 'metrics')}
        >
          Metrics
        </button>
      </div>

      {#if view === 'models'}
        <label class="toggle-select">
          <span class="visually-hidden">Stack by</span>
          <select bind:value={stackBy}>
            <option value="model">Stack by model</option>
            <option value="provider">Stack by provider</option>
            <option value="variant">Stack by variant</option>
          </select>
        </label>
      {/if}

      <div class="range-selector" role="group" aria-label="Range">
        {#each RANGE_KEYS as key (key)}
          <button
            type="button"
            class="range-btn"
            class:range-btn-active={range === key}
            aria-pressed={range === key}
            onclick={() => (range = key)}
          >
            {#if range === key}
              <span class="range-btn-indicator" aria-hidden="true"></span>
            {/if}
            <span class="range-btn-label">{key}</span>
          </button>
        {/each}
      </div>
    </div>
  </header>

  {#if loading && !data}
    <p class="tokens-loading">Loading usage data…</p>
  {/if}
  {#if error}
    <p class="error" role="status">{error}</p>
  {/if}

  {#if stats}
    <StatCards {stats} />
  {/if}

  {#if data}
    <div class="chart-wrap">
      {#if view === 'models'}
        <StackedChart
          data={data as ModelsResponse}
          groupBy={stackBy}
          theme={chartTheme}
          {hiddenKeys}
          onToggle={toggleModel}
          title="Tokens by model"
        />
      {:else}
        <LinesChart
          data={data as SeriesResponse}
          theme={chartTheme}
          metrics={METRICS}
          {hiddenKeys}
          onToggle={toggleMetric}
        />
      {/if}
    </div>
  {/if}
</section>

<style>
  .section {
    padding: 36px 0;
  }
  .section-title {
    font-size: var(--text-xs);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin: 0;
    font-weight: 600;
  }
  .tokens-header {
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
    display: flex;
  }
  .tokens-loading {
    color: var(--text-muted);
    font-size: var(--text-sm);
    margin: 16px 0 0;
  }
  .tokens-controls {
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    display: inline-flex;
  }
  .toggle-group {
    border: 1px solid var(--border);
    background: var(--surface);
    border-radius: 8px;
    gap: 4px;
    padding: 3px;
    display: inline-flex;
  }
  .toggle {
    color: var(--text-secondary);
    font-size: var(--text-xs);
    font-family: var(--font-mono);
    cursor: pointer;
    background: 0 0;
    border: none;
    border-radius: 5px;
    padding: 5px 10px;
    transition: color 0.12s, background 0.12s;
  }
  .toggle:hover {
    color: var(--text);
  }
  .toggle.is-active {
    background: var(--text);
    color: var(--surface);
  }
  .toggle-select select {
    appearance: none;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-secondary);
    font-size: var(--text-xs);
    font-family: var(--font-mono);
    cursor: pointer;
    border-radius: 8px;
    padding: 7px 10px;
  }
  .toggle-select select:hover {
    color: var(--text);
  }
  .range-selector {
    border: 1px solid var(--border);
    background: var(--surface);
    border-radius: 8px;
    gap: 4px;
    padding: 3px;
    display: inline-flex;
  }
  .range-btn {
    color: var(--text-secondary);
    font-size: var(--text-xs);
    font-family: var(--font-mono);
    cursor: pointer;
    background: 0 0;
    border: none;
    border-radius: 5px;
    padding: 5px 10px;
    transition: color 0.12s;
    position: relative;
  }
  .range-btn:hover {
    color: var(--text);
  }
  .range-btn-label {
    z-index: 1;
    position: relative;
  }
  .range-btn-indicator {
    background: var(--text);
    border-radius: 5px;
    position: absolute;
    inset: 0;
  }
  .range-btn-active,
  .range-btn-active:hover {
    color: var(--surface);
  }
  .chart-wrap {
    margin: 24px 0 0;
    position: relative;
  }
  .error {
    color: var(--error-text);
    background: var(--error-bg);
    border: 1px solid var(--error-border);
    font-size: var(--text-sm);
    border-radius: 8px;
    margin: 20px 0 0;
    padding: 14px 18px;
  }
  .visually-hidden {
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    width: 1px;
    height: 1px;
    position: absolute;
    overflow: hidden;
  }
</style>
