<script lang="ts">
  import { onMount } from 'svelte';
  import PassCard from './PassCard.svelte';

  export interface PassItem {
    id: number;
    title: string;
    icon: string;
    desc: string;
    redeemed: boolean;
  }

  let {
    passes,
    activeIndex = $bindable(0),
    onRedeem,
    onLock,
  }: {
    passes: PassItem[];
    activeIndex?: number;
    onRedeem: (id: number) => void;
    onLock?: () => void;
  } = $props();

  let trackEl = $state<HTMLDivElement>();
  let carouselShellEl = $state<HTMLElement>();
  let dragX = $state(0);
  let dragging = $state(false);
  let pointerStartX = 0;

  const redeemedCount = $derived(passes.filter((p) => p.redeemed).length);

  function clampIndex(i: number) {
    if (passes.length === 0) return 0;
    return Math.max(0, Math.min(passes.length - 1, i));
  }

  function go(delta: number) {
    if (passes.length <= 1) return;
    activeIndex = clampIndex(activeIndex + delta);
    dragX = 0;
  }

  function goTo(i: number) {
    activeIndex = clampIndex(i);
    dragX = 0;
  }

  function relativeIndex(i: number) {
    return i - activeIndex;
  }

  const SPREAD_X = [0, 40, 66, 80];
  const SPREAD_SCALE = [1, 0.9, 0.79, 0.72];
  const SPREAD_Z = [0, -40, -110, -180];
  const SPREAD_Y = [0, 10, 18, 26];
  const SPREAD_OPACITY = [1, 0.78, 0.4, 0.16];

  function slideTransform(rel: number): string {
    const dragShift = dragging ? dragX * 0.3 : 0;
    const d = Math.min(Math.abs(rel), 3);
    const sign = rel < 0 ? -1 : 1;
    const x = (rel === 0 ? 0 : sign * SPREAD_X[d]) + dragShift;
    const rot = rel * -22 + dragX * 0.035;
    const y = rel === 0 ? 0 : SPREAD_Y[d];
    return `translateX(${x}%) translateY(${y}px) translateZ(${SPREAD_Z[d]}px) rotateY(${rot}deg) scale(${SPREAD_SCALE[d]})`;
  }

  function slideOpacity(rel: number): number {
    return SPREAD_OPACITY[Math.min(Math.abs(rel), 3)];
  }

  function onPointerDown(e: PointerEvent) {
    if (!trackEl) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // Let controls inside the card (e.g. Redeem) receive their own clicks.
    const target = e.target;
    if (target instanceof HTMLElement && target.closest('button, a, input, select, textarea, [contenteditable="true"]')) {
      return;
    }
    dragging = true;
    pointerStartX = e.clientX;
    trackEl.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging) return;
    let delta = e.clientX - pointerStartX;
    // Rubber-band at the ends of the deck
    const atStart = activeIndex <= 0 && delta > 0;
    const atEnd = activeIndex >= passes.length - 1 && delta < 0;
    if (atStart || atEnd) delta *= 0.35;
    dragX = delta;
  }

  function onPointerUp(e: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    trackEl?.releasePointerCapture(e.pointerId);
    const width = trackEl?.clientWidth ?? 420;
    const threshold = Math.min(120, width * 0.16);
    if (dragX < -threshold) go(1);
    else if (dragX > threshold) go(-1);
    dragX = 0;
  }

  function handleCarouselKeydown(e: KeyboardEvent) {
    const target = e.target;
    // The toolbar only holds carousel controls, so arrows may drive the deck
    // from any of them; text entry is the sole exception.
    if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(1);
    }
  }

  onMount(() => {
    carouselShellEl?.focus({ preventScroll: true });
  });

  $effect(() => {
    const el = trackEl;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
      if (Math.abs(e.deltaX) < 8) return;
      e.preventDefault();
      go(e.deltaX > 0 ? 1 : -1);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });
</script>

