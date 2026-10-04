<script lang="ts">
  import { onMount } from 'svelte';
  import type { GameStats, GameStatus } from './game';

  let {
    open = false,
    stats,
    gameStatus = 'IN_PROGRESS',
    guessesCount = 0,
    targetWord = '',
    isDaily = true,
    shareCopied = false,
    onShare,
    onPlayPractice,
    onClose,
  }: {
    open: boolean;
    stats: GameStats;
    gameStatus?: GameStatus;
    guessesCount?: number;
    targetWord?: string;
    isDaily?: boolean;
    shareCopied?: boolean;
    onShare: () => void;
    onPlayPractice: () => void;
    onClose: () => void;
  } = $props();

  let timeUntilNext = $state('');

  function updateCountdown() {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const diff = Math.max(0, tomorrow.getTime() - now.getTime());
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    timeUntilNext = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  onMount(() => {
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  });

  const winPercentage = $derived(
    stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0
  );

  const maxGuessCount = $derived(
    Math.max(1, ...Object.values(stats.guesses))
  );

  function handleBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
  <div class="modal-backdrop" onclick={handleBackdrop}>
    <div class="modal-card px" role="dialog" aria-modal="true" aria-labelledby="stats-title">
      <div class="modal-head">
        <h2 id="stats-title">Statistics</h2>
        <button type="button" class="close-btn" onclick={onClose} aria-label="Close modal">✕</button>
      </div>

      {#if gameStatus !== 'IN_PROGRESS'}
        <div class="game-outcome" class:won={gameStatus === 'WON'} class:lost={gameStatus === 'LOST'}>
          {#if gameStatus === 'WON'}
            <p class="outcome-title">Splendid!</p>
            <p class="outcome-sub">You solved it in {guessesCount} {guessesCount === 1 ? 'guess' : 'guesses'}!</p>
          {:else}
            <p class="outcome-title">Nice Try!</p>
            <p class="outcome-sub">The word was <strong class="word-highlight">{targetWord}</strong>.</p>
          {/if}
        </div>
      {/if}

      <div class="stats-overview">
        <div class="stat-box">
          <span class="stat-val">{stats.played}</span>
          <span class="stat-lbl">Played</span>
        </div>
        <div class="stat-box">
          <span class="stat-val">{winPercentage}%</span>
          <span class="stat-lbl">Win %</span>
        </div>
        <div class="stat-box">
          <span class="stat-val">{stats.currentStreak}</span>
          <span class="stat-lbl">Streak</span>
        </div>
        <div class="stat-box">
          <span class="stat-val">{stats.maxStreak}</span>
          <span class="stat-lbl">Max</span>
        </div>
      </div>

      <div class="dist-section">
        <h3 class="dist-title">Guess Distribution</h3>
        <div class="dist-bars">
          {#each [1, 2, 3, 4, 5, 6] as num (num)}
            {@const count = stats.guesses[num as 1 | 2 | 3 | 4 | 5 | 6] || 0}
            {@const isCurrentWin = gameStatus === 'WON' && guessesCount === num}
            {@const pct = Math.max(7, Math.round((count / maxGuessCount) * 100))}
            <div class="dist-row">
              <span class="dist-num">{num}</span>
              <div class="dist-track">
                <div
                  class="dist-fill px"
                  class:highlight={isCurrentWin}
                  style:width="{pct}%"
                >
                  <span class="dist-count">{count}</span>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <div class="footer-actions">
        {#if isDaily && gameStatus !== 'IN_PROGRESS'}
          <div class="countdown-box">
            <span class="cd-label">Next Daily Wordle</span>
            <span class="cd-timer">{timeUntilNext}</span>
          </div>
        {/if}

        <div class="action-buttons">
          {#if gameStatus !== 'IN_PROGRESS'}
            <button type="button" class="btn px share-btn" onclick={onShare}>
              {#if shareCopied}
                Copied! ✓
              {:else}
                Share Results 📋
              {/if}
            </button>
          {/if}

          {#if isDaily && gameStatus !== 'IN_PROGRESS'}
            <button type="button" class="btn px practice-btn" onclick={onPlayPractice}>
              Play Practice Mode 🎮
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(11, 15, 25, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    z-index: 100;
    backdrop-filter: blur(4px);
    animation: fade-in 0.15s ease-out;
  }

  .modal-card {
    background: var(--field);
    border: 2px solid var(--dim);
    color: var(--fg);
    width: 100%;
    max-width: 440px;
    padding: 24px;
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6);
  }

  .modal-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  h2 {
    margin: 0;
    font-size: 24px;
  }

  .close-btn {
    background: none;
    border: 0;
    color: var(--muted);
    font-size: 20px;
    cursor: var(--cursor-pointer);
    padding: 4px 8px;
    line-height: 1;
  }

  .close-btn:hover {
    color: var(--fg);
  }

  .game-outcome {
    text-align: center;
    padding: 12px;
    margin-bottom: 20px;
    background: #111726;
    border-left: 4px solid var(--accent);
  }

  .game-outcome.lost {
    border-left-color: var(--error);
  }

  .outcome-title {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
  }

  .outcome-sub {
    margin: 4px 0 0;
    font-size: 16px;
    color: var(--muted);
  }

  .word-highlight {
    color: var(--fg);
    letter-spacing: 2px;
  }

  .stats-overview {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    text-align: center;
    margin-bottom: 24px;
  }

  .stat-box {
    display: flex;
    flex-direction: column;
    background: #111726;
    padding: 8px 4px;
  }

  .stat-val {
    font-size: 28px;
    font-weight: 700;
    line-height: 1.1;
  }

  .stat-lbl {
    font-size: 13px;
    color: var(--muted);
    margin-top: 2px;
  }

  .dist-section {
    margin-bottom: 24px;
  }

  .dist-title {
    font-size: 18px;
    margin: 0 0 12px;
  }

  .dist-bars {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .dist-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 700;
  }

  .dist-num {
    width: 14px;
    text-align: right;
  }

  .dist-track {
    flex: 1;
    background: #111726;
    height: 24px;
    display: flex;
  }

  .dist-fill {
    background: #253348;
    color: var(--fg);
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 8px;
    min-width: 24px;
    transition: width 0.3s ease;
  }

  .dist-fill.highlight {
    background: var(--accent);
    color: #080c18;
  }

  .dist-count {
    font-size: 14px;
    font-weight: 700;
    line-height: 1;
  }

  .footer-actions {
    border-top: 1px solid var(--dim);
    padding-top: 18px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    align-items: center;
  }

  .countdown-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .cd-label {
    font-size: 13px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .cd-timer {
    font-size: 24px;
    font-weight: 700;
    letter-spacing: 2px;
  }

  .action-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
    width: 100%;
  }

  .share-btn {
    flex: 1;
    min-width: 140px;
    text-align: center;
    background: var(--accent);
    color: #080c18;
  }

  .share-btn:hover {
    background: #9ecc85;
  }

  .practice-btn {
    flex: 1;
    min-width: 140px;
    text-align: center;
    background: var(--field-focus);
    color: var(--fg);
    border: 1px solid var(--dim);
  }

  .practice-btn:hover {
    background: var(--dim);
    color: #080c18;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>
