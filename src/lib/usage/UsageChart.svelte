<script lang="ts">
  import { onMount } from 'svelte';
  import { bars, type BarsLayout } from '../pond/bars';
  import { packPalette, quantize } from '../pond/field';
  import { PALETTES } from '../pond/palette';
  import { formatCompactTokens, formatDate } from './stats';
  import type { ChartData } from './series';

  let { data }: { data: ChartData } = $props();

  /** Palette level per series: everything else, then the top two models. */
  const LEVEL = [3, 7, 5];
  const colors = packPalette(PALETTES.night);
  const seriesColor = (j: number) => PALETTES.night[LEVEL[j] ?? 3];

  let plot: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let size = $state({ w: 0, h: 0, S: 3 });
  let activeS = $state(3);
  let hi = $state<number | null>(null);
  let layout = $state.raw<BarsLayout | null>(null);

  const tick = (v: number) => formatCompactTokens(v).replace('.0', '');
  const when = (i: number) =>
    data.bucket > 1 ? `week of ${formatDate(data.starts[i])}` : formatDate(data.starts[i]);
  const peak = $derived(data.totals.indexOf(Math.max(...data.totals)));
  const order = $derived(data.series.map((_, j) => j).slice(1).concat(0));

  $effect(() => {
    const { w, h, S: defaultS } = size;
    if (!w || !h || !canvas) return;
    const n = data.rows.length;
    const minArtPixels = n > 1 ? n * 2 - 1 : 1;
    const S = w < minArtPixels * defaultS ? Math.max(1, w / minArtPixels) : defaultS;
    activeS = S;
    const W = Math.max(minArtPixels, Math.ceil(w / S)), H = Math.ceil(h / S);
    const gap = n <= 10 ? 8 : (W - (n - 1) * 2) / n >= 3 ? 2 : 1;
    const L = bars(W, H, data.rows, {
      series: LEVEL, bg: [0, 0.2], bgPow: 2.4, grid: 1, axis: 2, gap, headroom: 4,
      highlight: hi ?? undefined,
    });
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = `${W * S}px`;
    canvas.style.height = `${H * S}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(W, H);
    quantize(L.F, colors, new Uint32Array(img.data.buffer));
    ctx.putImageData(img, 0, 0);
    layout = L;
  });

  $effect(() => {
    data;
    hi = null;
  });

  function barAt(clientX: number): number | null {
    if (!layout) return null;
    const x = (clientX - canvas.getBoundingClientRect().left) / activeS;
    const n = data.rows.length, pitch = n > 1 ? layout.bx(1) - layout.bx(0) : layout.bw;
    const i = Math.floor((x - layout.bx(0) + (pitch - layout.bw) / 2) / pitch);
    return i >= 0 && i < n ? i : null;
  }

  function onKey(e: KeyboardEvent) {
    const n = data.rows.length;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const d = e.key === 'ArrowRight' ? 1 : -1;
      hi = hi === null ? (d > 0 ? 0 : n - 1) : Math.min(n - 1, Math.max(0, hi + d));
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      hi = e.key === 'Home' ? 0 : n - 1;
    } else if (e.key === 'Escape') {
      hi = null;
    }
  }

  onMount(() => {
    const ro = new ResizeObserver(([entry]) => {
      const dpr = window.devicePixelRatio || 1;
      size = { w: entry.contentRect.width, h: entry.contentRect.height, S: Math.max(2, Math.round(3 * dpr)) / dpr };
    });
    ro.observe(plot);
    return () => ro.disconnect();
  });

  const xLabels = $derived.by(() => {
    const n = data.rows.length;
    const picks = n > 2 ? [0, Math.floor((n - 1) / 2), n - 1] : [...Array(n).keys()];
    return picks.map((i, k) => ({ i, text: formatDate(data.starts[i]), edge: k === 0 ? 'first' : k === picks.length - 1 ? 'last' : '' }));
  });

  const description = $derived(
    `${data.bucket > 1 ? 'Weekly' : 'Daily'} tokens from ${formatDate(data.from)} to ${formatDate(data.to)}. ` +
      `The biggest ${data.bucket > 1 ? 'week' : 'day'} was ${when(peak)}, at ${formatCompactTokens(data.totals[peak] ?? 0)}.`,
  );
</script>

<figure class="chart">
  <div class="frame">
    <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
    <div
      class="plot"
      bind:this={plot}
      role="img"
      aria-label={description}
      tabindex="0"
      onpointermove={(e) => (hi = barAt(e.clientX))}
      onpointerdown={(e) => (hi = barAt(e.clientX))}
      onpointerleave={(e) => e.pointerType === 'mouse' && (hi = null)}
      onkeydown={onKey}
      onblur={() => (hi = null)}
    >
      <canvas bind:this={canvas}></canvas>
      {#if layout}
        {#each layout.ticks as t (t.value)}
          <span class="y" style:top="{(t.y + 0.5) * activeS}px">{tick(t.value)}</span>
        {/each}
        {#each xLabels as l (l.i)}
          <span class="x {l.edge}" style:left="{(layout.bx(l.i) + layout.bw / 2) * activeS}px">{l.text}</span>
        {/each}
        {#if peak >= 0 && hi === null}
          <span
            class="note"
            style:left="{(layout.bx(peak) + layout.bw / 2) * activeS}px"
            style:top="{layout.sy(data.totals[peak]) * activeS}px">peak</span
          >
        {/if}
      {/if}
    </div>
  </div>
  <figcaption class="legend" aria-live="polite">
    {#if hi !== null}
      <span class="when">{when(hi)}: <b>{formatCompactTokens(data.totals[hi])}</b></span>
    {/if}
    {#each order as j (data.series[j])}
      <span class="key">
        <i style:background={seriesColor(j)}></i>{data.series[j]}
        {#if hi !== null}<span class="val">{formatCompactTokens(data.rows[hi][j])}</span>{/if}
      </span>
    {/each}
  </figcaption>
</figure>

<style>
  .chart {
    margin: 22px 0 0;
    max-width: 100%;
    min-width: 0;
  }
  .frame {
    padding: 0 0 30px 56px;
  }
  .plot {
    position: relative;
    height: 210px;
    background: var(--bg);
    cursor: crosshair;
  }
  .plot:focus-visible {
    outline-offset: 6px;
  }
  canvas {
    position: absolute;
    top: 0;
    left: 0;
    image-rendering: pixelated;
  }
  .y,
  .x,
  .note {
    position: absolute;
    font-size: 16px;
    line-height: 1;
    color: var(--dim);
    white-space: nowrap;
    pointer-events: none;
  }
  .y {
    right: calc(100% + 10px);
    transform: translateY(-50%);
  }
  .x {
    top: calc(100% + 10px);
    transform: translateX(-50%);
  }
  .x.first {
    transform: translateX(-4px);
  }
  .x.last {
    transform: translateX(calc(-100% + 4px));
  }
  .note {
    color: var(--muted);
    transform: translate(-50%, calc(-100% - 6px));
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 22px;
    min-height: 26px;
    margin: 0;
    padding-left: 56px;
    font-size: 16px;
    color: var(--muted);
  }
  .when {
    color: var(--fg);
  }
  .when b {
    font-weight: 700;
  }
  .key {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .key i {
    width: 12px;
    height: 12px;
  }
  .val {
    color: var(--fg);
  }
  @media (max-width: 560px) {
    .frame {
      padding: 0 0 28px 38px;
    }
    .plot {
      height: 180px;
    }
    .y,
    .x,
    .note {
      font-size: 13px;
    }
    .y {
      right: calc(100% + 6px);
    }
    .x {
      top: calc(100% + 8px);
    }
    .legend {
      padding-left: 0;
      gap: 6px 14px;
      font-size: 14px;
      margin-top: 4px;
    }
  }
  @media (max-width: 380px) {
    .frame {
      padding: 0 0 26px 32px;
    }
    .plot {
      height: 160px;
    }
    .y,
    .x,
    .note {
      font-size: 12px;
    }
    .y {
      right: calc(100% + 4px);
    }
    .legend {
      gap: 4px 10px;
      font-size: 13px;
    }
    .key i {
      width: 10px;
      height: 10px;
    }
  }
</style>
