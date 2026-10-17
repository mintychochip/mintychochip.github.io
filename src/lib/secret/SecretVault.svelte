<script lang="ts">
  import { tick } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import VaultMusicPlayer from '../music/VaultMusicPlayer.svelte';
  import { prefersReducedMotion } from '../pond/ticker';
  import { playHeartChime, playSecretUnlock } from '../wordle/sound';
  import BumpyPuzzle from './BumpyPuzzle.svelte';
  import HeartShower, { type HeartShowerHandle } from './HeartShower.svelte';
  import LetterStage from './LetterStage.svelte';
  import LovePasses from './LovePasses.svelte';
  import PondGoodbye from './PondGoodbye.svelte';
  import ReasonsJar from './ReasonsJar.svelte';
  import type { VaultCopy } from './vault-types';

  let {
    onLogout,
    /** Fired once the letter is open and everything after it is in the page. */
    onUnlock,
    copy,
  }: { onLogout: () => void; onUnlock: () => void; copy: VaultCopy } = $props();

  let shower = $state<HeartShowerHandle>();
  /** Everything after the letter stays out of the page until the letter is open. */
  let letterOpened = $state(false);
  const redeemed = new SvelteSet<number>();
  const passes = $derived(copy.coupons.map((coupon) => ({ ...coupon, redeemed: redeemed.has(coupon.id) })));
  /** The pass she just jumped to from the letter's attachments. */
  let highlighted = $state<number | null>(null);
  let highlightTimer: number | undefined;

  function redeem(id: number) {
    if (redeemed.has(id)) return;
    redeemed.add(id);
    playSecretUnlock(true);
    playHeartChime(true);
    shower?.burst(16);
  }

  /** From an attachment slot on the letter to its pass, which blinks so she can see which one. */
  async function showPass(id: number) {
    document
      .getElementById(`pass-${id}`)
      ?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
    // Cleared first so picking the same pass twice blinks it again.
    highlighted = null;
    await tick();
    highlighted = id;
    clearTimeout(highlightTimer);
    highlightTimer = window.setTimeout(() => (highlighted = null), 1600);
  }

  $effect(() => () => clearTimeout(highlightTimer));
</script>

<HeartShower bind:this={shower} />

<div class="vault">
  <!-- The passes came in the envelope too, so they sit close under the letter. -->
  <div class="with-letter">
    <LetterStage
      letter={copy.letter}
      attachments={passes}
      onAttachment={showPass}
      onOpened={() => {
        letterOpened = true;
        onUnlock();
      }}
      onWritten={() => shower?.burst(14)}
    />
    {#if letterOpened}
      <LovePasses {passes} {highlighted} onRedeem={redeem} />
    {/if}
  </div>

  {#if letterOpened}
    <ReasonsJar
      copy={copy.reasons}
      onRead={() => {
        playHeartChime(true);
        shower?.burst(3);
      }}
    />
    <BumpyPuzzle wordle={copy.wordle} prize={copy.oracle} onSolved={() => shower?.burst(20)} />
    <PondGoodbye copy={copy.pond} onLove={() => shower?.burst(14)} onLock={onLogout} />
  {/if}

  <VaultMusicPlayer />
</div>

<style>
  .vault {
    /* Pink takes over the green accent in here: buttons, focus rings and links. */
    --accent: var(--love);
    /* Pixelify Sans draws its "fi" ligature like an A at these sizes ("infinite" reads "inAnite"). */
    font-variant-ligatures: none;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 76px;
    width: 100%;
  }

  .with-letter {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 44px;
  }

  .vault :global(::selection) {
    background: var(--love);
    color: var(--bg);
  }

  @media (max-width: 640px) {
    .vault {
      gap: 48px;
    }

    .with-letter {
      gap: 32px;
    }
  }
</style>
