<script lang="ts">
  let {
    title,
    icon,
    desc,
    redeemed = false,
    accent = 0,
    active = true,
    onRedeem,
  }: {
    title: string;
    icon: string;
    desc: string;
    redeemed?: boolean;
    accent?: number;
    active?: boolean;
    onRedeem: () => void;
  } = $props();

  let sceneEl = $state<HTMLDivElement>();
  let rotateX = $state(5);
  let rotateY = $state(0);
  let glareX = $state(50);
  let glareY = $state(18);
  let pointerInside = $state(false);

  // Deep anodised-metal bases with a single vivid accent per card.
  const SKINS = [
    { a: '#ff4d94', b: '#7c3aed', base: '#140a1a' },
    { a: '#5b8cff', b: '#3b3fb8', base: '#0a0f1e' },
    { a: '#f0a04b', b: '#b0453a', base: '#170c09' },
    { a: '#4fd6c0', b: '#2f6fbf', base: '#07130f' },
    { a: '#ef4d6d', b: '#8b3fd0', base: '#150910' },
    { a: '#5cc8f5', b: '#c2459b', base: '#08131a' },
  ];

  const skin = $derived(SKINS[accent % SKINS.length]);
  const cardNumber = $derived(`0001 0002 0003 ${String(accent + 1).padStart(4, '0')}`);
  const sheenAngle = $derived(120 + rotateY * 1.5 + (glareX - 50) * 0.4);

  function resetTilt() {
    rotateX = 5;
    rotateY = 0;
    glareX = 50;
    glareY = 18;
    pointerInside = false;
  }

  function handlePointerMove(event: PointerEvent) {
    if (redeemed || !active || !sceneEl) return;
    const rect = sceneEl.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    rotateY = (x - 0.5) * 14;
    rotateX = 5 + (0.5 - y) * 10;
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
        ? 'rotateX(5deg) rotateY(0deg)'
        : 'rotateX(9deg) rotateY(0deg)',
  );
</script>

