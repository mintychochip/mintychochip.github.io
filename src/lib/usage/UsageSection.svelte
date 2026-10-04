<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchModels, isAbortError, rangeToDates } from './api';
  import { dateRangeLabel, formatCompactTokens, formatDate } from './stats';
  import { chartData, formatUsdCompact, rangeDays, rangesFor, toDaily, type Daily, type RangeId } from './series';
  import UsageChart from './UsageChart.svelte';

  let daily = $state.raw<Daily | null>(null);
  let error = $state<string | null>(null);
  let range = $state<RangeId>('30d');

  const ranges = $derived(daily ? rangesFor(daily.dates.length) : []);
  const days = $derived(daily ? rangeDays(range, daily.dates.length) : 0);
  const chart = $derived(daily ? chartData(daily, days) : null);

  const summary = $derived.by(() => {
    if (!daily || !days) return null;
    const totals = daily.totals.slice(-days);
    const total = totals.reduce((a, b) => a + b, 0);
    const best = totals.indexOf(Math.max(...totals));
    const all = daily.totals.reduce((a, b) => a + b, 0);
    return {
      span: dateRangeLabel([daily.dates[daily.dates.length - days], daily.dates[daily.dates.length - 1]]),
      total: formatCompactTokens(total),
      perDay: formatCompactTokens(Math.round(total / days)),
      peakDay: formatDate(daily.dates[daily.dates.length - days + best]),
      peak: formatCompactTokens(totals[best]),
      since: formatDate(daily.dates[0]),
      all: formatCompactTokens(all),
      cost: daily.cost === null ? null : formatUsdCompact(daily.cost),
    };
  });

  onMount(() => {
    const ctl = new AbortController();
    const { from, to } = rangeToDates('1y');
    fetchModels(from, to, { signal: ctl.signal })
      .then((resp) => {
        const d = toDaily(resp);
        if (!d.dates.length) throw new Error('no usage recorded yet');
        if (!rangesFor(d.dates.length).includes(range)) range = 'all';
        daily = d;
      })
      .catch((e) => {
        if (!isAbortError(e)) error = e instanceof Error ? e.message : String(e);
      });
    return () => ctl.abort();
  });
</script>

<section id="usage" aria-labelledby="usage-title">
  <div class="head">
    <h2 id="usage-title">Token usage</h2>
    {#if ranges.length > 1}
      <div class="ranges" role="group" aria-label="Range">
        {#each ranges as r (r)}
          <button type="button" aria-pressed={range === r} onclick={() => (range = r)}>{r}</button>
        {/each}
      </div>
    {/if}
  </div>

  {#if error}
    <p class="status">Couldn't load usage data ({error}).</p>
  {:else if !chart || !summary}
    <p class="status">Loading usage data…</p>
  {:else}
    <p class="sum">
      {summary.span}: <b>{summary.total}</b> tokens, about <b>{summary.perDay}</b> a day. Busiest day was
      {summary.peakDay}, at <b>{summary.peak}</b>.
      {#if range !== 'all'}
        Since {summary.since}: {summary.all} tokens{#if summary.cost}, an estimated {summary.cost}{/if}.
      {:else if summary.cost}
        An estimated {summary.cost} in API pricing.
      {/if}
    </p>
    <UsageChart data={chart} />
  {/if}
</section>

<style>
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px 24px;
  }
  h2 {
    margin: 0;
    font-size: 30px;
    line-height: 1.2;
  }
  .ranges {
    display: flex;
    gap: 18px;
  }
  .ranges button {
    padding: 0;
    border: 0;
    background: none;
    color: var(--muted);
    cursor: pointer;
    text-decoration: none;
  }
  .ranges button:hover {
    color: var(--fg);
  }
  .ranges button[aria-pressed='true'] {
    color: var(--fg);
    text-decoration: underline;
    text-decoration-thickness: 3px;
    text-underline-offset: 6px;
  }
  .sum,
  .status {
    max-width: 44em;
    margin: 12px 0 0;
    color: var(--muted);
  }
  .sum b {
    color: var(--fg);
  }
</style>
