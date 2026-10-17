<script lang="ts">
  import { onMount, tick } from 'svelte';
  import PondCanvas, { clearBoxOf, pixelScale } from '../pond/PondCanvas.svelte';
  import { clamp, lerp, packPalette } from '../pond/field';
  import { prefersReducedMotion, subscribe, type Clock } from '../pond/ticker';
  import { playHeartChime } from '../wordle/sound';
  import LetterSheet from './LetterSheet.svelte';
  import Stationery from './Stationery.svelte';
  import { LETTER_PAPER } from './pixel-art';
  import {
    ENVELOPE_INKS,
    OPEN_SECONDS,
    envelopeClearBox,
    envelopeFrame,
    envelopeLayout,
    letterBox,
    paintEnvelope,
    type EnvelopeLayout,
  } from './envelope';
  import type { AnniversaryLetterCopy } from './letter-copy';
  import type { VaultCoupon } from './vault-types';

  let {
    letter,
    attachments,
    /** Fired once the letter is out on the page, so the vault can unlock what follows. */
    onOpened,
    onAttachment,
    /** Fired once the letter has finished writing itself. */
    onWritten,
  }: {
    letter: AnniversaryLetterCopy;
    attachments: readonly (VaultCoupon & { redeemed: boolean })[];
    onOpened?: () => void;
    onAttachment: (id: number) => void;
    onWritten?: () => void;
  } = $props();

  /** Seconds the risen letter holds still before it comes out of the envelope. */
  const HOLD_SECONDS = 0.5;
  /** The letter grows from the envelope to the page in this many pond-clock jumps. */
  const GROW_STEPS = 8;
  const GROW_MS = 660;

  type Phase = 'sealed' | 'opening' | 'unfolding' | 'open';
  type Box = { left: number; top: number; width: number; height: number };

  let phase = $state<Phase>('sealed');
  /** The letter is on the page and writing itself. */
  let writing = $state(false);
  /** The plain sheet that travels from the envelope to the page, while it does. */
  let ghost = $state<Box | null>(null);

  let scene: HTMLDivElement;
  let title: HTMLHeadingElement | undefined = $state();
  let canvas: HTMLCanvasElement;
  let ghostEl: HTMLDivElement | undefined = $state();
  let paper: HTMLElement | undefined = $state();
  /** The envelope canvas, in CSS px from the pond's top-left corner. */
  let box = $state({ left: 0, top: 0, width: 0, height: 0 });

  /** Buffer value → RGBA; value 0 stays transparent. */
  const inks = Uint32Array.from([0, ...packPalette(ENVELOPE_INKS)]);
  const still = prefersReducedMotion();
  let clock: Clock | null = null;
  let layout: EnvelopeLayout | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let img: ImageData | null = null;
  let px = new Uint32Array(0);
  let buf = new Uint8Array(0);
  /** Clock time the seal was tapped; null while the envelope is shut. */
  let openedAt: number | null = null;
  /** The letter has left the envelope for the page. */
  let letterOut = false;
  let timer: number | undefined;

  const pondOptions = (W: number, H: number) => ({
    k: clamp(W / 123, 1.3, 2.6),
    frogs: 2,
    flies: Math.round(clamp(W / 32, 4, 10)),
    horizon: 0.5,
    clear: [clearBoxOf(title, scene), envelopeClearBox(envelopeLayout(W, H), W, H)].filter(
      (b) => b !== undefined,
    ),
  });

  function draw(t: number) {
    if (!layout || !ctx || !img) return;
    paintEnvelope(buf, layout, { ...envelopeFrame(t, openedAt), letter: !letterOut });
    for (let i = 0; i < buf.length; i++) px[i] = inks[buf[i]];
    ctx.putImageData(img, 0, 0);
  }

  /** Sizes the envelope to the pond, on the pond's own pixel grid. */
  function build() {
    const S = pixelScale();
    // The same art size PondCanvas computes, so the envelope and the pond agree on where it is.
    const W = Math.max(8, Math.ceil(scene.clientWidth / S));
    const H = Math.max(8, Math.ceil(scene.clientHeight / S));
    layout = envelopeLayout(W, H);
    canvas.width = layout.bufW;
    canvas.height = layout.bufH;
    ctx = canvas.getContext('2d');
    if (!ctx) return;
    img = ctx.createImageData(layout.bufW, layout.bufH);
    px = new Uint32Array(img.data.buffer);
    buf = new Uint8Array(layout.bufW * layout.bufH);
    box = { left: layout.left * S, top: layout.top * S, width: layout.bufW * S, height: layout.bufH * S };
    draw(clock?.time ?? 0);
  }

  function open() {
    if (phase !== 'sealed') return;
    phase = 'opening';
    playHeartChime(true);
    // Reduced motion skips straight to the open envelope.
    openedAt = still ? -Infinity : (clock?.time ?? 0);
    draw(clock?.time ?? 0);
    // Wall time, so a pond scrolled away or a canvas that never drew cannot hold the letter back.
    timer = window.setTimeout(unfold, still ? 0 : (OPEN_SECONDS + HOLD_SECONDS) * 1000);
  }

  /** Where the risen letter sits on screen right now. */
  function risenLetter(L: EnvelopeLayout): Box {
    const S = pixelScale();
    const pond = scene.getBoundingClientRect();
    const b = letterBox(L, 1);
    return {
      left: pond.left + (L.left + b.x) * S,
      top: pond.top + (L.top + b.y) * S,
      width: b.w * S,
      height: b.h * S,
    };
  }

  /** The sheet grows from the envelope to the page in pond-clock jumps that slow as it lands. */
  function growFrames(from: Box, to: Box): Keyframe[] {
    return Array.from({ length: GROW_STEPS + 1 }, (_, i) => {
      const u = 1 - (1 - i / GROW_STEPS) ** 3;
      return {
        offset: i / GROW_STEPS,
        easing: 'step-end',
        left: `${lerp(from.left, to.left, u)}px`,
        top: `${lerp(from.top, to.top, u)}px`,
        width: `${lerp(from.width, to.width, u)}px`,
        height: `${lerp(from.height, to.height, u)}px`,
      };
    });
  }

  async function unfold() {
    phase = 'unfolding';
    await tick();
    const to = paper?.getBoundingClientRect();
    // Nothing laid out to grow into (or no motion wanted): the letter is simply there.
    if (still || !layout || !to || to.width === 0) {
      land();
      return;
    }
    const from = risenLetter(layout);
    letterOut = true;
    draw(clock?.time ?? 0);
    ghost = from;
    await tick();
    const grow = ghostEl?.animate(growFrames(from, to), { duration: GROW_MS, fill: 'forwards' });
    if (grow) grow.onfinish = land;
    else land();
  }

  function land() {
    ghost = null;
    phase = 'open';
    onOpened?.();
    paper?.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
    writing = true;
  }

  onMount(() => {
    clock = subscribe(draw);
    const ro = new ResizeObserver(build);
    ro.observe(scene);
    const io = new IntersectionObserver(([entry]) => clock?.setVisible(entry.isIntersecting && !still));
    io.observe(scene);
    return () => {
      ro.disconnect();
      io.disconnect();
      clock?.stop();
      clearTimeout(timer);
    };
  });
