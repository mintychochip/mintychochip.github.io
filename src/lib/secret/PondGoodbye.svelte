<script lang="ts">
  import PondCanvas, { clearBoxOf, type PondHandle } from '../pond/PondCanvas.svelte';
  import { clamp } from '../pond/field';
  import { playDuetCroak, playLoveSerenade } from '../wordle/sound';
  import type { VaultCopy } from './vault-types';

  let {
    copy,
    onLove,
    onLock,
  }: { copy: VaultCopy['pond']; onLove: () => void; onLock: () => void } = $props();

  let pond = $state<PondHandle>();
  let scene = $state<HTMLDivElement>();
  let title = $state<HTMLHeadingElement>();
  /** A love line while it is showing; the idle line otherwise. */
  let line = $state<string | null>(null);
  let timer: number | undefined;

  const pondOptions = (W: number) => ({
    k: clamp(W / 123, 1.3, 2.4),
    frogs: 2,
    flies: Math.round(clamp(W / 32, 4, 10)),
    horizon: 0.4,
    clear: [clearBoxOf(title, scene)].filter((b) => b !== undefined),
  });

  function sendLove() {
    playDuetCroak(true);
    pond?.meet();
    onLove();
    line = copy.loveLines[Math.floor(Math.random() * copy.loveLines.length)] ?? null;
    clearTimeout(timer);
    timer = window.setTimeout(() => (line = null), 4000);
  }

  $effect(() => () => clearTimeout(timer));
</script>

<section id="anniversary-pond" aria-labelledby="pond-title">
  <div class="art">
    <div class="scene" bind:this={scene}>
      <!-- The page starts at dusk and ends under the site's own night sky. -->
      <PondCanvas
        bind:this={pond}
        seed="anniversary-goodnight"
        palette="night"
        options={pondOptions}
        interactive
      />
      <p class="speech" aria-live="polite">{line ?? copy.idleSpeech}</p>
    </div>
    <h2 id="pond-title" bind:this={title}>{copy.title}</h2>
  </div>
  <p class="visually-hidden">
    Bumpy and the pink frog sit on lily pads under the moon. Sending them love brings him over to share her pad.
  </p>
  <div class="actions">
    <button type="button" class="btn px" onclick={sendLove}>{copy.button}</button>
    <button type="button" class="text-btn" onclick={() => playLoveSerenade(true)}>Play the serenade</button>
    <button type="button" class="text-btn lock" onclick={onLock}>Goodnight, lock the vault</button>
  </div>
</section>

<style>
  .art {
    position: relative;
  }

  .scene {
    position: relative;
    height: 320px;
  }

  /* The chapter's title on its pond, the way the site's hero sets its name. */
  h2 {
    position: absolute;
    left: 27px;
    bottom: 21px;
    max-width: calc(100% - 48px);
    margin: 0;
    font-size: clamp(28px, 4.5vw, 40px);
    line-height: 1.05;
    text-shadow: 3px 3px 0 var(--bg);
    pointer-events: none;
  }

  /* A speech bubble with a stepped tail, pointing down at the pond. */
  .speech {
    position: absolute;
    top: 18px;
    left: 18px;
    max-width: min(440px, calc(100% - 36px));
    margin: 0;
    padding: 9px 14px;
    background: var(--fg);
    color: var(--bg);
    font-family: var(--font);
    font-size: 18px;
    line-height: 1.35;
  }

  .speech::after {
    content: '';
    position: absolute;
    left: 21px;
    bottom: -9px;
    width: 9px;
    height: 9px;
    background: var(--fg);
    clip-path: polygon(0 0, 100% 0, 100% 3px, 6px 3px, 6px 6px, 3px 6px, 3px 100%, 0 100%);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 22px;
    margin-top: 18px;
  }

  .actions .btn {
    font-size: 17px;
    padding: 9px 18px;
  }

  .text-btn {
    padding: 6px 0;
    border: 0;
    background: none;
    color: var(--muted);
    font-size: 16px;
    text-decoration: underline;
    text-underline-offset: 4px;
    cursor: var(--cursor-pointer);
  }

  .text-btn:hover {
    color: var(--fg);
  }

  .lock {
    margin-left: auto;
  }

  @media (max-width: 640px) {
    .scene {
      height: 240px;
    }

    h2 {
      position: static;
      max-width: 100%;
      margin-top: 12px;
      text-shadow: none;
      font-size: clamp(26px, 8vw, 34px);
    }

    /* Over the sky's left side only, so the moon and the heart over the frogs stay in view. */
    .speech {
      top: 9px;
      left: 9px;
      max-width: 72%;
      padding: 6px 10px;
      font-size: 15px;
      line-height: 1.3;
    }

    .lock {
      margin-left: 0;
    }
  }
</style>
