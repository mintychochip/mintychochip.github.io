<script lang="ts">
  import { onMount } from 'svelte';
  import { playKeyPress, playLoveSerenade, playSecretUnlock } from '../wordle/sound';

  let {
    onComplete,
  }: {
    onComplete: () => void;
  } = $props();

  /** A pixel heart that fills from the bottom row up while the vault opens. */
  const HEART = [
    '..xxx...xxx..',
    '.xxxxx.xxxxx.',
    'xxxxxxxxxxxxx',
    'xxxxxxxxxxxxx',
    'xxxxxxxxxxxxx',
    '.xxxxxxxxxxx.',
    '..xxxxxxxxx..',
    '...xxxxxxx...',
    '....xxxxx....',
    '.....xxx.....',
    '......x......',
  ];
  const ROW_PATHS = HEART.map((row, y) =>
    [...row.matchAll(/x+/g)].map((run) => `M${run.index} ${y}h${run[0].length}v1h-${run[0].length}z`).join(''),
  );
  const LINES = ['Waking Bumpy up…', 'Finding your letter…', 'Sealing it with a kiss…'];

  let progress = $state(0);
  let leaving = $state(false);
  let completed = false;

  const filled = $derived(Math.round((progress / 100) * HEART.length));
  const line = $derived(LINES[Math.min(LINES.length - 1, Math.floor(progress / 34))]);

  function finish() {
    if (completed) return;
    completed = true;
    onComplete();
  }

  $effect(() => {
    // A soft tick each time the status line changes.
    if (line) playKeyPress(true);
  });

  onMount(() => {
    let leaveTimer: number | undefined;
    const fill = window.setInterval(() => {
      progress = Math.min(100, progress + 2.5);
      if (progress < 100) return;
      clearInterval(fill);
      playSecretUnlock(true);
      playLoveSerenade(true);
      leaving = true;
      leaveTimer = window.setTimeout(finish, 450);
    }, 50);

    return () => {
      clearInterval(fill);
      clearTimeout(leaveTimer);
    };
  });
</script>

<div class="loader-overlay" class:leaving role="dialog" aria-modal="true" aria-label="Opening the vault">
  <div class="loader">
    <svg
      class="heart"
      class:full={filled === HEART.length}
      viewBox="0 0 13 11"
      shape-rendering="crispEdges"
      aria-hidden="true"
    >
      {#each ROW_PATHS as d, y (y)}
        <path {d} style:fill={y >= HEART.length - filled ? 'var(--love)' : 'var(--field-focus)'} />
      {/each}
    </svg>
    <h2>Opening your vault</h2>
    <p class="line" aria-live="polite">{line}</p>
    <button type="button" class="skip-btn" onclick={finish}>Skip</button>
  </div>
</div>

<style>
  .loader-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: grid;
    place-items: center;
    background: var(--bg);
    user-select: none;
    transition: opacity 0.45s steps(5, end);
  }

  .loader-overlay.leaving {
    opacity: 0;
  }

  .loader {
    display: grid;
    justify-items: center;
    gap: 10px;
    padding: 24px;
    text-align: center;
  }

  .heart {
    width: 104px;
    height: 88px;
  }

  .heart.full {
    animation: beat 0.4s steps(2, end);
  }

  @keyframes beat {
    50% {
      transform: scale(1.12);
    }
  }

  h2 {
    margin: 22px 0 0;
    font-size: clamp(24px, 5vw, 30px);
    line-height: 1.2;
  }

  .line {
    min-height: 1.45em;
    margin: 0;
    color: var(--muted);
  }

  .skip-btn {
    margin-top: 14px;
    padding: 6px 0;
    border: 0;
    background: none;
    color: var(--muted);
    font-size: 16px;
    text-decoration: underline;
    text-underline-offset: 4px;
    cursor: var(--cursor-pointer);
  }

  .skip-btn:hover {
    color: var(--fg);
  }

  @media (prefers-reduced-motion: reduce) {
    .loader-overlay {
      transition: none;
    }

    .heart.full {
      animation: none;
    }
  }
</style>