<div
  class="pass-scene"
  class:redeemed
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
        <div class="pass-brush" aria-hidden="true"></div>
        <div class="pass-keylight" aria-hidden="true"></div>
        <div class="pass-sheen" aria-hidden="true"></div>
        <div class="pass-hotspot" aria-hidden="true"></div>
        <div class="pass-glint" aria-hidden="true"></div>
        <div class="pass-vignette" aria-hidden="true"></div>
        <div class="pass-grain" aria-hidden="true"></div>
        <div class="pass-bevel" aria-hidden="true"></div>

        <div class="pass-content">
          <div class="pass-row-top">
            <div class="pass-mark">
              <span class="pass-brand">Minty</span>
              <span class="pass-tier">Anniversary Edition</span>
            </div>
            <div class="pass-hardware" aria-hidden="true">
              <svg class="pass-contactless" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
                <path d="M6 9.5a7 7 0 0 1 0 5" />
                <path d="M9.5 7.5a10 10 0 0 1 0 9" />
                <path d="M13 5.5a13 13 0 0 1 0 13" />
              </svg>
              <span class="pass-chip"></span>
            </div>
          </div>

          <div class="pass-main">
            <span class="pass-emblem" aria-hidden="true">
              {#if icon === 'massage'}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 3.5c1.7 2.4 1.7 5.6 0 8-1.7-2.4-1.7-5.6 0-8Z" />
                  <path d="M5.5 8.5c2.9-.4 5.4 1 6.5 3.7-2.9.4-5.4-1-6.5-3.7Z" />
                  <path d="M18.5 8.5c-2.9-.4-5.4 1-6.5 3.7 2.9.4 5.4-1 6.5-3.7Z" />
                  <path d="M4.5 15.5c4.5 3 10.5 3 15 0" />
                </svg>
              {:else if icon === 'dinner'}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8 2.5v6a2 2 0 0 0 4 0v-6" />
                  <path d="M10 10.5v11" />
                  <path d="M17 2.5c-1.6 1.4-2.5 3.2-2.5 5.3 0 1.7.9 2.9 2.5 3.7v10" />
                </svg>
              {:else if icon === 'boba'}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6.5 8h11l-1.1 11.3a2 2 0 0 1-2 1.7h-4.8a2 2 0 0 1-2-1.7L6.5 8Z" />
                  <path d="M12.5 8V3.5" />
                  <path d="M9 13.5h.01M12 15.5h.01M15 13.5h.01" />
                </svg>
              {:else if icon === 'movie'}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
                  <path d="M10.5 9.2l4.5 2.8-4.5 2.8V9.2Z" />
                </svg>
              {:else if icon === 'crown'}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3.5 7.5l4 4L12 4l4.5 7.5 4-4-1.8 11H5.3L3.5 7.5Z" />
                </svg>
              {:else}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="8" r="3.4" />
                  <path d="M12 2v1.8M12 12.6V14.4M5.6 8H3.8M20.2 8h-1.8M7.5 3.5 6.2 2.2M16.5 3.5l1.3-1.3" />
                  <path d="M3 19c1.5-1.2 3-1.2 4.5 0s3 1.2 4.5 0 3-1.2 4.5 0 3 1.2 4.5 0" />
                </svg>
              {/if}
            </span>
            <h3 class="pass-title">{title}</h3>
          </div>

          <p class="pass-desc">{desc}</p>

          <div class="pass-footer">
            <div class="pass-number-block">
              <span class="pass-number">{cardNumber}</span>
              <span class="pass-label">Valid thru ∞</span>
            </div>
            {#if redeemed}
              <span class="pass-status redeemed">Honored with love</span>
            {:else if active}
              <button type="button" class="pass-redeem" onclick={handleRedeemClick}>
                <span>Redeem</span>
                <span class="pass-redeem-arrow" aria-hidden="true">→</span>
              </button>
            {:else}
              <span class="pass-status">Swipe to center</span>
            {/if}
          </div>
        </div>

        {#if redeemed}
          <div class="pass-stamp" aria-hidden="true"><span>Redeemed</span></div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .pass-scene {
    --card-font: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    --card-mono: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
    position: relative;
    perspective: 1500px;
    width: 100%;
    height: 100%;
    touch-action: pan-y;
  }

  .pass-scene.inactive {
    pointer-events: none;
  }

  /* Contact shadow + accent bloom beneath the card */
  .pass-shadow {
    position: absolute;
    left: 5%;
    right: 5%;
    bottom: -8%;
    height: 40%;
    background:
      radial-gradient(ellipse at 50% 55%, rgba(0, 0, 0, 0.85), transparent 66%),
      radial-gradient(ellipse at 50% 72%, color-mix(in srgb, var(--c-a) 30%, transparent), transparent 72%);
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
    border-radius: 18px;
    background: linear-gradient(180deg, #2a2c34 0%, #0b0c10 74%);
  }

  .pass-edge-1 {
    transform: translateZ(-4px) translateY(2px);
  }

  .pass-edge-2 {
    transform: translateZ(-8px) translateY(4px);
    opacity: 0.85;
  }

  /* Machined metal rim: bright where the key light hits (upper left) */
  .pass-frame {
    position: absolute;
    inset: 0;
    border-radius: 18px;
    background: conic-gradient(
      from 0deg at 50% 50%,
      rgba(255, 255, 255, 0.32) 0deg,
      rgba(255, 255, 255, 0.82) 42deg,
      rgba(255, 255, 255, 0.24) 100deg,
      rgba(255, 255, 255, 0.05) 152deg,
      rgba(255, 255, 255, 0.1) 206deg,
      rgba(255, 255, 255, 0.48) 268deg,
      rgba(255, 255, 255, 0.98) 318deg,
      rgba(255, 255, 255, 0.32) 360deg
    );
  }

  .pass-body {
    position: absolute;
    inset: 2px;
    overflow: hidden;
    background: var(--c-base);
    border-radius: 16px;
  }

  .pass-base {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(120% 95% at 4% -8%, color-mix(in srgb, var(--c-a) 18%, transparent) 0%, transparent 52%),
      radial-gradient(110% 120% at 104% 108%, color-mix(in srgb, var(--c-b) 13%, transparent) 0%, transparent 58%),
      linear-gradient(
        157deg,
        color-mix(in srgb, var(--c-base) 52%, #d8dce6 48%) 0%,
        color-mix(in srgb, var(--c-base) 88%, #171a21 12%) 40%,
        color-mix(in srgb, var(--c-base) 56%, #000000 44%) 100%
      );
  }

  /* Static key light from the upper left */
  .pass-keylight {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      150deg,
      rgba(255, 255, 255, 0.13) 0%,
      rgba(255, 255, 255, 0.035) 24%,
      transparent 46%
    );
    mix-blend-mode: screen;
    pointer-events: none;
  }

  /* Fine anisotropic brushing */
  .pass-brush {
    position: absolute;
    inset: 0;
    background-image:
      repeating-linear-gradient(92deg, rgba(255, 255, 255, 0.1) 0 1px, transparent 1px 3px),
      repeating-linear-gradient(92deg, rgba(0, 0, 0, 0.12) 0 2px, transparent 2px 9px);
    opacity: 0.6;
    mix-blend-mode: overlay;
    mask-image: linear-gradient(115deg, #000 0%, rgba(0, 0, 0, 0.28) 46%, #000 100%);
    pointer-events: none;
  }

  /* Broad specular band that sweeps with the tilt */
  .pass-sheen {
    position: absolute;
    inset: -25%;
    background: linear-gradient(
      var(--sheen-angle),
      transparent 34%,
      rgba(255, 255, 255, 0.05) 43%,
      rgba(255, 255, 255, 0.24) 49.5%,
      rgba(255, 255, 255, 0.1) 52%,
      rgba(255, 255, 255, 0.03) 58%,
      transparent 68%
    );
    mix-blend-mode: screen;
    pointer-events: none;
  }

  /* Soft light source tracking the pointer */
  .pass-hotspot {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      72% 90% at var(--glare-x) var(--glare-y),
      rgba(255, 255, 255, 0.14) 0%,
      rgba(255, 255, 255, 0.04) 38%,
      transparent 72%
    );
    mix-blend-mode: screen;
    pointer-events: none;
  }

  /* Tight bright glint at the pointer */
  .pass-glint {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      26% 38% at var(--glare-x) var(--glare-y),
      rgba(255, 255, 255, 0.42) 0%,
      rgba(255, 255, 255, 0.1) 42%,
      transparent 70%
    );
    mix-blend-mode: screen;
    pointer-events: none;
  }

  .pass-vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(130% 112% at 50% -10%, transparent 44%, rgba(0, 0, 0, 0.4) 100%);
    pointer-events: none;
  }

  .pass-grain {
    position: absolute;
    inset: 0;
    opacity: 0.035;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    pointer-events: none;
  }

  /* Edge lighting + ambient occlusion inside the rim */
  .pass-bevel {
    position: absolute;
    inset: 0;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.26),
      inset 1px 0 0 rgba(255, 255, 255, 0.09),
      inset -1px 0 0 rgba(0, 0, 0, 0.35),
      inset 0 -1px 0 rgba(0, 0, 0, 0.7),
      inset 0 0 48px rgba(0, 0, 0, 0.34);
    pointer-events: none;
  }

  .pass-content {
    position: relative;
    z-index: 2;
    height: 100%;
    box-sizing: border-box;
    padding: 19px 22px 17px;
    display: flex;
    flex-direction: column;
    font-family: var(--card-font);
    color: #f4f6fa;
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
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.34em;
    text-transform: uppercase;
    color: #ffffff;
    text-shadow:
      0 1px 0 rgba(0, 0, 0, 0.55),
      0 -1px 0 rgba(255, 255, 255, 0.14);
  }

  .pass-tier {
    font-size: 8.5px;
    font-weight: 600;
    letter-spacing: 0.26em;
    text-transform: uppercase;
    color: color-mix(in srgb, var(--c-a) 45%, rgba(255, 255, 255, 0.72));
  }

  .pass-hardware {
    display: flex;
    align-items: center;
    gap: 10px;
    color: rgba(255, 255, 255, 0.42);
  }

  .pass-contactless {
    width: 20px;
    height: 20px;
  }

  .pass-chip {
    position: relative;
    display: block;
    width: 42px;
    height: 31px;
    border-radius: 6px;
    background:
      linear-gradient(90deg, transparent 0 45%, rgba(66, 54, 30, 0.42) 45% 55%, transparent 55%),
      linear-gradient(
        180deg,
        transparent 0 24%,
        rgba(66, 54, 30, 0.38) 24% 31%,
        transparent 31% 69%,
        rgba(66, 54, 30, 0.38) 69% 76%,
        transparent 76%
      ),
      linear-gradient(148deg, #eae5da 0%, #cdc1a6 24%, #a2916f 56%, #6f6448 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.85),
      inset 0 -2px 4px rgba(0, 0, 0, 0.38),
      0 0 0 1px rgba(255, 255, 255, 0.1),
      0 2px 6px rgba(0, 0, 0, 0.5);
  }

  .pass-main {
    display: flex;
    align-items: center;
    gap: 13px;
    margin-top: 15px;
  }

  .pass-emblem {
    flex: none;
    width: 46px;
    height: 46px;
    display: grid;
    place-items: center;
    color: rgba(255, 255, 255, 0.94);
    border-radius: 12px;
    background: linear-gradient(
      160deg,
      rgba(255, 255, 255, 0.16) 0%,
      rgba(255, 255, 255, 0.03) 46%,
      rgba(0, 0, 0, 0.28) 100%
    );
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.3),
      inset 0 0 0 1px rgba(255, 255, 255, 0.08),
      0 6px 16px rgba(0, 0, 0, 0.4);
  }

  .pass-emblem svg {
    width: 25px;
    height: 25px;
  }

  .pass-title {
    margin: 0;
    min-width: 0;
    font-size: clamp(18px, 3.4vw, 21px);
    font-weight: 650;
    line-height: 1.15;
    letter-spacing: -0.015em;
    color: #ffffff;
    text-shadow:
      0 1px 1px rgba(0, 0, 0, 0.6),
      0 -1px 0 rgba(255, 255, 255, 0.1);
  }

  .pass-desc {
    margin: 9px 0 0;
    font-size: 12.5px;
    line-height: 1.45;
    color: rgba(255, 255, 255, 0.7);
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .pass-footer {
    margin-top: auto;
    padding-top: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }

  .pass-number-block {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .pass-number {
    font-family: var(--card-mono);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.14em;
    color: rgba(255, 255, 255, 0.82);
    white-space: nowrap;
    text-shadow:
      0 1px 0 rgba(0, 0, 0, 0.65),
      0 -1px 0 rgba(255, 255, 255, 0.08);
  }

  .pass-label {
    font-size: 8px;
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.4);
  }

  .pass-redeem {
    font-family: var(--card-font);
    flex: 0 1 auto;
    min-width: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 11px 17px;
    border: 0;
    border-radius: 11px;
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    white-space: nowrap;
    color: #0b0f19;
    cursor: var(--cursor-pointer);
    background: linear-gradient(
      180deg,
      #ffffff 0%,
      color-mix(in srgb, var(--c-a) 9%, #e2e5eb) 100%
    );
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.95),
      inset 0 -1px 0 rgba(0, 0, 0, 0.2),
      0 6px 16px rgba(0, 0, 0, 0.45);
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
    filter: brightness(1.05);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 1),
      inset 0 -1px 0 rgba(0, 0, 0, 0.2),
      0 10px 24px color-mix(in srgb, var(--c-a) 45%, transparent);
  }

  .pass-redeem:hover .pass-redeem-arrow {
    transform: translateX(3px);
  }

  .pass-redeem:active {
    transform: translateY(0);
  }

  .pass-status {
    flex: none;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.5);
  }

  .pass-status.redeemed {
    color: #8fe3a8;
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
    font-family: var(--card-font);
    font-size: clamp(17px, 4.2vw, 25px);
    font-weight: 700;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: rgba(143, 227, 168, 0.88);
    border: 2px solid rgba(143, 227, 168, 0.55);
    border-radius: 6px;
    padding: 6px 12px 6px 18px;
    transform: rotate(-11deg);
    background: rgba(6, 20, 12, 0.4);
    text-shadow: 0 0 14px rgba(143, 227, 168, 0.5);
  }

  .pass-scene.redeemed .pass-body {
    filter: saturate(0.45) brightness(0.72);
  }

  .pass-scene.redeemed .pass-shadow {
    opacity: 0.6;
  }

  .pass-scene.inactive .pass-body {
    filter: brightness(0.66) saturate(0.75);
  }

  .pass-scene.inactive .pass-sheen,
  .pass-scene.inactive .pass-hotspot {
    opacity: 0.35;
  }

  @media (max-width: 520px) {
    .pass-content {
      padding: 15px 17px 14px;
    }

    .pass-number {
      font-size: 9.5px;
      letter-spacing: 0.1em;
    }

    .pass-redeem {
      padding: 10px 13px;
      font-size: 10.5px;
      letter-spacing: 0.1em;
    }

    .pass-emblem {
      width: 40px;
      height: 40px;
    }

    .pass-emblem svg {
      width: 21px;
      height: 21px;
    }

    .pass-chip {
      width: 38px;
      height: 28px;
    }
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
