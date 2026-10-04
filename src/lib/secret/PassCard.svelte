<script lang="ts">
  let {
    title,
    icon,
    desc,
    redeemed = false,
    accent = 0,
    featured = false,
    active = true,
    onRedeem,
  }: {
    title: string;
    icon: string;
    desc: string;
    redeemed?: boolean;
    accent?: number;
    featured?: boolean;
    active?: boolean;
    onRedeem: () => void;
  } = $props();

  let sceneEl = $state<HTMLDivElement>();
  let rotateX = $state(7);
  let rotateY = $state(0);
  let glareX = $state(50);
  let glareY = $state(32);
  let pointerInside = $state(false);

  const SKINS = [
    { a: '#ff4d94', b: '#a855f7', c: '#22d3ee', base: '#160a1c' },
    { a: '#60a5fa', b: '#6366f1', c: '#f472b6', base: '#0a1024' },
    { a: '#fb923c', b: '#e11d48', c: '#fde047', base: '#1a0c08' },
    { a: '#2dd4bf', b: '#3b82f6', c: '#a3e635', base: '#04140f' },
    { a: '#f43f5e', b: '#a855f7', c: '#fbbf24', base: '#170810' },
    { a: '#38bdf8', b: '#ec4899', c: '#4ade80', base: '#06131c' },
  ];

  const skin = $derived(SKINS[accent % SKINS.length]);
  const serialLabel = $derived(`Nº ${String(accent + 1).padStart(4, '0')}`);
  const sheenAngle = $derived(102 + rotateY * 1.8 + (glareX - 50) * 0.5);

  function resetTilt() {
    rotateX = 7;
    rotateY = 0;
    glareX = 50;
    glareY = 32;
    pointerInside = false;
  }

  function handlePointerMove(event: PointerEvent) {
    if (redeemed || !active || !sceneEl) return;
    const rect = sceneEl.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    rotateY = (x - 0.5) * 16;
    rotateX = 7 + (0.5 - y) * 12;
    glareX = x * 100;
    glareY = y * 100;
    pointerInside = true;
  }

  function handlePointerLeave() {
    resetTilt();
  }

  function handleRedeemClick() {
    if (redeemed || !active) return;
    onRedeem();
  }

  const tiltTransform = $derived(
    active && pointerInside && !redeemed
      ? `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
      : active && !redeemed
        ? 'rotateX(7deg) rotateY(0deg)'
        : 'rotateX(11deg) rotateY(0deg)',
  );
</script>

<div
  class="pass-scene"
  class:redeemed
  class:featured
  class:active
  class:inactive={!active}
  role="group"
  aria-label="{title} redeemable pass"
  bind:this={sceneEl}
  onpointermove={handlePointerMove}
  onpointerleave={handlePointerLeave}
  style="
    --c-a: {skin.a};
    --c-b: {skin.b};
    --c-c: {skin.c};
    --c-base: {skin.base};
    --glare-x: {glareX}%;
    --glare-y: {glareY}%;
    --sheen-angle: {sheenAngle}deg;
  "
>
  <div class="pass-shadow" aria-hidden="true"></div>

  <div class="pass-card" style:transform={tiltTransform}>
    <div class="pass-edge pass-edge-2" aria-hidden="true"></div>
    <div class="pass-edge pass-edge-1" aria-hidden="true"></div>

    <div class="pass-frame">
      <div class="pass-body">
        <div class="pass-base" aria-hidden="true"></div>
        <div class="pass-dither" aria-hidden="true"></div>
        <div class="pass-holo" aria-hidden="true"></div>
        <div class="pass-sheen" aria-hidden="true"></div>
        <div class="pass-scan" aria-hidden="true"></div>
        <div class="pass-grain" aria-hidden="true"></div>
        <div class="pass-rim" aria-hidden="true"></div>

        <div class="pass-content">
          <div class="pass-row-top">
            <div class="pass-mark">
              <span class="pass-brand">Minty Pass</span>
              <span class="pass-tier">Anniversary · No expiry</span>
            </div>
            <div class="pass-chip" aria-hidden="true"></div>
          </div>

          <div class="pass-main">
            <span class="pass-emblem" aria-hidden="true">{icon}</span>
            <h3 class="pass-title">{title}</h3>
          </div>

          <p class="pass-desc">{desc}</p>

          <div class="pass-footer">
            <div class="pass-footer-main">
              {#if redeemed}
                <span class="pass-status redeemed">Honored with love</span>
              {:else if active}
                <button type="button" class="pass-redeem" onclick={handleRedeemClick}>
                  <span>Redeem pass</span>
                  <span class="pass-redeem-arrow" aria-hidden="true">→</span>
                </button>
              {:else}
                <span class="pass-status">Swipe to center to redeem</span>
              {/if}
            </div>
            <span class="pass-serial">{serialLabel}</span>
          </div>
        </div>

        {#if redeemed}
          <div class="pass-stamp" aria-hidden="true"><span>REDEEMED</span></div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .pass-scene {
    position: relative;
    perspective: 1500px;
    width: 100%;
    height: 100%;
    touch-action: pan-y;
  }

  .pass-scene.featured {
    max-width: none;
  }

  .pass-scene.inactive {
    pointer-events: none;
  }

  /* Soft contact shadow + accent bloom under the card */
  .pass-shadow {
    position: absolute;
    left: 5%;
    right: 5%;
    bottom: -8%;
    height: 40%;
    background:
      radial-gradient(ellipse at 50% 55%, rgba(0, 0, 0, 0.82), transparent 66%),
      radial-gradient(ellipse at 50% 70%, color-mix(in srgb, var(--c-a) 38%, transparent), transparent 72%);
    filter: blur(15px);
    opacity: 0.95;
    z-index: 0;
    transition: opacity 0.4s ease;
  }

  .pass-card {
    position: relative;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
    will-change: transform;
  }

  /* Stepped extrusion edges, revealed by the resting tilt */
  .pass-edge {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--c-b) 45%, #05060a) 0%,
      #04050a 78%
    );
    clip-path: polygon(
      0 10px,
      10px 10px,
      10px 0,
      calc(100% - 10px) 0,
      calc(100% - 10px) 10px,
      100% 10px,
      100% calc(100% - 10px),
      calc(100% - 10px) calc(100% - 10px),
      calc(100% - 10px) 100%,
      10px 100%,
      10px calc(100% - 10px),
      0 calc(100% - 10px)
    );
  }

  .pass-edge-1 {
    transform: translateZ(-4px) translateY(2px);
  }

  .pass-edge-2 {
    transform: translateZ(-8px) translateY(4px);
    opacity: 0.85;
  }

  /* Gradient hairline border that follows the notched silhouette */
  .pass-frame {
    position: absolute;
    inset: 0;
    clip-path: polygon(
      0 10px,
      10px 10px,
      10px 0,
      calc(100% - 10px) 0,
      calc(100% - 10px) 10px,
      100% 10px,
      100% calc(100% - 10px),
      calc(100% - 10px) calc(100% - 10px),
      calc(100% - 10px) 100%,
      10px 100%,
      10px calc(100% - 10px),
      0 calc(100% - 10px)
    );
    background: linear-gradient(
      160deg,
      color-mix(in srgb, var(--c-a) 70%, #ffffff 22%) 0%,
      color-mix(in srgb, var(--c-b) 55%, #ffffff 8%) 42%,
      color-mix(in srgb, var(--c-c) 42%, #0a0a12) 100%
    );
  }

  .pass-body {
    position: absolute;
    inset: 2px;
    overflow: hidden;
    background: var(--c-base);
    clip-path: polygon(
      0 8px,
      8px 8px,
      8px 0,
      calc(100% - 8px) 0,
      calc(100% - 8px) 8px,
      100% 8px,
      100% calc(100% - 8px),
      calc(100% - 8px) calc(100% - 8px),
      calc(100% - 8px) 100%,
      8px 100%,
      8px calc(100% - 8px),
      0 calc(100% - 8px)
    );
  }

  .pass-base {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(90% 80% at 6% -12%, color-mix(in srgb, var(--c-a) 46%, transparent), transparent 56%),
      radial-gradient(72% 92% at 106% 112%, color-mix(in srgb, var(--c-b) 38%, transparent), transparent 62%),
      linear-gradient(
        155deg,
        color-mix(in srgb, var(--c-base) 82%, var(--c-b) 18%) 0%,
        var(--c-base) 48%,
        color-mix(in srgb, var(--c-base) 68%, #000000 32%) 100%
      );
  }

  /* Pixel-dither accent field, faded into the top-right corner */
  .pass-dither {
    position: absolute;
    inset: 0;
    opacity: 0.16;
    mix-blend-mode: overlay;
    background-image:
      linear-gradient(45deg, var(--c-a) 25%, transparent 25%, transparent 75%, var(--c-a) 75%),
      linear-gradient(45deg, var(--c-a) 25%, transparent 25%, transparent 75%, var(--c-a) 75%);
    background-size: 6px 6px;
    background-position: 0 0, 3px 3px;
    mask-image: radial-gradient(130% 110% at 100% 0%, #000 0%, transparent 58%);
    pointer-events: none;
  }

  /* Iridescent holo strip that drifts with the pointer */
  .pass-holo {
    position: absolute;
    top: -12%;
    bottom: -12%;
    left: 60%;
    width: 24%;
    background: linear-gradient(
      200deg,
      rgba(34, 211, 238, 0) 0%,
      rgba(34, 211, 238, 0.55) 18%,
      rgba(168, 85, 247, 0.55) 38%,
      rgba(255, 77, 148, 0.5) 56%,
      rgba(253, 224, 71, 0.45) 74%,
      rgba(255, 255, 255, 0) 100%
    );
    background-size: 100% 240%;
    background-position: 0 var(--glare-y);
    mix-blend-mode: screen;
    opacity: 0.2;
    transform: skewX(-14deg);
    pointer-events: none;
  }

  /* Moving specular sheen, angled off the card's current tilt */
  .pass-sheen {
    position: absolute;
    inset: -32%;
    background: linear-gradient(
      var(--sheen-angle),
      transparent 37%,
      rgba(255, 255, 255, 0.08) 45%,
      rgba(255, 255, 255, 0.24) 50%,
      rgba(255, 255, 255, 0.07) 55%,
      transparent 63%
    );
    mix-blend-mode: screen;
    opacity: 0.75;
    pointer-events: none;
  }

  .pass-scan {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.05) 0 1px,
      transparent 1px 3px
    );
    mix-blend-mode: overlay;
    opacity: 0.45;
    pointer-events: none;
  }

  .pass-grain {
    position: absolute;
    inset: 0;
    opacity: 0.05;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    pointer-events: none;
  }

  .pass-rim {
    position: absolute;
    inset: 0;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.16),
      inset 0 -1px 0 rgba(0, 0, 0, 0.55);
    pointer-events: none;
  }

  .pass-content {
    position: relative;
    z-index: 2;
    height: 100%;
    box-sizing: border-box;
    padding: 17px 20px 15px;
    display: flex;
    flex-direction: column;
    color: #f8f4ec;
  }

  .pass-row-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }

  .pass-mark {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .pass-brand {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #ffffff;
  }

  .pass-tier {
    font-size: 9px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: color-mix(in srgb, var(--c-c) 50%, #ffffff 26%);
  }

  .pass-chip {
    flex: none;
    width: 42px;
    height: 30px;
    border-radius: 6px;
    background:
      linear-gradient(90deg, transparent 0 42%, rgba(0, 0, 0, 0.22) 42% 58%, transparent 58%),
      linear-gradient(180deg, transparent 0 40%, rgba(0, 0, 0, 0.22) 40% 60%, transparent 60%),
      linear-gradient(150deg, #ffeab0 0%, #e6bb4e 38%, #b07f18 68%, #6f4f0c 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.65),
      inset 0 -2px 4px rgba(0, 0, 0, 0.35),
      0 3px 8px rgba(0, 0, 0, 0.4);
  }

  .pass-main {
    display: flex;
    align-items: center;
    gap: 11px;
    margin-top: 13px;
  }

  .pass-emblem {
    flex: none;
    width: 46px;
    height: 46px;
    display: grid;
    place-items: center;
    font-size: 25px;
    line-height: 1;
    background: linear-gradient(
      160deg,
      color-mix(in srgb, var(--c-a) 32%, rgba(0, 0, 0, 0.4)),
      rgba(0, 0, 0, 0.3)
    );
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.2),
      0 6px 14px rgba(0, 0, 0, 0.35);
    clip-path: polygon(
      0 6px,
      6px 6px,
      6px 0,
      calc(100% - 6px) 0,
      calc(100% - 6px) 6px,
      100% 6px,
      100% calc(100% - 6px),
      calc(100% - 6px) calc(100% - 6px),
      calc(100% - 6px) 100%,
      6px 100%,
      6px calc(100% - 6px),
      0 calc(100% - 6px)
    );
  }

  .pass-title {
    margin: 0;
    min-width: 0;
    font-size: clamp(17px, 3.6vw, 21px);
    font-weight: 700;
    line-height: 1.14;
    letter-spacing: -0.01em;
    color: #ffffff;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  }

  .pass-desc {
    margin: 8px 0 0;
    font-size: 12.5px;
    line-height: 1.45;
    color: rgba(255, 255, 255, 0.68);
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .pass-footer {
    margin-top: auto;
    padding-top: 12px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .pass-footer-main {
    flex: 1;
    min-width: 0;
  }

  .pass-redeem {
    font-family: inherit;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 11px 16px;
    border: 0;
    font-size: 12.5px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #14060f;
    cursor: var(--cursor-pointer);
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--c-a) 86%, #ffffff 14%) 0%,
      color-mix(in srgb, var(--c-a) 72%, #000000 18%) 100%
    );
    box-shadow:
      0 8px 20px color-mix(in srgb, var(--c-a) 32%, transparent),
      inset 0 1px 0 rgba(255, 255, 255, 0.55);
    clip-path: polygon(
      0 5px,
      5px 5px,
      5px 0,
      calc(100% - 5px) 0,
      calc(100% - 5px) 5px,
      100% 5px,
      100% calc(100% - 5px),
      calc(100% - 5px) calc(100% - 5px),
      calc(100% - 5px) 100%,
      5px 100%,
      5px calc(100% - 5px),
      0 calc(100% - 5px)
    );
    transition:
      transform 0.18s ease,
      box-shadow 0.18s ease,
      filter 0.18s ease;
  }

  .pass-redeem-arrow {
    transition: transform 0.2s ease;
  }

  .pass-redeem:hover {
    transform: translateY(-1px);
    filter: brightness(1.08);
    box-shadow:
      0 12px 26px color-mix(in srgb, var(--c-a) 48%, transparent),
      inset 0 1px 0 rgba(255, 255, 255, 0.65);
  }

  .pass-redeem:hover .pass-redeem-arrow {
    transform: translateX(3px);
  }

  .pass-redeem:active {
    transform: translateY(0);
  }

  .pass-status {
    display: block;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: rgba(255, 255, 255, 0.55);
  }

  .pass-status.redeemed {
    color: #86efac;
  }

  .pass-serial {
    flex: none;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.42);
    white-space: nowrap;
  }

  .pass-stamp {
    position: absolute;
    inset: 0;
    z-index: 5;
    display: grid;
    place-items: center;
    pointer-events: none;
  }

  .pass-stamp span {
    font-size: clamp(18px, 4.4vw, 26px);
    font-weight: 700;
    letter-spacing: 0.26em;
    color: rgba(134, 239, 172, 0.85);
    border: 2px dashed rgba(134, 239, 172, 0.6);
    padding: 6px 14px 6px 20px;
    transform: rotate(-11deg);
    background: rgba(6, 20, 12, 0.45);
    text-shadow: 0 0 12px rgba(134, 239, 172, 0.5);
  }

  .pass-scene.redeemed .pass-body {
    filter: saturate(0.5) brightness(0.78);
  }

  .pass-scene.redeemed .pass-shadow {
    opacity: 0.6;
  }

  .pass-scene.inactive .pass-body {
    filter: brightness(0.78) saturate(0.85);
  }

  .pass-scene.inactive .pass-sheen,
  .pass-scene.inactive .pass-holo {
    opacity: 0.28;
  }

  @media (prefers-reduced-motion: reduce) {
    .pass-card {
      transition: none;
      transform: none !important;
    }

    .pass-redeem,
    .pass-redeem-arrow {
      transition: none;
    }
  }
</style>
