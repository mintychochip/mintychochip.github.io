<script lang="ts">
  import type { SeriesResponse, Metric } from './api';
  import { METRICS } from './api';
  import { metricLabel, formatCompactTokens, formatUsd, formatDate } from './stats';
  import { getChartTheme } from './chartTheme';

  interface Props {
    data: SeriesResponse;
    theme: 'light' | 'dark';
    metrics?: readonly Metric[];
    hiddenKeys?: ReadonlySet<string>;
    onToggle?: (metric: Metric) => void;
    scale?: { width: number; height: number };
  }

  let {
    data,
    theme: themeMode,
    metrics = METRICS,
    hiddenKeys = new Set<string>(),
    onToggle,
    scale = { width: 720, height: 360 },
  }: Props = $props();

  const theme = $derived(getChartTheme(themeMode));

  const W = $derived(Math.max(240, scale.width));
  const H = $derived(Math.max(160, scale.height));
  const dates = $derived([...new Set(data.points.map((p) => p.date))].sort());

  const available = $derived(new Set(data.metrics));
  const selectedMetrics = $derived(
    METRICS.filter((m) => available.has(m) && metrics.includes(m)),
  );
  const visibleMetrics = $derived(selectedMetrics.filter((m) => !hiddenKeys.has(m)));

  const hasCost = $derived(visibleMetrics.includes('estimated_cost_usd'));
  const hasTokens = $derived(visibleMetrics.some((m) => m !== 'estimated_cost_usd'));
  const dualAxis = $derived(hasCost && hasTokens);

  const leftMetrics = $derived(
    dualAxis ? visibleMetrics.filter((m) => m !== 'estimated_cost_usd') : visibleMetrics,
  );
  const rightMetrics = $derived(
    dualAxis
      ? (['estimated_cost_usd'] as Metric[])
      : hasCost
        ? (['estimated_cost_usd'] as Metric[])
        : [],
  );

  const top = $derived(selectedMetrics.length > 0 ? 64 : 28);
  const right = $derived(dualAxis ? 64 : 28);
  const bottom = $derived(dates.length > 0 ? 48 : 24);
  const left = 64;
  const S = $derived(Math.max(1, W - left - right));
  const C = $derived(Math.max(1, H - top - bottom));
  const baseline = $derived(top + C);

  const { leftMax, rightMax } = $derived.by(() => {
    let lMax = 0;
    for (const metric of leftMetrics) {
      for (const point of data.points) {
        const raw = point[metric];
        if (typeof raw === 'number' && Number.isFinite(raw)) {
          lMax = Math.max(lMax, raw);
        }
      }
    }
    let rMax = 0;
    for (const metric of rightMetrics) {
      for (const point of data.points) {
        const raw = point[metric];
        if (typeof raw === 'number' && Number.isFinite(raw)) {
          rMax = Math.max(rMax, raw);
        }
      }
    }
    return { leftMax: Math.max(1, lMax), rightMax: Math.max(1, rMax) };
  });

  function xScale(date: string): number {
    const i = dates.indexOf(date);
    if (dates.length <= 1) return left + S / 2;
    return left + (i / (dates.length - 1)) * S;
  }

  function yScale(metric: Metric, v: number): number {
    const norm = metric === 'estimated_cost_usd' ? rightMax : leftMax;
    return top + C - (v / norm) * C;
  }

  function metricColor(metric: Metric): string {
    return metric === 'estimated_cost_usd'
      ? theme.costColors[metric]
      : theme.tokenColors[metric as 'input_tokens' | 'output_tokens' | 'total_tokens'];
  }

  type Point = {
    metric: Metric;
    date: string;
    value: number;
    x: number;
    y: number;
    color: string;
  };

  const seriesData = $derived.by(() => {
    const paths: { metric: Metric; d: string; color: string }[] = [];
    const points: Point[] = [];
    for (const metric of visibleMetrics) {
      const color = metricColor(metric);
      const dateValue = new Map<string, number>();
      for (const p of data.points) {
        const raw = p[metric];
        if (typeof raw === 'number' && Number.isFinite(raw)) {
          dateValue.set(p.date, raw);
        }
      }
      let d = '';
      let started = false;
      for (const date of dates) {
        const v = dateValue.get(date);
        if (v !== undefined) {
          const x = xScale(date);
          const y = yScale(metric, v);
          d += started ? ` L ${x},${y}` : `M ${x},${y}`;
          started = true;
          points.push({ metric, date, value: v, x, y, color });
        } else {
          started = false;
        }
      }
      paths.push({ metric, d, color });
    }
    return { paths, points };
  });

  const tooltipW = $derived(Math.min(240, W - 8));
  const tooltipBg = $derived(theme.background === 'transparent' ? '#ffffff' : theme.background);
  const tooltipText = $derived(tooltipBg === '#ffffff' ? '#111827' : '#ffffff');

  type Tooltip = {
    x: number;
    y: number;
    label: string;
    line2: string;
  };

  let activePoint = $state<{ metric: Metric; date: string } | null>(null);
  let tooltip = $state<Tooltip | null>(null);

  function fmtValue(metric: Metric, v: number): string {
    return metric === 'estimated_cost_usd' ? formatUsd(v) : formatCompactTokens(v);
  }

  function ld(dates: string[], S: number): number[] {
    const count = Math.min(Math.max(2, Math.floor(S / 96) + 1), 6);
    if (dates.length <= count) return dates.map((_, i) => i);
    const out: number[] = [];
    for (let k = 0; k < count; k++) {
      const idx = Math.round((k * (dates.length - 1)) / (count - 1));
      out.push(idx);
    }
    return out;
  }

  function positionTooltip(svg: SVGSVGElement, pointerY: number, centerX: number): { x: number; y: number } {
    let ty = pointerY - 52 - 12;
    if (pointerY <= top + 52 + 12 || ty < 4) ty = pointerY + 12;
    const tx = Math.max(4, Math.min(W - tooltipW - 4, centerX - tooltipW / 2));
    ty = Math.max(4, Math.min(H - 52 - 4, ty));
    return { x: tx, y: ty };
  }

  function showFromPointer(e: PointerEvent, point: Point) {
    activePoint = { metric: point.metric, date: point.date };
    const svg = (e.currentTarget as SVGCircleElement).ownerSVGElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const py = ((e.clientY - rect.top) / rect.height) * H;
    const pos = positionTooltip(svg, py, point.x);
    const valueStr = fmtValue(point.metric, point.value);
    const harness = (data as unknown as { harnesses?: string[] | null }).harnesses?.[0];
    const line2 = harness ? `${valueStr} \u00b7 ${harness}` : valueStr;
    tooltip = {
      ...pos,
      label: `${metricLabel(point.metric)} \u00b7 ${formatDate(point.date)}`,
      line2,
    };
  }

  function showFromFocus(e: FocusEvent, point: Point) {
    activePoint = { metric: point.metric, date: point.date };
    const svg = (e.currentTarget as SVGCircleElement).ownerSVGElement;
    if (!svg) return;
    const pos = positionTooltip(svg, point.y, point.x);
    const valueStr = fmtValue(point.metric, point.value);
    const harness = (data as unknown as { harnesses?: string[] | null }).harnesses?.[0];
    const line2 = harness ? `${valueStr} \u00b7 ${harness}` : valueStr;
    tooltip = {
      ...pos,
      label: `${metricLabel(point.metric)} \u00b7 ${formatDate(point.date)}`,
      line2,
    };
  }

  function hideTooltip() {
    activePoint = null;
    tooltip = null;
  }

  const tickIndices = $derived(ld(dates, S));
  const desc = $derived(`Daily ${selectedMetrics.map(metricLabel).join(', ')} over time.`);

  const leftLabel = $derived(
    leftMetrics.length === 1 && leftMetrics[0] === 'estimated_cost_usd'
      ? formatUsd(leftMax)
      : formatCompactTokens(leftMax),
  );
