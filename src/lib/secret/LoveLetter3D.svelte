<script lang="ts">
  import { onMount } from 'svelte';
  import { createLetterScene, type LetterSceneHandle } from './letter3d';
  import type { AnniversaryLetterCopy } from './letter-copy';
  import { playHeartChime } from '../wordle/sound';

  type Phase = 'sealed' | 'opening' | 'open' | 'unsupported';

  let {
    letter,
    /** Fired once the card is open, so the vault can unlock what follows. */
    onOpened,
  }: { letter: AnniversaryLetterCopy; onOpened?: () => void } = $props();

  let hostEl = $state<HTMLDivElement>();
  let phase = $state<Phase>('sealed');
  // Paged canvases show one inside page at a time; 1 means the spread fits.
  let page = $state(0);
  let pageCount = $state(1);
  let sceneHandle: LetterSceneHandle | undefined;
  let intersectionObserver: IntersectionObserver | undefined;
  let visibilityHandler: (() => void) | undefined;

  /** How long the 3D scene gets to start before the letter falls back to paper. */
  const SCENE_START_TIMEOUT = 6000;

  /**
   * Moves to a state where the whole letter can be read. Both the opened card
   * and the plain-paper fallback count, so a device without WebGL gets into the
   * vault instead of being locked out of it.
   */
  function reveal(next: 'open' | 'unsupported') {
    if (phase === 'open' || phase === 'unsupported') return;
    phase = next;
    onOpened?.();
  }

  function handleOpen() {
    if (phase !== 'sealed' || !sceneHandle) return;
    phase = 'opening';
    sceneHandle.open();
  }

  onMount(() => {
    const host = hostEl;
    if (!host) return;

    let disposed = false;

    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // The stage must never be an empty box: if the scene has not started by now
    // (blocked GPU, failed import, a hot-reload that half-applied), show the
    // letter as plain paper instead.
    const watchdog = setTimeout(() => {
      if (!disposed && !sceneHandle) {
        console.warn('[letter3d] scene did not start, falling back to plain paper');
        reveal('unsupported');
      }
    }, SCENE_START_TIMEOUT);

    (async () => {
      try {
        const THREE = await import('three');
        if (disposed) return;

        // The note texture is drawn with the site font, so wait for it briefly.
        if (document.fonts?.ready) {
          await Promise.race([
            document.fonts.ready,
            new Promise((resolve) => setTimeout(resolve, 1500)),
          ]);
        }
        if (disposed) return;

        sceneHandle = createLetterScene(THREE, host, {
          letter,
          reducedMotion,
          onOpened: () => {
            playHeartChime(true);
            reveal('open');
          },
          onError: () => {
            reveal('unsupported');
          },
          onTap: () => handleOpen(),
          onPage: (index, count) => {
            page = index;
            pageCount = count;
          },
        });
      } catch (error) {
        if (!disposed) reveal('unsupported');
        console.error('[letter3d] could not start the 3D letter', error);
        return;
      } finally {
        clearTimeout(watchdog);
      }

      if (disposed) {
        sceneHandle.dispose();
        sceneHandle = undefined;
        return;
      }

      // Freeze the render loop whenever the stage is off-screen or the tab hidden.
      let onScreen = true;
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) onScreen = entry.isIntersecting;
          sceneHandle?.setPaused(!onScreen || document.hidden);
        },
        { threshold: 0.04 },
      );
      intersectionObserver.observe(host);

      visibilityHandler = () => sceneHandle?.setPaused(document.hidden || !onScreen);
      document.addEventListener('visibilitychange', visibilityHandler);
    })();

    return () => {
      disposed = true;
      intersectionObserver?.disconnect();
      intersectionObserver = undefined;
      if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
      visibilityHandler = undefined;
      sceneHandle?.dispose();
      sceneHandle = undefined;
    };
  });
</script>

<section
  id="anniversary-letter3d"
  class="letter3d-stage"
  class:is-open={phase === 'open'}
  aria-labelledby="letter3d-heading"
