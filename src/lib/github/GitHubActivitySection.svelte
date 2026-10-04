<script lang="ts">
  import { onMount } from 'svelte';
  import ActivityHeatmap from './ActivityHeatmap.svelte';
  import PondCanvas from '../pond/PondCanvas.svelte';
  import { fetchContributions, formatShortDate, type ActivitySummary } from './activity';
  import { site } from '../site';

  let summary = $state<ActivitySummary | null>(null);
  let error = $state<string | null>(null);
  let pond = $state<ReturnType<typeof PondCanvas>>();

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
        `Hover or tap any square in the grid to inspect commits; the pond above ripples and the frogs keep watch.`,
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
  <div class="head">
    <h2 id="github-title">GitHub activity</h2>
    <a href={site.github}>profile</a>
  </div>

  <div class="art">
    <PondCanvas
      bind:this={pond}
      seed="github-activity-pond"
      palette="night"
      interactive
      options={(W) => ({
        k: 1.15,
        frogs: 2,
        flies: 4,
        pads: Math.max(3, Math.round(W / 44)),
        horizon: 0.35,
        moon: false,
        reeds: true,
      })}
    />
  </div>

  {#if error}
    <p class="status">Couldn't load contribution data ({error}). You can view my activity directly on <a href={site.github}>GitHub</a>.</p>
  {:else if !summary || !prose}
    <p class="status">Loading GitHub activity…</p>
  {:else}
    <p class="sum">{@html prose.html}</p>
    <ActivityHeatmap {summary} onhover={() => pond?.react()} />
    <p class="foot">
      <a href={site.github}>Open my GitHub profile</a> for the official contribution graph and streak badges.
    </p>
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
    font-size: clamp(24px, 5vw, 30px);
    line-height: 1.2;
  }
  .head a {
    color: var(--muted);
    text-decoration: none;
  }
  .head a:hover {
    color: var(--accent);
  }
  .art {
    height: 120px;
    margin-top: 18px;
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
    padding: 2px 0;
    display: inline-block;
  }
  .foot a:hover {
    color: var(--accent);
  }
  @media (max-width: 480px) {
    .foot {
      margin-top: 16px;
      font-size: 14px;
    }
  }
</style>