<section id="anniversary-passes" class="pass-stage" aria-labelledby="pass-stage-title">
  <div class="pass-stage-bg" aria-hidden="true">
    <div class="stage-glow stage-glow-a"></div>
    <div class="stage-glow stage-glow-b"></div>
    <div class="stage-grid"></div>
    <div class="stage-scan"></div>
    <div class="stage-vignette"></div>
    <div class="floor-glow"></div>
  </div>

  <header class="pass-topbar">
    <div class="pass-topbar-left">
      <span class="live-pill"><span class="live-dot"></span> Anniversary wallet</span>
      <h1 id="pass-stage-title" class="pass-stage-title">Your love passes</h1>
      <p class="pass-stage-sub" aria-live="polite">
        {redeemedCount} of {passes.length} redeemed · swipe or drag the deck
      </p>
    </div>
    <div class="pass-topbar-actions">
      {#if onLock}
        <button type="button" class="top-btn" onclick={onLock}>Lock vault</button>
      {/if}
      <a class="top-btn ghost" href="#vault-rest">More below ↓</a>
    </div>
  </header>

  <div class="carousel-shell" role="presentation" aria-label="Pass carousel">
    <div
      class="carousel-track"
      class:dragging
      role="group"
      aria-label="Swipe or drag to change pass"
      bind:this={trackEl}
      onpointerdown={onPointerDown}
      onpointermove={onPointerMove}
      onpointerup={onPointerUp}
      onpointercancel={onPointerUp}
    >
      {#each passes as pass, i (pass.id)}
        {@const rel = relativeIndex(i)}
        <div
          class="carousel-slide"
          class:is-center={rel === 0}
          style="
            transform: {slideTransform(rel)};
            opacity: {slideOpacity(rel)};
            z-index: {20 - Math.abs(rel)};
          "
        >
          <div class="slide-card-wrap">
            <PassCard
              active={rel === 0}
              title={pass.title}
              icon={pass.icon}
              desc={pass.desc}
              redeemed={pass.redeemed}
              accent={i}
              onRedeem={() => onRedeem(pass.id)}
            />
          </div>
        </div>
      {/each}
    </div>
  </div>

  <div
    class="carousel-ui"
    role="toolbar"
    aria-label="Pass carousel controls"
    tabindex="0"
    bind:this={carouselShellEl}
    onkeydown={handleCarouselKeydown}
  >
    <button
      type="button"
      class="nav-fab"
      aria-label="Previous pass"
      disabled={activeIndex <= 0}
      onclick={() => go(-1)}
    >
      ←
    </button>

    <div class="carousel-dots" role="tablist" aria-label="Select pass">
      {#each passes as p, i (p.id)}
        <button
          type="button"
          role="tab"
          class="dot"
          class:active={i === activeIndex}
          class:done={p.redeemed}
          aria-selected={i === activeIndex}
          aria-label="{p.title}"
          onclick={() => goTo(i)}
        ></button>
      {/each}
    </div>

    <button
      type="button"
      class="nav-fab"
      aria-label="Next pass"
      disabled={activeIndex >= passes.length - 1}
      onclick={() => go(1)}
    >
      →
    </button>
  </div>

  <a class="scroll-cue" href="#vault-rest">
    <span>Scroll for pond, letter & more</span>
    <span class="scroll-cue-arrow">↓</span>
  </a>
</section>

<style>
  .pass-stage {
    position: relative;
    width: 100vw;
    max-width: 100vw;
    margin-left: calc(50% - 50vw);
    min-height: calc(100dvh - var(--vp-bar-h, 0px));
    display: flex;
    flex-direction: column;
    align-items: stretch;
    overflow: hidden;
    background: #050508;
    color: #ece6cc;
  }

  .pass-stage-bg {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }

  .stage-glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(90px);
    opacity: 0.4;
  }

  .stage-glow-a {
    width: 46vw;
    height: 46vw;
    top: -18%;
    left: -10%;
    background: radial-gradient(circle, rgba(168, 85, 247, 0.5), transparent 70%);
  }

  .stage-glow-b {
    width: 40vw;
    height: 40vw;
    bottom: -14%;
    right: -12%;
    background: radial-gradient(circle, rgba(255, 77, 148, 0.42), transparent 70%);
  }

  .stage-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
    background-size: 34px 34px;
    mask-image: radial-gradient(ellipse 72% 62% at 50% 46%, #000 18%, transparent 76%);
    opacity: 0.55;
  }

  .stage-scan {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      180deg,
      rgba(0, 0, 0, 0.4) 0 1px,
      transparent 1px 3px
    );
    opacity: 0.18;
  }

  .stage-vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 82% 72% at 50% 42%, transparent 38%, rgba(0, 0, 0, 0.78) 100%);
  }

  .floor-glow {
    position: absolute;
    bottom: 16%;
    left: 50%;
    width: 70%;
    height: 120px;
    transform: translateX(-50%);
    background: radial-gradient(ellipse, rgba(255, 255, 255, 0.09) 0%, transparent 70%);
  }

  .pass-topbar {
    position: relative;
    z-index: 3;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    padding: 20px clamp(16px, 4vw, 40px) 8px;
  }

  .live-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.55);
  }

  .live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #f472b6;
    box-shadow: 0 0 12px #f472b6;
  }

  .pass-stage-title {
    margin: 8px 0 0;
    font-size: clamp(26px, 5vw, 38px);
    font-weight: 700;
    letter-spacing: -0.03em;
    color: #fff;
    text-shadow: 0 0 18px rgba(244, 140, 184, 0.35);
  }

  .pass-stage-sub {
    margin: 6px 0 0;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.45);
  }

  .pass-topbar-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .top-btn {
    font-family: inherit;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.04em;
    padding: 9px 16px;
    border: 1px solid rgba(244, 140, 184, 0.35);
    border-radius: 10px;
    background: rgba(244, 140, 184, 0.08);
    color: #ffd9ea;
    text-decoration: none;
    cursor: var(--cursor-pointer);
    transition:
      background 0.15s ease,
      border-color 0.15s ease,
      color 0.15s ease;
  }

  .top-btn.ghost {
    color: rgba(255, 255, 255, 0.7);
    border-color: rgba(255, 255, 255, 0.14);
    background: rgba(255, 255, 255, 0.04);
  }

  .top-btn:hover {
    background: rgba(244, 140, 184, 0.16);
    border-color: rgba(244, 140, 184, 0.6);
    color: #fff;
  }

  .carousel-shell {
    position: relative;
    z-index: 2;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
    perspective: 1500px;
    perspective-origin: 50% 44%;
    outline: none;
  }

  .carousel-ui:focus-visible {
    outline: none;
  }

  .carousel-ui:focus-visible .nav-fab {
    box-shadow: 0 0 0 2px rgba(244, 140, 184, 0.55);
  }

  .carousel-track.dragging .carousel-slide {
    transition: none;
  }

  .carousel-track {
    position: relative;
    width: min(430px, 90vw);
    height: min(276px, 57.8vw);
    transform-style: preserve-3d;
    cursor: grab;
    touch-action: pan-y;
  }

  .carousel-track:active {
    cursor: grabbing;
  }

  .carousel-slide {
    position: absolute;
    inset: 0;
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
    transform-style: preserve-3d;
    transition:
      transform 0.6s cubic-bezier(0.22, 1, 0.36, 1),
      opacity 0.5s ease;
    will-change: transform, opacity;
  }

  .carousel-slide.is-center {
    pointer-events: auto;
  }

  .slide-card-wrap {
    width: 100%;
    height: 100%;
    /* Mirrored floor reflection; degrades to nothing where unsupported. */
    -webkit-box-reflect: below 6px linear-gradient(transparent 64%, rgba(255, 255, 255, 0.15));
  }

  .carousel-ui {
    position: relative;
    z-index: 3;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
    padding: 8px 16px 12px;
  }

  .nav-fab {
    font-family: inherit;
    width: 46px;
    height: 46px;
    border: 1px solid rgba(244, 140, 184, 0.28);
    border-radius: 50%;
    background: rgba(244, 140, 184, 0.07);
    color: #ffd9ea;
    font-size: 17px;
    line-height: 1;
    cursor: var(--cursor-pointer);
    transition:
      background 0.15s ease,
      border-color 0.15s ease,
      color 0.15s ease;
  }

  .nav-fab:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .nav-fab:not(:disabled):hover {
    background: rgba(244, 140, 184, 0.18);
    border-color: rgba(244, 140, 184, 0.6);
    color: #fff;
  }

  .carousel-dots {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 10px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.04);
  }

  .dot {
    width: 10px;
    height: 6px;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.22);
    cursor: var(--cursor-pointer);
    transition:
      width 0.25s cubic-bezier(0.22, 1, 0.36, 1),
      background 0.2s ease,
      box-shadow 0.2s ease;
  }

  .dot:hover {
    background: rgba(255, 255, 255, 0.4);
  }

  .dot.active {
    width: 26px;
    background: #ff4d94;
    box-shadow: 0 0 14px rgba(255, 77, 148, 0.7);
  }

  .dot.done:not(.active) {
    background: rgba(134, 239, 172, 0.55);
  }

  .scroll-cue {
    position: relative;
    z-index: 3;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px 16px calc(28px + var(--vp-bar-h, 0px));
    text-decoration: none;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.35);
    transition: color 0.2s ease;
  }

  .scroll-cue:hover {
    color: rgba(255, 255, 255, 0.6);
  }

  .scroll-cue-arrow {
    font-size: 16px;
    animation: bob 2s ease-in-out infinite;
  }

  @keyframes bob {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(6px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .carousel-slide {
      transition: none;
    }
    .dot {
      transition: none;
    }
    .scroll-cue-arrow {
      animation: none;
    }
  }

  @media (max-width: 640px) {
    .pass-topbar-actions {
      width: 100%;
    }
    .top-btn {
      flex: 1;
      text-align: center;
    }
  }
</style>