>
  <div class="stage-bg" aria-hidden="true">
    <div class="stage-glow stage-glow-a"></div>
    <div class="stage-glow stage-glow-b"></div>
    <div class="stage-grid"></div>
    <div class="stage-vignette"></div>
  </div>

  <header class="letter3d-copy">
    <span class="letter3d-pill"><span class="pill-dot"></span> Before your passes</span>
    <h1 id="letter3d-heading" class="letter3d-title">A letter, sealed for you</h1>
    <p class="letter3d-sub">
      {#if phase === 'sealed'}
        Drag to turn the envelope · open the flap to read the card inside
      {:else if phase === 'opening'}
        Breaking the seal…
      {:else if phase === 'open'}
        {pageCount > 1
          ? 'Tap the card or swipe to turn the page'
          : 'The card is open — your passes are waiting below'}
      {:else}
        The letter, on plain paper
      {/if}
    </p>
  </header>

  <div
    class="letter3d-canvas"
    class:is-sealed={phase === 'sealed'}
    bind:this={hostEl}
    role="presentation"
    aria-hidden="true"
  ></div>

  {#if phase === 'unsupported'}
    <article class="letter3d-fallback">
      <p class="fallback-kicker">{letter.cover.kicker}</p>
      <h2 class="fallback-title">{letter.cover.title}</h2>
      <p class="fallback-greeting">{letter.greeting}</p>
      {#each letter.paragraphs as paragraph}
        <p class="fallback-para">{paragraph}</p>
      {/each}
      <p class="fallback-sign">{letter.signoff}</p>
      <p class="fallback-signature">{letter.signature} ❤️</p>
    </article>
  {/if}

  <div class="letter3d-actions">
    {#if phase === 'sealed'}
      <button type="button" class="btn px letter3d-btn" onclick={handleOpen}>
        Open the letter 💌
      </button>
      <span class="letter3d-wait">The vault opens once you do 💌</span>
    {:else if phase === 'opening'}
      <span class="letter3d-wait">Opening…</span>
    {:else}
      <a class="btn px letter3d-btn" href="#anniversary-passes">Continue to your passes ↓</a>
      <a class="btn px letter3d-btn ghost" href="#anniversary-letter">Plain-text version ↓</a>
    {/if}
  </div>

  {#if phase === 'open' && pageCount > 1}
    <div class="letter3d-pager">
      <button
        type="button"
        class="letter3d-page-btn"
        onclick={() => sceneHandle?.turnPage(-1)}
        disabled={page === 0}
        aria-label="Previous page of the letter"
      >
        ‹
      </button>
      <span class="letter3d-page-count">Page {page + 1} of {pageCount}</span>
      <button
        type="button"
        class="letter3d-page-btn"
        onclick={() => sceneHandle?.turnPage(1)}
        disabled={page >= pageCount - 1}
        aria-label="Next page of the letter"
      >
        ›
      </button>
    </div>
  {/if}

  <p class="visually-hidden">
    {letter.cover.title}. {letter.greeting} {letter.paragraphs.join(' ')} {letter.signoff} {letter.signature}.
  </p>
  <p class="visually-hidden" role="status" aria-live="polite">
    {#if phase === 'open'}
      Card opened. The full letter is now readable.
      {#if pageCount > 1}Showing page {page + 1} of {pageCount}.{/if}
    {/if}
  </p>
</section>

<style>
  .letter3d-stage {
    position: relative;
    width: 100vw;
    max-width: 100vw;
    margin-left: calc(50% - 50vw);
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    /* The bottom padding also clears the fixed music bar, so the open button
       and the page pager are never hidden behind it. */
    padding: 40px 20px calc(48px + var(--vp-bar-h, 76px));
    overflow: hidden;
    background: #050508;
    color: #ece6cc;
  }

  .stage-bg {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }

  .stage-glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(90px);
    opacity: 0.42;
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
      linear-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: radial-gradient(circle at 50% 45%, #000 20%, transparent 78%);
  }

  .stage-vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 45%, transparent 42%, rgba(0, 0, 0, 0.72) 100%);
  }

  .letter3d-copy {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    text-align: center;
    max-width: 640px;
  }

  .letter3d-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 5px 12px;
    border: 1px solid rgba(244, 140, 184, 0.35);
    background: rgba(244, 140, 184, 0.08);
    color: #f7b8d2;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .pill-dot {
    width: 7px;
    height: 7px;
    background: #ff4d94;
    box-shadow: 0 0 10px #ff4d94;
    animation: pill-pulse 1.8s ease-in-out infinite;
  }

  @keyframes pill-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.35;
    }
  }

  .letter3d-title {
    margin: 0;
    font-size: clamp(26px, 4.4vw, 44px);
    line-height: 1.1;
    letter-spacing: -0.01em;
    color: #fff;
    text-shadow: 0 0 24px rgba(244, 140, 184, 0.35);
  }

  .letter3d-sub {
    margin: 0;
    font-size: 14px;
    letter-spacing: 0.04em;
    color: rgba(255, 255, 255, 0.58);
  }

  .letter3d-canvas {
    position: relative;
    z-index: 1;
    flex: 1 1 auto;
    width: min(100%, 880px);
    min-height: 340px;
    touch-action: pan-y;
  }

  /* Injected by createLetterScene; out of flow so its buffer size cannot feed
     back into the host's layout. */
  .letter3d-canvas :global(canvas) {
    position: absolute;
    inset: 0;
    display: block;
    touch-action: pan-y;
  }

  .letter3d-canvas.is-sealed {
    cursor: var(--cursor-pointer);
  }

  .letter3d-actions {
    position: relative;
    z-index: 2;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
  }

  .letter3d-btn {
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    padding: 10px 18px;
    border: 1px solid rgba(244, 140, 184, 0.45);
    background: rgba(244, 140, 184, 0.14);
    color: #ffe6f1;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.06em;
    cursor: var(--cursor-pointer);
  }

  .letter3d-btn:hover,
  .letter3d-btn:focus-visible {
    background: rgba(244, 140, 184, 0.3);
  }

  .letter3d-btn.ghost {
    border-color: rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.04);
    color: rgba(255, 255, 255, 0.72);
  }

  .letter3d-wait {
    font-size: 13px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.5);
  }

  .letter3d-pager {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .letter3d-page-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: 1px solid rgba(244, 140, 184, 0.45);
    background: rgba(244, 140, 184, 0.12);
    color: #ffe6f1;
    font-size: 20px;
    line-height: 1;
    cursor: var(--cursor-pointer);
  }

  .letter3d-page-btn:hover:not(:disabled),
  .letter3d-page-btn:focus-visible:not(:disabled) {
    background: rgba(244, 140, 184, 0.28);
  }

  .letter3d-page-btn:disabled {
    border-color: rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.03);
    color: rgba(255, 255, 255, 0.28);
    cursor: default;
  }

  .letter3d-page-count {
    min-width: 92px;
    text-align: center;
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.62);
  }

  .letter3d-fallback {
    position: relative;
    z-index: 2;
    width: min(100%, 520px);
    padding: 26px 24px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: #f8efd8;
    color: #3b2a1c;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
  }

  .fallback-kicker {
    margin: 0 0 4px;
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(59, 42, 28, 0.55);
  }

  .fallback-title {
    margin: 0 0 16px;
    font-size: 24px;
    color: #c2185b;
  }

  .fallback-greeting {
    margin: 0 0 12px;
    font-size: 17px;
    font-weight: 600;
  }

  .fallback-para {
    margin: 0 0 12px;
    font-size: 16px;
    line-height: 1.5;
  }

  .fallback-signature {
    margin: 0;
    font-weight: 700;
    color: #c2185b;
  }

  .fallback-sign {
    margin: 0;
    font-weight: 700;
    color: #c2185b;
  }

  @media (max-width: 640px) {
    .letter3d-stage {
      padding: 28px 16px calc(36px + var(--vp-bar-h, 76px));
      gap: 10px;
    }

    .letter3d-canvas {
      min-height: 300px;
    }

    /* The open card needs the height more than the stage title does. */
    .letter3d-stage.is-open .letter3d-copy {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .pill-dot {
      animation: none;
    }
  }
</style>
