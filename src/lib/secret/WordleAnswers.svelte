<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity';
  import { playRevealTile } from '../wordle/sound';
  import { getDailyWord } from '../wordle/words';
  import type { VaultCopy } from './vault-types';

  let { copy }: { copy: VaultCopy['oracle'] } = $props();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const days = [
    { when: 'Today', daily: getDailyWord() },
    { when: 'Tomorrow', daily: getDailyWord(tomorrow) },
  ];
  const revealed = new SvelteSet<string>();

  function reveal(when: string) {
    revealed.add(when);
    // One rising note per tile, in time with the tiles turning over.
    for (let i = 0; i < 5; i++) setTimeout(() => playRevealTile(true, i, 'correct'), i * 90);
  }
</script>

<!-- Bumpy's prize for solving his puzzle. -->
<div class="prize">
  <h3>{copy.title}</h3>
  <p class="lede">{copy.desc}</p>
  <ul class="days">
    {#each days as { when, daily } (when)}
      <li>
        <p class="when">
          {when}
          <span>
            #{daily.puzzleNumber} ·
            {new Date(`${daily.dateString}T00:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
          </span>
        </p>
        {#if revealed.has(when)}
          <p class="word">
            <span class="visually-hidden">{daily.word}</span>
            {#each daily.word as letter, i (i)}
              <span class="tile px" style:--i={i} aria-hidden="true">{letter}</span>
            {/each}
          </p>
        {:else}
          <button type="button" class="btn px" onclick={() => reveal(when)}>
            Show {when.toLowerCase()}'s word
          </button>
        {/if}
      </li>
    {/each}
  </ul>
</div>

<style>
  .prize {
    margin-top: 28px;
    animation: arrive 0.5s steps(5, end) both;
  }

  @keyframes arrive {
    from {
      opacity: 0;
    }
  }

  h3 {
    margin: 0;
    font-size: clamp(21px, 4vw, 24px);
    line-height: 1.2;
  }

  .lede {
    margin: 12px 0 0;
    color: var(--muted);
  }

  .days {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
    gap: 22px 32px;
    margin: 22px 0 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: grid;
    gap: 10px;
    justify-items: start;
  }

  .when {
    margin: 0;
    font-family: var(--font);
    font-size: 20px;
    font-weight: 700;
  }

  .when span {
    margin-left: 6px;
    font-family: var(--font-body);
    font-size: 15px;
    font-weight: 400;
    color: var(--muted);
  }

  .btn {
    font-size: 16px;
    padding: 8px 16px;
  }

  .word {
    display: flex;
    gap: 6px;
    margin: 0;
  }

  /* Wordle's own green, so a revealed word reads as an answer. */
  .tile {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    background: #8bbf73;
    color: var(--bg);
    font-size: 21px;
    font-weight: 700;
    animation: turn 0.36s steps(4, end) both;
    animation-delay: calc(var(--i) * 0.09s);
  }

  @keyframes turn {
    from {
      transform: scaleY(0);
    }
    to {
      transform: scaleY(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .prize,
    .tile {
      animation: none;
    }
  }
</style>
