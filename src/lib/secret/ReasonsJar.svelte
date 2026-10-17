<script lang="ts">
  import PixelArt from './PixelArt.svelte';
  import Stationery from './Stationery.svelte';
  import { jarSprite } from './pixel-art';
  import type { VaultCopy } from './vault-types';

  let { copy, onRead }: { copy: VaultCopy['reasons']; onRead: () => void } = $props();

  /** Each note's paper: cream, with a breath of the colour of the heart it was folded into (cream, pink, green). */
  const PAPERS = ['#f6eedb', '#f6e2df', '#e9ecd3'];

  /** How many notes are out. They come out in order, top heart first, and the newest lies on top. */
  let drawn = $state(0);
  const total = $derived(copy.items.length);
  const out = $derived(
    copy.items
      .slice(0, drawn)
      // The k-th note out was the jar's top heart then: slot total - 1 - k, coloured by slot.
      .map((item, k) => ({ ...item, paper: PAPERS[(total - 1 - k) % PAPERS.length] }))
      .reverse(),
  );

  function pull() {
    if (drawn >= total) return;
    drawn += 1;
    onRead();
  }
</script>

<section id="anniversary-reasons" class="reasons" aria-labelledby="reasons-title">
  <div class="intro">
    <h2 id="reasons-title">{copy.title}</h2>
    <p class="lede">{copy.desc}</p>
    <p class="count" aria-live="polite">{drawn} of {total} read</p>
  </div>
  <button type="button" class="jar" onclick={pull} disabled={drawn >= total}>
    {#key drawn}
      <span class="glass" class:shaken={drawn > 0}><PixelArt sprite={jarSprite(total - drawn)} px={4} /></span>
    {/key}
    <span class="label">
      {drawn >= total ? 'Every note is out' : drawn === 0 ? 'Pull out a note' : 'Pull out another'}
    </span>
  </button>

  {#if out.length}
    <ol class="notes">
      {#each out as note (note.id)}
        <li class="note">
          <Stationery kind="note" paper={note.paper} />
          <h3>{note.title}</h3>
          <p>{note.body}</p>
        </li>
      {/each}
    </ol>
  {/if}
</section>

<style>
  /* The notes come out right beside the jar they were pulled from. */
  .reasons {
    display: grid;
    grid-template-columns: minmax(0, 620px) auto;
    justify-content: start;
    align-items: start;
    column-gap: 48px;
  }

  .intro {
    grid-column: 1;
  }

  h2 {
    margin: 0;
    font-size: clamp(24px, 5vw, 30px);
    line-height: 1.2;
  }

  .lede {
    margin: 12px 0 0;
    max-width: 42ch;
    color: var(--muted);
  }

  .count {
    margin: 10px 0 0;
    color: var(--muted);
  }

  .jar {
    grid-column: 2;
    grid-row: 1 / span 2;
    display: grid;
    justify-items: center;
    gap: 10px;
    padding: 6px 10px;
    border: 0;
    background: none;
    color: var(--fg);
    font-family: var(--font);
    font-size: 18px;
    font-weight: 700;
    cursor: var(--cursor-pointer);
  }

  .jar:hover:not(:disabled) .label {
    color: var(--love);
  }

  .jar:disabled {
    color: var(--muted);
    cursor: var(--cursor-default);
  }

  /* A little shake as a note comes out, in pond-clock steps. */
  .glass.shaken {
    animation: shake 0.3s steps(3, end);
  }

  @keyframes shake {
    33% {
      transform: translateX(-4px);
    }
    66% {
      transform: translateX(4px);
    }
  }

  /* One note under another, newest on top, about as wide as a letter's lines. */
  .notes {
    grid-column: 1;
    display: grid;
    gap: 16px;
    margin: 28px 0 0;
    padding: 0;
    list-style: none;
  }

  /* A note on the vault's stationery, its heart's paper drawn behind the words. */
  .note {
    position: relative;
    padding: 22px 26px 24px;
    color: #2a1630;
    animation: unfold 0.5s steps(6, end) both;
  }

  .note h3,
  .note p {
    position: relative;
    z-index: 1;
  }

  @keyframes unfold {
    from {
      clip-path: inset(0 0 100% 0);
    }
    to {
      clip-path: inset(0 0 0 0);
    }
  }

  .note h3 {
    margin: 0;
    font-size: 20px;
    line-height: 1.25;
  }

  .note p {
    margin: 10px 0 0;
    font-family: var(--font);
    font-size: 18px;
    line-height: 1.5;
  }

  .note ::selection {
    background: var(--love);
    color: #2a1630;
  }

  @media (max-width: 640px) {
    .reasons {
      grid-template-columns: minmax(0, 1fr);
      row-gap: 24px;
    }

    .jar {
      grid-column: 1;
      grid-row: auto;
      justify-self: center;
    }

    .notes {
      margin-top: 4px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .glass.shaken,
    .note {
      animation: none;
    }
  }
</style>