</script>

<section id="anniversary-letter" class="letter-stage" aria-labelledby="letter-title">
  <div class="art">
    <div class="scene" bind:this={scene}>
      <PondCanvas seed="anniversary-dusk" scene="lake" palette="dusk" options={pondOptions} interactive />
      <!-- The button under the pond is the accessible control; this is the same action for a pointer. -->
      <button
        type="button"
        class="envelope"
        tabindex="-1"
        aria-hidden="true"
        disabled={phase !== 'sealed'}
        style:left="{box.left}px"
        style:top="{box.top}px"
        style:width="{box.width}px"
        style:height="{box.height}px"
        onclick={open}
      >
        <canvas bind:this={canvas}></canvas>
      </button>
    </div>
    <h1 id="letter-title" bind:this={title}>{letter.title}</h1>
  </div>
  <p class="visually-hidden">
    {phase === 'sealed'
      ? 'Two frogs sit on lily pads on a pond at dusk, and an envelope sealed with a heart floats between them.'
      : 'Two frogs sit on lily pads on a pond at dusk, beside an open envelope.'}
  </p>

  <div class="intro">
    <p>
      {letter.dedication}
      {#if phase === 'sealed'}Tap the heart to open your letter.{/if}
    </p>
    {#if phase !== 'open'}
      <button type="button" class="btn px" onclick={open} disabled={phase !== 'sealed'}>
        {phase === 'sealed' ? 'Open the letter' : 'Opening…'}
      </button>
    {/if}
  </div>

  {#if phase === 'unfolding' || phase === 'open'}
    <div class="sheet" class:waiting={phase === 'unfolding'}>
      <LetterSheet {letter} {attachments} {writing} instant={still} {onAttachment} {onWritten} bind:paper />
    </div>
  {/if}
</section>

{#if ghost}
  <!-- The same stationery the letter is written on, redrawn at every jump of its flight. -->
  <div
    class="ghost"
    bind:this={ghostEl}
    style:left="{ghost.left}px"
    style:top="{ghost.top}px"
    style:width="{ghost.width}px"
    style:height="{ghost.height}px"
    aria-hidden="true"
  >
    <Stationery kind="letter" paper={LETTER_PAPER} />
  </div>
{/if}

<style>
  .art {
    position: relative;
  }

  .scene {
    position: relative;
    height: 400px;
  }

  .envelope {
    position: absolute;
    padding: 0;
    border: 0;
    background: none;
  }

  .envelope:disabled {
    cursor: var(--cursor-default);
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }

  h1 {
    position: absolute;
    left: 27px;
    bottom: 21px;
    max-width: calc(100% - 48px);
    margin: 0;
    font-size: clamp(34px, 5.5vw, 50px);
    line-height: 1;
    text-shadow: 3px 3px 0 var(--bg);
    pointer-events: none;
  }

  .intro {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 12px 32px;
    margin-top: 22px;
  }

  .intro p {
    margin: 0;
    color: var(--muted);
  }

  .intro .btn {
    font-size: 18px;
    padding: 10px 20px;
  }

  .intro .btn:disabled {
    background: var(--field-focus);
    color: var(--muted);
    cursor: var(--cursor-default);
  }

  .sheet {
    margin-top: 40px;
  }

  /* Laid out so the travelling sheet knows where to land, but not shown until it has. */
  .sheet.waiting {
    visibility: hidden;
  }

  /* The sheet on its way out of the envelope. */
  .ghost {
    position: fixed;
    z-index: 90;
    pointer-events: none;
  }

  @media (max-width: 640px) {
    .scene {
      height: 280px;
    }

    h1 {
      position: static;
      max-width: 100%;
      margin-top: 12px;
      text-shadow: none;
      font-size: clamp(30px, 9vw, 40px);
    }

    .intro {
      margin-top: 12px;
    }

    .sheet {
      margin-top: 28px;
    }
  }
</style>
