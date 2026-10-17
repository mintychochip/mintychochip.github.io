<script lang="ts">
  import { playDelete, playHeartChime, playInvalid, playKeyPress, playLoveSerenade, playWin } from '../wordle/sound';
  import PixelArt from './PixelArt.svelte';
  import PixelFrogs from './PixelFrogs.svelte';
  import WordleAnswers from './WordleAnswers.svelte';
  import { LILY_PAD } from './pixel-art';
  import type { VaultCopy } from './vault-types';

  let {
    wordle,
    prize,
    onSolved,
  }: { wordle: VaultCopy['wordle']; prize: VaultCopy['oracle']; onSolved: () => void } = $props();

  let guess = $state('');
  let solved = $state(false);
  let hint = $state(false);
  let error = $state('');

  function type(letter: string) {
    if (solved || guess.length >= 5) return;
    guess += letter.toUpperCase();
    error = '';
    playKeyPress(true);
  }

  function erase() {
    if (solved || guess.length === 0) return;
    guess = guess.slice(0, -1);
    error = '';
    playDelete(true);
  }

  function submit() {
    if (solved) return;
    if (guess.length !== 5) {
      error = 'Five letters, please.';
      playInvalid(true);
      return;
    }
    if (guess !== wordle.target.toUpperCase()) {
      error = wordle.wrong;
      playInvalid(true);
      return;
    }
    solved = true;
    playWin(true);
    playLoveSerenade(true);
    onSolved();
  }
</script>

<section id="anniversary-wordle" aria-labelledby="puzzle-title">
  <h2 id="puzzle-title">{wordle.title}</h2>

  <div class="puzzle">
    <div class="bumpy">
      <p class="bubble" role="status">
        {#if solved}
          <strong>{wordle.solvedTitle}</strong>
          {wordle.solvedBody}
        {:else}
          {wordle.prompt}
        {/if}
      </p>
      <div class="frog" aria-hidden="true">
        <PixelFrogs frogs={[{ kind: 'green' }]} size={2} px={4} happy={solved} />
        <PixelArt sprite={LILY_PAD} px={4} class="frog-pad" />
      </div>
    </div>

    <div class="game">
      <div class="tiles" class:solved aria-hidden="true">
        {#each { length: 5 } as _, i (i)}
          <span class="tile px" class:filled={Boolean(guess[i])} style:--i={i}>{guess[i] ?? ''}</span>
        {/each}
      </div>
      <p class="visually-hidden" aria-live="polite">{guess ? `Your guess: ${[...guess].join(' ')}` : ''}</p>

      {#if !solved}
        <div class="keys" role="group" aria-label="Letters">
          {#each wordle.keys as key (key)}
            <button type="button" class="key px" onclick={() => type(key)}>{key}</button>
          {/each}
        </div>
        <div class="actions">
          <button type="button" class="key px wide" onclick={erase} disabled={guess.length === 0}>Delete</button>
          <button type="button" class="btn px" onclick={submit}>Enter</button>
          <button
            type="button"
            class="text-btn"
            aria-expanded={hint}
            onclick={() => {
              hint = !hint;
              if (hint) playHeartChime(true);
            }}
          >
            {hint ? 'Hide the hint' : 'Show a hint'}
          </button>
        </div>
        {#if hint}
          <p class="hint">{wordle.hint}</p>
        {/if}
        {#if error}
          <p class="error" role="alert">{error}</p>
        {/if}
      {:else}
        <!-- His prize, right under the word she found. -->
        <WordleAnswers copy={prize} />
      {/if}
    </div>
  </div>
</section>

<style>
  h2 {
    margin: 0;
    font-size: clamp(24px, 5vw, 30px);
    line-height: 1.2;
  }

  .puzzle {
    display: grid;
    grid-template-columns: minmax(0, 300px) minmax(0, 1fr);
    align-items: start;
    gap: 28px 48px;
    margin-top: 24px;
  }

  .bumpy {
    display: grid;
    justify-items: start;
  }

  /* Bumpy's speech bubble, with a stepped tail down to him. */
  .bubble {
    position: relative;
    margin: 0 0 22px;
    padding: 14px 16px;
    background: var(--fg);
    color: var(--bg);
    font-family: var(--font);
    font-size: 19px;
    line-height: 1.4;
  }

  .bubble::after {
    content: '';
    position: absolute;
    left: 48px;
    bottom: -12px;
    width: 12px;
    height: 12px;
    background: var(--fg);
    clip-path: polygon(0 0, 100% 0, 100% 3px, 9px 3px, 9px 6px, 6px 6px, 6px 9px, 3px 9px, 3px 100%, 0 100%);
  }

  .bubble strong {
    display: block;
    margin-bottom: 4px;
    color: #a3164f;
  }

  .frog {
    display: grid;
    justify-items: center;
    margin-left: 12px;
  }

  /* He sits on the pad: its far half behind him, his feet on its middle. */
  .frog :global(canvas) {
    position: relative;
    z-index: 1;
  }

  .frog :global(.frog-pad) {
    margin-top: -22px;
  }

  .tiles {
    display: grid;
    grid-template-columns: repeat(5, 52px);
    gap: 8px;
  }

  .tile {
    display: grid;
    place-items: center;
    height: 52px;
    background: var(--field);
    box-shadow: inset 0 0 0 2px var(--dim);
    font-size: 26px;
    font-weight: 700;
    line-height: 1;
  }

  .tile.filled {
    box-shadow: inset 0 0 0 2px var(--fg);
  }

  .solved .tile {
    background: var(--love);
    box-shadow: none;
    color: var(--bg);
    animation: hop 0.5s steps(6, end) both;
    animation-delay: calc(var(--i) * 0.1s);
  }

  @keyframes hop {
    0%,
    100% {
      transform: translateY(0);
    }
    40% {
      transform: translateY(-12px);
    }
  }

  .keys {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 18px;
    max-width: 340px;
  }

  .key {
    min-width: 40px;
    height: 44px;
    padding: 0 10px;
    border: 0;
    background: #1c2638;
    color: var(--fg);
    font-size: 18px;
    font-weight: 700;
    cursor: var(--cursor-pointer);
    transition: background 0.15s ease;
  }

  .key:hover:not(:disabled) {
    background: #283750;
  }

  .key:focus-visible {
    background: var(--accent);
    color: var(--bg);
  }

  .key:disabled {
    color: var(--dim);
    cursor: var(--cursor-default);
  }

  .key.wide {
    font-size: 16px;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 14px;
    margin-top: 12px;
  }

  .actions .btn {
    height: 44px;
    font-size: 16px;
  }

  .text-btn {
    padding: 6px 0;
    border: 0;
    background: none;
    color: var(--muted);
    font-size: 16px;
    text-decoration: underline;
    text-underline-offset: 4px;
    cursor: var(--cursor-pointer);
  }

  .text-btn:hover {
    color: var(--fg);
  }

  .hint {
    margin: 16px 0 0;
    font-size: 16px;
    color: var(--fg);
  }

  .error {
    margin: 12px 0 0;
    font-size: 16px;
    color: var(--error);
  }

  @media (max-width: 760px) {
    .puzzle {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (max-width: 380px) {
    .tiles {
      grid-template-columns: repeat(5, 46px);
      gap: 6px;
    }

    .tile {
      height: 46px;
      font-size: 22px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .solved .tile {
      animation: none;
    }
  }
</style>
