<script lang="ts">
  import { onMount } from 'svelte';
  import ActivityHeatmap from './ActivityHeatmap.svelte';
  import PondCanvas from '../pond/PondCanvas.svelte';
  import { fetchContributions, formatShortDate, FALLBACK_ACTIVITY, type ActivitySummary } from './activity';
  import { site } from '../site';

  let summary = $state<ActivitySummary>(FALLBACK_ACTIVITY);
  let error = $state<string | null>(null);
  let pond = $state<ReturnType<typeof PondCanvas>>();

  const prose = $derived.by(() => {
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
    <a href={site.github}>profile ↗</a>
  </div>

  <p class="sum">{@html prose.html}</p>

  <div class="stage">
    <div class="pond-wrap">
      <PondCanvas
        bind:this={pond}
        seed="github-activity-pond"
        palette="night"
        interactive
        options={(W) => ({
          k: 1.25,
          frogs: 2,
          flies: 5,
          pads: Math.max(3, Math.round(W / 40)),
          horizon: 0.4,
          moon: true,
          reeds: true,
        })}
      />
    </div>

    <div class="grid-wrap">
      <ActivityHeatmap {summary} onhover={() => pond?.react()} />
    </div>
  </div>

  <p class="foot">
    <a href={site.github}>Open my GitHub profile</a> for the official contribution graph and streak badges.
  </p>
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
  .sum {
    max-width: 44em;
    margin: 12px 0 0;
    color: var(--muted);
  }
  .sum :global(b) {
    color: var(--fg);
  }
  .stage {
    margin-top: 24px;
    background: #0d1117;
    border: 1px solid #1a2a22;
    overflow: hidden;
  }
  .pond-wrap {
    height: 150px;
    position: relative;
    border-bottom: 1px solid #18261f;
  }
  .grid-wrap {
    padding: 16px 20px 20px;
    background: #0b0f19;
  }
  .foot {
    max-width: 44em;
    margin: 20px 0 0;
    font-size: 15px;
    color: var(--muted);
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
  @media (max-width: 640px) {
    .pond-wrap {
      height: 120px;
    }
    .grid-wrap {
      padding: 12px 14px 16px;
    }
  }
  @media (max-width: 480px) {
    .foot {
      margin-top: 16px;
      font-size: 14px;
    }
  }
</style>
