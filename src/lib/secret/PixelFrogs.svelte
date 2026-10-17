<script lang="ts">
  import { onMount } from 'svelte';
  import { Field, packPalette } from '../pond/field';
  import { drawFrog, frogBox, type FrogKind } from '../pond/frog';
  import { INK_COLORS } from '../pond/palette';
  import { prefersReducedMotion } from '../pond/ticker';

  let {
    frogs,
    size = 1,
    px = 3,
    happy = false,
  }: {
    /** Left to right. A mirrored frog faces left. */
    frogs: readonly { kind: FrogKind; mirror?: boolean }[];
    /** The pond's small, medium or large drawing. */
    size?: 0 | 1 | 2;
    /** CSS px per art pixel. */
    px?: number;
    /** Happy closed eyes. */
    happy?: boolean;
  } = $props();

  const inks = packPalette(INK_COLORS);
  /** Room above the heads for the pink frog's bow, and between the frogs. */
  const HEADROOM = 3;
  const GAP = 1;

  let canvas: HTMLCanvasElement;
  /** Which frog is mid-blink, or -1. */
  let blinking = $state(-1);

  const box = $derived(frogBox(size));
  const W = $derived(frogs.length * box.w + (frogs.length - 1) * GAP);
  const H = $derived(box.h + HEADROOM);
  // Whole device pixels per art pixel, as the ponds do.
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  const scale = $derived(Math.max(1, Math.round(px * dpr)) / dpr);

  $effect(() => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const F = new Field(W, H);
    frogs.forEach((frog, i) => {
      const eyes = happy ? 'happy' : blinking === i ? 'shut' : 'open';
      drawFrog(F, size, 'sit', { eyes, look: [0.7, 0.3] }, i * (box.w + GAP) + box.w / 2, H, {
        mirror: frog.mirror,
        kind: frog.kind,
      });
    });
    const img = ctx.createImageData(W, H);
    const out = new Uint32Array(img.data.buffer);
    for (let i = 0; i < F.ink.length; i++) if (F.ink[i]) out[i] = inks[F.ink[i] - 1];
    ctx.putImageData(img, 0, 0);
  });

  onMount(() => {
    if (prefersReducedMotion()) return;
    let timer = 0;
    const wait = () => {
      timer = window.setTimeout(() => {
        blinking = Math.floor(Math.random() * frogs.length);
        timer = window.setTimeout(() => {
          blinking = -1;
          wait();
        }, 160);
      }, 2200 + Math.random() * 3600);
    };
    wait();
    return () => clearTimeout(timer);
  });
</script>

<canvas
  bind:this={canvas}
  width={W}
  height={H}
  style:width="{W * scale}px"
  style:height="{H * scale}px"
  aria-hidden="true"
></canvas>

<style>
  canvas {
    display: block;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }
</style>
