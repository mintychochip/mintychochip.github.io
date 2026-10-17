<script lang="ts">
  import { untrack } from 'svelte';
  import { playHeartChime } from '../wordle/sound';
  import PixelArt from './PixelArt.svelte';
  import PixelFrogs from './PixelFrogs.svelte';
  import Stationery from './Stationery.svelte';
  import { HEART, LETTER_PAPER, LILY_SEAT, MORE, PASS_ICONS, WAX_SEAL } from './pixel-art';
  import type { AnniversaryLetterCopy } from './letter-copy';
  import type { VaultCoupon } from './vault-types';

  let {
    letter,
    attachments,
    writing,
    instant,
    onAttachment,
    onWritten,
    paper = $bindable(),
  }: {
    letter: AnniversaryLetterCopy;
    /** The passes that came with the letter, shown at its foot once it is written. */
    attachments: readonly (VaultCoupon & { redeemed: boolean })[];
    /** Start writing. */
    writing: boolean;
    /** Show the whole letter at once (reduced motion). */
    instant: boolean;
    onAttachment: (id: number) => void;
    /** The last word is down and the seal pressed. */
    onWritten?: () => void;
    /** The sheet of paper, for the stage to grow the letter into and scroll to. */
    paper?: HTMLElement;
  } = $props();

  /** Characters a second, and the pauses that make it read like someone writing. */
  const CPS = 62;
  const PAUSE = { start: 450, block: 420, sentence: 260, clause: 110 };

  /** Greeting, paragraphs, sign-off, signature and postscript, written in that order. */
  const blocks = $derived([letter.greeting, ...letter.paragraphs, letter.signoff, letter.signature, letter.postscript]);
  const text = $derived(blocks.join(''));
  /** Where each block starts in the run of characters. */
  const starts = $derived(blocks.map((_, i) => blocks.slice(0, i).reduce((n, b) => n + b.length, 0)));
  const n = $derived(blocks.length);

  let typed = $state(0);
  const done = $derived(typed >= text.length);
  /** The block the caret sits in: the last one starting before the last written character. */
  const active = $derived(starts.reduce((last, start, i) => (start < typed ? i : last), 0));

  /** The sheet unrolls a block at a time: a block is on it once its first word is being written. */
  function onSheet(i: number) {
    return done || i <= active;
  }

  function shown(i: number) {
    return Math.max(0, Math.min(blocks[i].length, typed - starts[i]));
  }

  function finish() {
    typed = text.length;
  }

  $effect(() => {
    if (!writing) return;
    if (instant) {
      typed = text.length;
      return;
    }
    const ends = starts.slice(1);
    let raf = 0;
    let last = 0;
    let carry = 0;
    let hold = PAUSE.start;
    const step = (now: number) => {
      const dt = last ? Math.min(now - last, 100) : 0;
      last = now;
      if (hold > 0) hold -= dt;
      else {
        carry += (dt * CPS) / 1000;
        while (carry >= 1 && typed < text.length) {
          carry -= 1;
          typed += 1;
          const ch = text[typed - 1];
          const pause = ends.includes(typed)
            ? PAUSE.block
            : /[.!?]/.test(ch)
              ? PAUSE.sentence
              : /[,;:\u2013\u2014]/.test(ch)
                ? PAUSE.clause
                : 0;
          if (pause) {
            hold = pause;
            carry = 0;
            break;
          }
        }
      }
      if (typed < text.length) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  });

  $effect(() => {
    if (!done || !writing) return;
    // Untracked: whatever the parent does on hearing it (a heart shower reads and writes its own state)
    // must not become something this effect waits on, or it re-fires forever.
    untrack(() => {
      if (!instant) playHeartChime(true);
      onWritten?.();
    });
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions a tap anywhere on the letter finishes the writing; the arrow button does the same for a keyboard -->
<article class="letter" class:done class:writing aria-label="Your letter" onclick={finish}>
  {#if !done}
    <!-- The whole letter at once for a screen reader, while the page writes it out. -->
    <div class="visually-hidden">
      <h2>{letter.greeting}</h2>
      {#each letter.paragraphs as paragraph, p (p)}
        <p>{paragraph}</p>
      {/each}
      <p>{letter.signoff} {letter.signature}</p>
      <p>{letter.postscript}</p>
    </div>
  {/if}

  <div class="paper" bind:this={paper}>
    <Stationery kind="letter" paper={LETTER_PAPER} />
    <div class="words" aria-hidden={!done}>
      <h2 class="greeting">{@render line(0)}</h2>
      {#each letter.paragraphs as _, p (p)}
        {#if onSheet(p + 1)}
          <p class="body">{@render line(p + 1)}</p>
        {/if}
      {/each}
      {#if onSheet(n - 3)}
        <p class="signoff">{@render line(n - 3)}</p>
      {/if}
      {#if onSheet(n - 2)}
        <div class="signed">
          <p class="signature">{@render line(n - 2)}</p>
          <span class="seal" aria-hidden="true"><PixelArt sprite={WAX_SEAL} /></span>
          <span class="frogs" aria-hidden="true">
            <PixelFrogs frogs={[{ kind: 'green' }, { kind: 'pink', mirror: true }]} happy={done} />
            <PixelArt sprite={LILY_SEAT} class="frogs-pad" />
          </span>
        </div>
      {/if}
      {#if onSheet(n - 1)}
        <p class="postscript">{@render line(n - 1)}</p>
      {/if}

      {#if done && attachments.length}
        <div class="attached">
          <p class="attached-label">Attached</p>
          <ul>
            {#each attachments as pass (pass.id)}
              <li>
                <button
                  type="button"
                  class="slot"
                  aria-label="{pass.title}{pass.redeemed ? ', redeemed' : ''}"
                  onclick={() => onAttachment(pass.id)}
                >
                  <PixelArt sprite={PASS_ICONS[pass.icon] ?? HEART} />
                  {#if pass.redeemed}
                    <span class="badge"><PixelArt sprite={HEART} px={2} /></span>
                  {/if}
                </button>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>

    {#if writing && !done}
      <button type="button" class="more" aria-label="Show the whole letter" onclick={finish}>
        <PixelArt sprite={MORE} />
      </button>
    {/if}
  </div>
</article>

{#snippet line(i: number)}
  <span class="typed" class:caret={writing && !done && i === active}>{blocks[i].slice(0, shown(i))}</span><span class="ahead">{blocks[i].slice(shown(i))}</span>
{/snippet}

<style>
  .letter {
    --ink: #2a1630;
    --ink-soft: #6b5470;
    --ink-love: #a3164f;
    max-width: 624px;
    margin: 0 auto;
  }

  .letter.writing:not(.done) {
    cursor: var(--cursor-pointer);
  }

  .paper {
    position: relative;
    /* Clear of the stitched border and the lily pads on its corners. */
    padding: 66px clamp(40px, 8vw, 68px) 64px;
    color: var(--ink);
    scroll-margin-top: 32px;
  }

  .words,
  .more {
    position: relative;
    z-index: 1;
  }

  .paper ::selection {
    background: var(--love);
    color: var(--ink);
  }

  .greeting,
  .body,
  .signoff,
  .signature,
  .postscript {
    font-family: var(--font);
  }

  .greeting {
    margin: 0 0 22px;
    font-size: clamp(26px, 4.2vw, 32px);
    line-height: 1.2;
    color: var(--ink-love);
  }

  .body {
    margin: 0 0 16px;
    font-size: 21px;
    font-weight: 500;
    line-height: 1.55;
  }

  .signoff {
    margin: 30px 0 4px;
    font-size: 19px;
    color: var(--ink-soft);
  }

  /* Signed: the signature, the envelope's seal pressed beside it, and the two of them sitting by it. */
  .signed {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 6px 14px;
  }

  .signature {
    margin: 0 0 6px;
    font-size: clamp(26px, 4vw, 30px);
    font-weight: 700;
    line-height: 1.2;
    color: var(--ink-love);
  }

  .seal {
    margin-bottom: 4px;
    visibility: hidden;
  }

  .done .seal {
    visibility: visible;
    animation: press 0.4s steps(4, end) both;
  }

  @keyframes press {
    from {
      transform: scale(1.7);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  .frogs {
    display: grid;
    justify-items: center;
    animation: hop-in 0.36s steps(3, end) both;
  }

  /* They sit on the pad: its far half behind them, their feet on its middle. */
  .frogs :global(canvas) {
    position: relative;
    z-index: 1;
  }

  .frogs :global(.frogs-pad) {
    margin-top: -18px;
  }

  @keyframes hop-in {
    from {
      transform: translateY(-12px);
      opacity: 0;
    }
  }

  .postscript {
    margin: 22px 0 0;
    font-size: 16px;
    line-height: 1.5;
    color: var(--ink-soft);
  }

  /* Not yet written: laid out, so nothing moves as the words arrive, but not shown. */
  .ahead {
    color: transparent;
  }

  /* The pen: a pixel block that takes no room, so the line never reflows under it. */
  .caret::after {
    content: '';
    display: inline-block;
    width: 0.45em;
    height: 0.78em;
    margin-right: -0.45em;
    vertical-align: -0.04em;
    background: currentColor;
    animation: pen 1s step-end infinite;
  }

  @keyframes pen {
    50% {
      opacity: 0;
    }
  }

  .attached {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 14px;
    margin-top: 28px;
    animation: arrive 0.5s steps(5, end) both;
  }

  @keyframes arrive {
    from {
      opacity: 0;
    }
  }

  .attached-label {
    margin: 0;
    font-family: var(--font);
    font-size: 17px;
    color: var(--ink-soft);
  }

  .attached ul {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .slot {
    position: relative;
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    padding: 0;
    border: 3px solid var(--ink);
    background: #ece1c6;
    cursor: var(--cursor-pointer);
    transition: background 0.15s ease;
  }

  .slot:hover,
  .slot:focus-visible {
    background: #f9d3e4;
  }

  .slot:focus-visible {
    outline: 3px solid var(--ink-love);
    outline-offset: 2px;
  }

  /* A redeemed pass keeps its slot, ticked off with a little heart. */
  .badge {
    position: absolute;
    right: -9px;
    top: -9px;
  }

  /* The prompt sits right under the words as the sheet unrolls, like a game's "more". */
  .more {
    display: grid;
    place-items: center;
    width: 48px;
    height: 36px;
    margin: 8px auto 0;
    padding: 0;
    border: 0;
    background: none;
    color: var(--ink);
    cursor: var(--cursor-pointer);
    animation: nudge 0.9s steps(2, jump-none) infinite alternate;
  }

  .more:focus-visible {
    outline: 3px solid var(--ink-love);
  }

  @keyframes nudge {
    to {
      transform: translateY(4px);
    }
  }

  @media (max-width: 640px) {
    .paper {
      padding: 60px 40px 56px;
    }

    .body {
      font-size: 19px;
    }

    .signoff {
      font-size: 18px;
    }

    /* "Attached" on its own line, so all six slots fit in one row on a phone. */
    .attached-label {
      flex-basis: 100%;
    }

    .attached ul {
      gap: 6px;
    }

    .slot {
      width: 40px;
      height: 40px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .caret::after,
    .more,
    .frogs {
      animation: none;
    }

    .done .seal,
    .attached {
      animation: none;
    }
  }
</style>
