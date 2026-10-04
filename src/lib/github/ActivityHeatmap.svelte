<script lang="ts">
  import { onMount } from 'svelte';
  import { packPalette, quantize } from '../pond/field';
  import { PALETTES } from '../pond/palette';
  import { columnDates, formatShortDate, heatmapField, heatmapLegendColors, type ActivitySummary } from './activity';

  let { summary, onhover }: { summary: ActivitySummary; onhover?: () => void } = $props();

  const palette = PALETTES.night;
  const colors = packPalette(palette);
  const legendColors = heatmapLegendColors(palette);

  let frame: HTMLDivElement | undefined = $state();
  let plot: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let size = $state({ w: 0, h: 0, S: 3 });
  let hi = $state<{ col: number; row: number } | null>(null);

  const layout = $derived(heatmapField(summary.columns));
  const starts = $derived(columnDates(summary.days));

  const dayAt = (col: number, row: number) => summary.days[col * 7 + row];

  const description = $derived(
    `Contribution heatmap, ${summary.columns.length} weeks. ` +
      `${summary.totalLastYear.toLocaleString()} contributions in the last year on GitHub.`,
  );

  const hover = $derived.by(() => {
    if (!hi) return null;
    const d = dayAt(hi.col, hi.row);
    if (!d) return null;
    return { date: formatShortDate(d.date), count: d.count };
  });

  let scale = $state(3);

  $effect(() => {
    summary;
    const { w } = size;
    if (!w || !canvas) return;
    const L = layout;
    const W = L.F.W;
    const H = L.F.H;
    const dpr = window.devicePixelRatio || 1;
    const S = Math.max(2, Math.round(3 * dpr)) / dpr;
    scale = S;
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = `${W * S}px`;
    canvas.style.height = `${H * S}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(W, H);
    quantize(L.F, colors, new Uint32Array(img.data.buffer));
    ctx.putImageData(img, 0, 0);

    // Show recent weeks first when scrolled on mobile
    if (frame && frame.scrollWidth > frame.clientWidth) {
      frame.scrollLeft = frame.scrollWidth - frame.clientWidth;
    }
  });

  function cellAt(clientX: number, clientY: number): { col: number; row: number } | null {
    const rect = canvas.getBoundingClientRect();
    const S = canvas.width / rect.width;
    const x = (clientX - rect.left) * S;
    const y = (clientY - rect.top) * S;
    const { cell, gap, cx, ry, cols } = layout;
    const pitch = cell + gap;
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < 7; row++) {
        const x0 = cx(col);
        const y0 = ry(row);
        if (x >= x0 && x < x0 + cell && y >= y0 && y < y0 + cell) return { col, row };
      }
    }
    return null;
  }

  function setHi(next: { col: number; row: number } | null) {
    if (next && (!hi || hi.col !== next.col || hi.row !== next.row)) {
      onhover?.();
    }
    hi = next;
  }

  const xLabels = $derived.by(() => {
    const n = starts.length;
    if (n < 2) return [];
    const picks = [0, Math.floor((n - 1) / 2), n - 1];
    return picks.map((i, k) => ({
      i,
      text: formatShortDate(starts[i]),
      edge: k === 0 ? 'first' : k === picks.length - 1 ? 'last' : '',
    }));
  });

  onMount(() => {
    const ro = new ResizeObserver(([entry]) => {
      size = { w: entry.contentRect.width, h: entry.contentRect.height, S: 3 };
    });
    ro.observe(plot);
    return () => ro.disconnect();
  });
</script>

<figure class="chart">
  <div class="frame" bind:this={frame}>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class="plot"
      bind:this={plot}
      role="img"
      aria-label={description}
      tabindex="0"
      onpointermove={(e) => setHi(cellAt(e.clientX, e.clientY))}
      onpointerdown={(e) => setHi(cellAt(e.clientX, e.clientY))}
      onpointerleave={(e) => e.pointerType === 'mouse' && setHi(null)}
    >
      <canvas bind:this={canvas}></canvas>
      {#each xLabels as l (l.i)}
        <span
          class="x {l.edge}"
          style:left="{(layout.cx(l.i) + layout.cell / 2) * scale}px"
          >{l.text}</span
        >
      {/each}
    </div>
  </div>
  <figcaption class="legend" aria-live="polite">
    {#if hover}
      <span class="when"><b>{hover.count}</b> on {hover.date}</span>
    {:else}
      <span class="hint">Tap or hover a square for that day.</span>
    {/if}
    <span class="scale" aria-hidden="true">
      <i style:background={legendColors[0]}></i> less
      {#each legendColors.slice(1) as hex (hex)}
        <i style:background={hex}></i>
      {/each}
      more
    </span>
  </figcaption>
</figure>

<style>
  .chart {
    margin: 16px 0 0;
  }
  .frame {
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
    scrollbar-color: var(--dim) transparent;
  }
  .plot {
    position: relative;
    width: max-content;
    min-width: max-content;
    padding-bottom: 26px;
    display: flex;
    flex-direction: column;
  }
  canvas {
    image-rendering: pixelated;
    display: block;
  }
  .x {
    position: absolute;
    bottom: 2px;
    transform: translateX(-50%);
    font-size: 14px;
    color: var(--dim);
    white-space: nowrap;
    pointer-events: none;
  }
  .x.first {
    transform: translateX(0);
  }
  .x.last {
    transform: translateX(-100%);
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 8px 20px;
    margin-top: 20px;
    color: var(--muted);
    font-size: 15px;
  }
  .when b {
    color: var(--fg);
  }
  .hint {
    color: var(--dim);
  }
  .scale {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
  }
  .scale i {
    width: 12px;
    height: 12px;
    image-rendering: pixelated;
  }
  @media (max-width: 480px) {
    .legend {
      gap: 6px 14px;
      font-size: 14px;
      margin-top: 14px;
    }
    .scale {
      margin-left: 0;
    }
  }
</style>
