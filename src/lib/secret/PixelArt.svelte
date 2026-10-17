<script lang="ts">
  import { spritePaths, type Sprite } from './pixel-art';

  let { sprite, px = 3, class: className = '' }: { sprite: Sprite; px?: number; class?: string } = $props();

  // Whole device pixels per art pixel, as the ponds do, so neighbouring art pixels never differ in width.
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  const scale = $derived(Math.max(1, Math.round(px * dpr)) / dpr);
  const paths = $derived(spritePaths(sprite));
</script>

<svg
  class={className}
  viewBox="0 0 {sprite.rows[0].length} {sprite.rows.length}"
  width={sprite.rows[0].length * scale}
  height={sprite.rows.length * scale}
  shape-rendering="crispEdges"
  aria-hidden="true"
  focusable="false"
>
  {#each paths as path (path.d)}
    <path d={path.d} style:fill={path.fill} />
  {/each}
</svg>

<style>
  svg {
    display: block;
    flex: none;
  }
</style>