</script>

<svg
  class="chart"
  viewBox="0 0 {W} {H}"
  role="img"
  aria-labelledby="usage-graph-title usage-graph-description"
  style:background-color={theme.background}
>
  <title id="usage-graph-title">Usage metrics over time</title>
  <desc id="usage-graph-description">{desc}</desc>

  <!-- grid -->
  {#each [0, 1, 2, 3, 4] as i}
    {@const y = baseline - (i / 4) * C}
    <line x1={left} x2={W - right} {y} stroke="var(--chart-grid)" stroke-width="1" />
  {/each}

  <!-- y-axis labels -->
  <text
    x={left - 8}
    y={baseline + 4}
    text-anchor="end"
    font-size="11"
    fill={theme.axis}
    font-family="var(--font-sans)"
  >
    {leftMetrics.length === 1 && leftMetrics[0] === 'estimated_cost_usd' ? '$0' : '0'}
  </text>
  <text
    x={left - 8}
    y={top + 4}
    text-anchor="end"
    font-size="11"
    fill={theme.axis}
    font-family="var(--font-sans)"
  >
    {leftLabel}
  </text>

  {#if dualAxis}
    <text
      x={W - right + 8}
      y={baseline + 4}
      text-anchor="start"
      font-size="11"
      fill={theme.axis}
      font-family="var(--font-sans)"
    >
      $0
    </text>
    <text
      x={W - right + 8}
      y={top + 4}
      text-anchor="start"
      font-size="11"
      fill={theme.axis}
      font-family="var(--font-sans)"
    >
      {formatUsd(rightMax)}
    </text>
  {/if}

  <!-- x-axis labels -->
  {#each tickIndices as idx}
    {@const x = xScale(dates[idx])}
    {@const y = H - bottom + 18}
    <text
      {x}
      {y}
      text-anchor="middle"
      font-size="11"
      fill={theme.axis}
      font-family="var(--font-sans)"
    >
      {formatDate(dates[idx])}
    </text>
  {/each}

  <!-- paths -->
  {#each seriesData.paths as p (p.metric)}
    <path d={p.d} stroke={p.color} fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.92" />
  {/each}

  <!-- points -->
  {#each seriesData.points as p (p.metric + p.date)}
    {@const active = activePoint?.metric === p.metric && activePoint?.date === p.date}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <circle
      cx={p.x}
      cy={p.y}
      r={active ? 6 : 4}
      fill={p.color}
      stroke={active ? 'var(--text)' : 'transparent'}
      stroke-width={active ? 2 : 12}
      tabindex="0"
      role="img"
      aria-label={`${metricLabel(p.metric)}, ${formatDate(p.date)}: ${fmtValue(p.metric, p.value)}`}
      data-usage-point
      data-date={p.date}
      data-metric={p.metric}
      onpointerenter={(e) => showFromPointer(e, p)}
      onpointerleave={hideTooltip}
      onfocus={(e) => showFromFocus(e, p)}
      onblur={hideTooltip}
    />
  {/each}

  <!-- legend -->
  {#each selectedMetrics as metric, i}
    {@const row = Math.floor(i / 3)}
    {@const col = i % 3}
    {@const x = 12 + col * Math.max(120, W / 3)}
    {@const y = 14 + row * 18}
    {@const hidden = hiddenKeys.has(metric)}
    {@const color = metricColor(metric)}
    <g
      class="legend-item"
      data-legend-group={metric}
      opacity={hidden ? 0.45 : 1}
      tabindex="0"
      role="button"
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle?.(metric);
        }
      }}
      onclick={() => onToggle?.(metric)}
    >
      <rect {x} y={y - 8} width="10" height="10" rx="2" fill={color} />
      <text
        x={x + 15}
        y={y + 1}
        font-size="11"
        fill={theme.foreground}
        font-family="var(--font-sans)"
      >
        {metricLabel(metric)}
      </text>
    </g>
  {/each}

  <!-- tooltip -->
  {#if tooltip}
    <g transform={`translate(${tooltip.x}, ${tooltip.y})`} pointer-events="none">
      <rect
        width={tooltipW}
        height="52"
        rx="7"
        fill={tooltipBg}
        stroke={theme.grid}
        opacity="0.97"
      />
      <text
        x="10"
        y="20"
        font-size="11"
        font-weight="600"
        fill={tooltipText}
        font-family="var(--font-sans)"
      >
        {tooltip.label}
      </text>
      <text x="10" y="39" font-size="11" fill={tooltipText} font-family="var(--font-sans)">
        {tooltip.line2}
      </text>
    </g>
  {/if}
</svg>

<style>
  .chart {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
  }
  .legend-item {
    cursor: pointer;
    outline: none;
  }
  .legend-item:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 2px;
  }
</style>
