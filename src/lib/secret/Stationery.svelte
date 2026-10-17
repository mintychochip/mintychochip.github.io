<script lang="ts">
  import { onMount } from 'svelte';
  import { pixelScale } from '../pond/PondCanvas.svelte';
  import { spritePaths, stationerySprite, type StationeryKind } from './pixel-art';

  let { kind, paper }: { kind: StationeryKind; paper: string } = $props();

  let host: HTMLDivElement;
  /** The sheet in art pixels, and CSS px per art pixel. */
  let size = $state({ w: 0, h: 0, s: 3 });
  const paths = $derived(size.w > 8 && size.h > 8 ? spritePaths(stationerySprite(size.w, size.h, kind, paper)) : []);

  onMount(() => {
    // Redrawn whenever the sheet changes size: as the letter unrolls, and on every jump of its flight.
    const ro = new ResizeObserver(() => {
      const s = pixelScale();
      size = { w: Math.round(host.clientWidth / s), h: Math.round(host.clientHeight / s), s };
    });
    ro.observe(host);
    return () => ro.disconnect();
  });
</script>

<!-- Drawn behind the sheet's words; the sheet itself has no background of its own. -->
<div class="stationery" bind:this={host} aria-hidden="true">
  {#if paths.length}
    <svg
      viewBox="0 0 {size.w} {size.h}"
      width={size.w * size.s}
      height={size.h * size.s}
      shape-rendering="crispEdges"
    >
      {#each paths as path}
        <path d={path.d} style:fill={path.fill} />
      {/each}
    </svg>
  {/if}
</div>

<style>
  .stationery {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
  }

  svg {
    display: block;
  }
</style>
