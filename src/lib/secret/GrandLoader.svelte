<script lang="ts">
  import { onMount } from 'svelte';
  import { playKeyPress, playLoveSerenade, playSecretUnlock } from '../wordle/sound';

  let {
    onComplete,
  }: {
    onComplete: () => void;
  } = $props();

  let progress = $state(0);
  let statusLines = $state<string[]>([]);
  let doorOpening = $state(false);
  let completed = $state(false);

  const LOG_STEPS = [
    { delay: 100, text: '>> INITIATING BUMPY SECURE HANDSHAKE...' },
    { delay: 500, text: '>> CLEARANCE ACCEPTED' },
    { delay: 950, text: '>> CALIBRATING POND FREQUENCIES & LILYPADS...' },
    { delay: 1450, text: '>> DETECTING SPECIAL OCCASION ARCHIVE... [MATCH FOUND]' },
    { delay: 1950, text: '>> CLEARANCE LEVEL: VIP LIFETIME ACCESS [GRANTED]' },
    { delay: 2450, text: '>> ACCESS PERMITTED: FOR MY FAVORITE PERSON ❤️' },
    { delay: 2850, text: '>> UNLOCKING HAPPY ANNIVERSARY CELEBRATION...' },
  ];

  function finish() {
    if (completed) return;
    completed = true;
    onComplete();
  }

  onMount(() => {
    // Progress increment timer
    const progressInterval = setInterval(() => {
      progress = Math.min(100, progress + 2);
      if (progress >= 100) {
        clearInterval(progressInterval);
      }
    }, 55);

    // Stream status log lines
    const timers: ReturnType<typeof setTimeout>[] = [];

    LOG_STEPS.forEach(({ delay, text }, idx) => {
      const t = setTimeout(() => {
        statusLines = [...statusLines, text];
        playKeyPress(true);

        if (idx === LOG_STEPS.length - 1) {
          // Play love serenade fanfare and initiate door opening
          playSecretUnlock(true);
          playLoveSerenade(true);
          doorOpening = true;

          setTimeout(() => {
            finish();
          }, 800);
        }
      }, delay);
      timers.push(t);
    });

    return () => {
      clearInterval(progressInterval);
      timers.forEach(clearTimeout);
    };
  });
</script>

<div class="loader-overlay" class:opening={doorOpening} role="dialog" aria-modal="true" aria-label="Loading Bumpy's Secret Vault">
  <!-- Vault Doors -->
  <div class="vault-door left-door" class:slide-left={doorOpening}>
    <div class="door-pattern"></div>
    <div class="hazard-stripe"></div>
  </div>
  <div class="vault-door right-door" class:slide-right={doorOpening}>
    <div class="door-pattern"></div>
    <div class="hazard-stripe"></div>
  </div>

  <!-- Central Terminal Display -->
  <div class="terminal-center px" class:fade-out={doorOpening}>
    <div class="terminal-top">
      <div class="top-tag">
        <span class="blinking-dot"></span>
        <span>CLASSIFIED // ANNIVERSARY CLEARANCE ❤️</span>
      </div>
      <button type="button" class="skip-btn px" onclick={finish}>
        Skip ▶
      </button>
    </div>

    <!-- Big Animated Frog Iris -->
    <div class="iris-frame">
      <div class="radar-sweep"></div>
      <div class="frog-emblem">🐸💕</div>
    </div>

    <h2 class="loader-title">DECRYPTING ANNIVERSARY VAULT</h2>

    <!-- Retro Progress Bar -->
    <div class="progress-wrap px">
      <div class="progress-fill px" style:width="{progress}%"></div>
      <span class="progress-text">{progress}%</span>
    </div>

    <!-- Terminal Status Stream -->
    <div class="console-box px">
      {#each statusLines as line}
        <div class="console-line">{line}</div>
      {/each}
      {#if !doorOpening}
        <div class="console-cursor">█</div>
      {/if}
    </div>
  </div>
</div>

<style>
  .loader-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: #060911;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    user-select: none;
  }

  /* Giant sliding steel vault doors */
  .vault-door {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 50.5%;
    background: #0c121e;
    border: 3px solid #1a2538;
    z-index: 5;
    transition: transform 0.75s cubic-bezier(0.77, 0, 0.175, 1);
  }

  .left-door {
    left: 0;
    border-right: 4px solid var(--accent);
  }

  .right-door {
    right: 0;
    border-left: 4px solid var(--accent);
  }

  .left-door.slide-left {
    transform: translateX(-100%);
  }

  .right-door.slide-right {
    transform: translateX(100%);
  }

  .door-pattern {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgba(104, 113, 132, 0.15) 1px, transparent 0);
    background-size: 16px 16px;
  }

  .hazard-stripe {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 12px;
    background: repeating-linear-gradient(
      -45deg,
      #d69e2e,
      #d69e2e 10px,
      #111726 10px,
      #111726 20px
    );
  }

  /* Center Terminal HUD */
  .terminal-center {
    position: relative;
    z-index: 10;
    background: rgba(14, 20, 32, 0.94);
    border: 2px solid var(--accent);
    padding: 28px;
    width: min(560px, calc(100vw - 32px));
    box-shadow: 0 0 50px rgba(0, 0, 0, 0.9), 0 0 25px rgba(139, 191, 115, 0.2);
    display: flex;
    flex-direction: column;
    align-items: center;
    transition: opacity 0.3s ease, transform 0.3s ease;
  }

  .terminal-center.fade-out {
    opacity: 0;
    transform: scale(1.04);
  }

  .terminal-top {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(139, 191, 115, 0.3);
    padding-bottom: 10px;
    margin-bottom: 20px;
  }

  .top-tag {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: var(--accent);
  }

  .blinking-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 8px var(--accent);
    animation: blink 1s infinite alternate;
  }

  .skip-btn {
    background: transparent;
    border: 1px solid var(--dim);
    color: var(--muted);
    font-size: 12px;
    padding: 3px 8px;
    cursor: var(--cursor-pointer);
  }

  .skip-btn:hover {
    color: var(--fg);
    border-color: var(--fg);
  }

  .iris-frame {
    position: relative;
    width: 76px;
    height: 76px;
    border-radius: 50%;
    border: 2px dashed var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
    background: #090e18;
    overflow: hidden;
  }

  .radar-sweep {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border-top: 2px solid var(--accent);
    animation: radar-spin 1.8s linear infinite;
  }

  .frog-emblem {
    font-size: 36px;
    line-height: 1;
    z-index: 2;
  }

  .loader-title {
    margin: 0 0 16px;
    font-size: 22px;
    color: var(--fg);
    letter-spacing: 2px;
  }

  .progress-wrap {
    width: 100%;
    height: 24px;
    background: #090d16;
    border: 1px solid var(--dim);
    position: relative;
    display: flex;
    align-items: center;
    margin-bottom: 20px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--accent);
    transition: width 0.08s linear;
  }

  .progress-text {
    position: absolute;
    width: 100%;
    text-align: center;
    font-size: 13px;
    font-weight: 700;
    color: var(--fg);
    text-shadow: 1px 1px 2px #000;
  }

  .console-box {
    width: 100%;
    height: 110px;
    background: #070a12;
    border: 1px solid rgba(104, 113, 132, 0.3);
    padding: 10px 12px;
    overflow-y: hidden;
    font-size: 12px;
    line-height: 1.5;
    color: #a8cc5c;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  .console-line {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .console-cursor {
    color: var(--accent);
    animation: blink 0.8s infinite;
  }

  @keyframes radar-spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes blink {
    0%, 100% {
      opacity: 0.2;
    }
    50% {
      opacity: 1;
    }
  }
</style>
