<script lang="ts">
  import type { ModelsResponse, ModelUse, Metric } from './api';
  import { metricLabel, formatCompactTokens, formatUsd, formatDate } from './stats';
  import { getChartTheme } from './chartTheme';

  interface Props {
    data: ModelsResponse;
    groupBy?: 'model' | 'provider' | 'variant';
    metric?: Metric;
    theme: 'light' | 'dark';
    hiddenKeys?: ReadonlySet<string>;
    onToggle?: (key: string) => void;
    maxGroups?: number;
    title?: string;
    scale?: { width: number; height: number };
  }

  let {
    data,
    groupBy = 'model',
    metric = 'total_tokens',
    theme: themeMode,
    hiddenKeys = new Set<string>(),
    onToggle,
    maxGroups = 8,
    title,
    scale = { width: 720, height: 360 },
  }: Props = $props();

  const theme = $derived(getChartTheme(themeMode));

  const W = $derived(Math.max(240, scale.width));
  const H = $derived(Math.max(160, scale.height));
  const days = $derived([...data.points].sort((a, b) => a.date.localeCompare(b.date)));

  type Group = {
    key: string;
    label: string;
    color: string;
    total: number;
  };

  function keyAndLabel(m: ModelUse): { key: string; label: string } {
    if (groupBy === 'variant') {
      const label = m.variant ?? 'Untagged';
      return { key: label, label };
    }
    if (groupBy === 'provider') {
      const label = m.provider ?? 'Direct';
      return { key: label, label };
    }
    const name = m.name ?? m.model;
    const label = m.variant ? `${name} \u00b7 ${m.variant}` : name;
    return { key: label, label };
  }

  function valueOf(m: ModelUse): number {
    const raw = (m as Record<Metric, number | null>)[metric];
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
  }

  function familyColor(i: number): string {
    const hue = (i * 137.508) % 360;
    const sat = Math.max(45, 68 - i * 4);
    const lig = Math.min(72, 44 + i * 9);
    return `hsl(${hue}, ${sat}%, ${lig}%)`;
  }

  const groupMeta = $derived.by(() => {
    const map = new Map<string, { key: string; label: string; total: number }>();
    for (const point of days) {
      for (const m of point.models) {
        const { key, label } = keyAndLabel(m);
        const v = valueOf(m);
        const entry = map.get(key);
        if (entry) {
          entry.total += v;
        } else {
          map.set(key, { key, label, total: v });
        }
      }
    }
    const sorted = [...map.values()].sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.key.localeCompare(b.key);
    });
    const maxG = Math.floor(Math.max(1, maxGroups));
    const top = sorted.slice(0, maxG);
    const rest = sorted.slice(maxG);
    const topKeys = new Set(top.map((g) => g.key));
    const groups: Group[] = top.map((g, i) => ({ ...g, color: familyColor(i) }));
    if (rest.length > 0) {
      const total = rest.reduce((s, g) => s + g.total, 0);
      groups.push({
        key: '__other__',
        label: `Other (${rest.length})`,
        color: '#9ca3af',
        total,
      });
    }
    return { groups, topKeys, otherCount: rest.length };
  });

  const allGroups = $derived(groupMeta.groups);
  const visibleGroups = $derived(allGroups.filter((g) => !hiddenKeys.has(g.key)));

  const nGroups = $derived(allGroups.length);
  const legendRows = $derived(Math.ceil(nGroups / 3));
  const colW = $derived(Math.max(120, W / 3));
  const bottom = $derived(days.length > 0 ? 48 : 24);
  const top = $derived(28 + legendRows * 18);
  const left = 64;
  const right = 20;
  const S = $derived(Math.max(1, W - left - right));
  const C = $derived(Math.max(1, H - top - bottom));
  const w = $derived(S / Math.max(1, days.length));
  const barGap = $derived(days.length > 40 ? 1 : 2);
  const barW = $derived(Math.max(1, w - barGap));
  const baseline = $derived(top + C);

  type Segment = {
    key: string;
    label: string;
    color: string;
    date: string;
    dayIndex: number;
    value: number;
    x: number;
    y: number;
    height: number;
  };

  const chartData = $derived.by(() => {
    const dayTotals: number[] = new Array(days.length).fill(0);
    // Compute raw day totals first to determine the scale.
    for (let i = 0; i < days.length; i++) {
      const point = days[i];
      const dayMap = new Map<string, number>();
      for (const m of point.models) {
        const { key } = keyAndLabel(m);
        dayMap.set(key, (dayMap.get(key) ?? 0) + valueOf(m));
      }
      let sum = 0;
      for (const g of visibleGroups) {
        if (g.key === '__other__') {
          for (const [k, v] of dayMap) {
            if (!groupMeta.topKeys.has(k)) sum += v;
          }
        } else {
          sum += dayMap.get(g.key) ?? 0;
        }
      }
      dayTotals[i] = sum;
    }
    const yMax = Math.max(1, ...dayTotals);

    const segments: Segment[] = [];
    for (let i = 0; i < days.length; i++) {
      const point = days[i];
      const dayMap = new Map<string, number>();
      for (const m of point.models) {
        const { key } = keyAndLabel(m);
        dayMap.set(key, (dayMap.get(key) ?? 0) + valueOf(m));
      }
      let running = 0;
      for (const g of visibleGroups) {
        let v = 0;
        if (g.key === '__other__') {
          for (const [k, val] of dayMap) {
            if (!groupMeta.topKeys.has(k)) v += val;
          }
        } else {
          v = dayMap.get(g.key) ?? 0;
        }
        if (v > 0) {
          const height = (v / yMax) * C;
          const y = baseline - running - height;
          segments.push({
            key: g.key,
            label: g.label,
            color: g.color,
            date: point.date,
            dayIndex: i,
            value: v,
            x: left + i * w,
            y,
            height,
          });
        }
        running += (v / yMax) * C;
      }
    }
    return { segments, dayTotals, yMax };
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

  let activeSegment = $state<{ key: string; date: string } | null>(null);
  let tooltip = $state<Tooltip | null>(null);

  function fmtValue(v: number): string {
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

  function showFromPointer(e: PointerEvent, segment: Segment) {
    activeSegment = { key: segment.key, date: segment.date };
    const svg = (e.currentTarget as SVGRectElement).ownerSVGElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const py = ((e.clientY - rect.top) / rect.height) * H;
    const centerX = segment.x + barW / 2;
    const pos = positionTooltip(svg, py, centerX);
    const dayTotal = chartData.dayTotals[segment.dayIndex] || 1;
    const pct = segment.value > 0 ? (segment.value / dayTotal) * 100 : 0;
    const valueStr = fmtValue(segment.value);
    const line2 =
      segment.value > 0 ? `${valueStr} \u00b7 ${pct.toFixed(0)}% of day` : '0 \u00b7 0% of day';
    tooltip = { ...pos, label: `${segment.label} \u00b7 ${formatDate(segment.date)}`, line2 };
  }

  function showFromFocus(e: FocusEvent, segment: Segment) {
    activeSegment = { key: segment.key, date: segment.date };
    const svg = (e.currentTarget as SVGRectElement).ownerSVGElement;
    if (!svg) return;
    const centerX = segment.x + barW / 2;
    const py = segment.y + segment.height / 2;
    const pos = positionTooltip(svg, py, centerX);
    const dayTotal = chartData.dayTotals[segment.dayIndex] || 1;
    const pct = segment.value > 0 ? (segment.value / dayTotal) * 100 : 0;
    const valueStr = fmtValue(segment.value);
    const line2 =
      segment.value > 0 ? `${valueStr} \u00b7 ${pct.toFixed(0)}% of day` : '0 \u00b7 0% of day';
    tooltip = { ...pos, label: `${segment.label} \u00b7 ${formatDate(segment.date)}`, line2 };
  }

  function hideTooltip() {
    activeSegment = null;
    tooltip = null;
  }

  const tickIndices = $derived(ld(
    days.map((p) => p.date),
    S,
  ));

  const desc = $derived(`Daily ${metricLabel(metric).toLowerCase()} stacked by ${groupBy}.`);
  const resolvedTitle = $derived(title ?? `${metricLabel(metric)} by model`);
  const yMaxLabel = $derived(
    metric === 'estimated_cost_usd' ? formatUsd(chartData.yMax) : formatCompactTokens(chartData.yMax),
  );
</script>

<svg
  class="chart"
  viewBox="0 0 {W} {H}"
  role="img"
  aria-labelledby="usage-models-title usage-models-description"
  style:background-color={theme.background}
>
  <title id="usage-models-title">{resolvedTitle}</title>
  <desc id="usage-models-description">{desc}</desc>

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
    0
  </text>
  <text
    x={left - 8}
    y={top + 4}
    text-anchor="end"
    font-size="11"
    fill={theme.axis}
    font-family="var(--font-sans)"
  >
    {yMaxLabel}
  </text>

  <!-- x-axis labels -->
  {#each tickIndices as idx}
    {@const x = left + idx * w + barW / 2}
    {@const y = H - bottom + 18}
    <text
      {x}
      {y}
      text-anchor="middle"
      font-size="11"
      fill={theme.axis}
      font-family="var(--font-sans)"
    >
      {formatDate(days[idx].date)}
    </text>
  {/each}

  <!-- bars -->
  {#each chartData.segments as s (s.key + s.date)}
    {@const active = activeSegment?.key === s.key && activeSegment?.date === s.date}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <rect
      x={s.x}
      y={s.y}
      width={barW}
      height={s.height}
      fill={s.color}
      opacity={active ? 1 : 0.92}
      stroke={active ? 'var(--text)' : 'transparent'}
      stroke-width={active ? 1.5 : 0}
      tabindex="0"
      role="img"
      aria-label={`${s.label}, ${formatDate(s.date)}: ${fmtValue(s.value)}`}
      data-usage-segment
      data-date={s.date}
      data-group={s.key}
      onpointerenter={(e) => showFromPointer(e, s)}
      onpointerleave={hideTooltip}
      onfocus={(e) => showFromFocus(e, s)}
      onblur={hideTooltip}
    />
  {/each}

  <!-- legend -->
  {#each allGroups as g, i}
    {@const row = Math.floor(i / 3)}
    {@const col = i % 3}
    {@const x = 12 + col * colW}
    {@const y = 14 + row * 18}
    {@const hidden = hiddenKeys.has(g.key)}
    <g
      class="legend-item"
      data-legend-group={g.key}
      opacity={hidden ? 0.45 : 1}
      tabindex="0"
      role="button"
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle?.(g.key);
        }
      }}
      onclick={() => onToggle?.(g.key)}
    >
      <rect {x} y={y - 8} width="10" height="10" rx="2" fill={g.color} />
      <text
        x={x + 15}
        y={y + 1}
        font-size="11"
        fill={theme.foreground}
        font-family="var(--font-sans)"
      >
        {g.label}
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
