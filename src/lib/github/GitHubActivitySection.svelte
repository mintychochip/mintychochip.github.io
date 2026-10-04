<script lang="ts">
  import { onMount } from 'svelte';
  import ActivityHeatmap from './ActivityHeatmap.svelte';
  import { fetchContributions, formatShortDate, type ActivitySummary } from './activity';
  import { site } from '../site';

  let summary = $state<ActivitySummary | null>(null);
  let error = $state<string | null>(null);

  const prose = $derived.by(() => {
    if (!summary) return null;
    const { totalLastYear, currentStreak, longestStreak, best } = summary;
    const streak =
      currentStreak > 0
        ? `I'm on a <b>${currentStreak}</b>-day streak (longest <b>${longestStreak}</b>).`
        : `Longest streak so far: <b>${longestStreak}</b> days.`;
    const peak =
      best.count > 0
        ? ` Busiest day was <b>${formatShortDate(best.date)}</b> with <b>${best.count}</b> contributions.`
        : '';
    return {
      html:
        `Last year on GitHub: <b>${totalLastYear.toLocaleString()}</b> contributions. ${streak}${peak} ` +
        `The graph below matches my profile's rhythm, drawn in the same night palette as the hero pond.`,
    };
  });

  onMount(() => {
    const ctl = new AbortController();
    fetchContributions(site.githubUser, ctl.signal)
      .then((s) => {
        summary = s;
      })
      .catch((e) => {
        if (e?.name !== 'AbortError') error = e instanceof Error ? e.message : String(e);
      });
    return () => ctl.abort();
  });
</script>

<section id="github" aria-labelledby="github-title">
  <h2 id="github-title">GitHub activity</h2>

  {#if error}
    <p class="status">Couldn't load contribution data ({error}). The live graph is still on <a href={site.github}>my profile</a>.</p>
  {:else if !summary || !prose}
    <p class="status">Loading GitHub activity…</p>
  {:else}
    <p class="sum">{@html prose.html}</p>
    <ActivityHeatmap {summary} />
    <p class="foot">
      <a href={site.github}>Open my GitHub profile</a> for the official contribution graph and streak badges.
    </p>
  {/if}
</section>

<style>
  h2 {
    margin: 0;
    font-size: 30px;
    line-height: 1.2;
  }
  .sum,
  .status,
  .foot {
    max-width: 44em;
    margin: 12px 0 0;
    color: var(--muted);
  }
  .sum :global(b) {
    color: var(--fg);
  }
  .foot {
    margin-top: 20px;
    font-size: 15px;
  }
  .foot a {
    color: var(--fg);
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 5px;
  }
  .foot a:hover {
    color: var(--accent);
  }
</style>
