<script lang="ts">
  import { onMount } from 'svelte';
  import {
    checkHardModeViolation,
    DEFAULT_SETTINGS,
    DEFAULT_STATS,
    generateShareText,
    getKeyboardStatuses,
    loadStoredDaily,
    loadStoredSettings,
    loadStoredStats,
    recordGameEnd,
    saveStoredDaily,
    saveStoredSettings,
    saveStoredStats,
    type GameMode,
    type GameSettings,
    type GameStats,
    type GameStatus,
  } from './game';
  import {
    playDelete,
    playInvalid,
    playKeyPress,
    playLoss,
    playRevealTile,
    playSecretUnlock,
    playWin,
  } from './sound';
  import { getDailyWord, getRandomWord, isValidWord } from './words';
  import WordleFrog from './WordleFrog.svelte';
  import WordleGrid from './WordleGrid.svelte';
  import WordleKeyboard from './WordleKeyboard.svelte';
  import HelpModal from './HelpModal.svelte';
  import SettingsModal from './SettingsModal.svelte';
  import StatsModal from './StatsModal.svelte';
  import { VAULT_FROG_LINE, VAULT_TOAST_LINE } from '../secret/vault-chrome';

  let {
    onNavigateToSecret,
  }: {
    onNavigateToSecret?: () => void;
  } = $props();

  function openVaultDoor() {
    setFrogReaction('hop', VAULT_FROG_LINE, 3000);
    showToast(VAULT_TOAST_LINE, 2500);
    playSecretUnlock(true);
    if (onNavigateToSecret) {
      onNavigateToSecret();
    } else {
      window.location.hash = '#secret';
    }
  }

  // State
  let mode = $state<GameMode>('daily');
  let targetWord = $state('');
  let puzzleNumber = $state<number | null>(null);
  let dateString = $state('');

  let guesses = $state<string[]>([]);
  let currentGuess = $state('');
  let gameStatus = $state<GameStatus>('IN_PROGRESS');

  let settings = $state<GameSettings>(DEFAULT_SETTINGS);
  let stats = $state<GameStats>(DEFAULT_STATS);

  let toastMessage = $state('');
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  let frogMood = $state<'idle' | 'thinking' | 'happy' | 'sad' | 'hop'>('idle');
  let frogMessage = $state('');
  let frogTimer: ReturnType<typeof setTimeout> | null = null;

  let isInvalidRow = $state(false);
  let isWonRow = $state(false);

  // Modals
  let helpOpen = $state(false);
  let statsOpen = $state(false);
  let settingsOpen = $state(false);
  let shareCopied = $state(false);

  const isModalOpen = $derived(helpOpen || statsOpen || settingsOpen);

  const keyboardStatuses = $derived(
    targetWord ? getKeyboardStatuses(guesses, targetWord) : {}
  );

  const canToggleHardMode = $derived(guesses.length === 0);

  function showToast(msg: string, duration = 1800) {
    toastMessage = msg;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastMessage = '';
    }, duration);
  }

  function setFrogReaction(mood: 'idle' | 'thinking' | 'happy' | 'sad' | 'hop', message = '', duration = 2500) {
    frogMood = mood;
    frogMessage = message;
    if (frogTimer) clearTimeout(frogTimer);
    if (mood !== 'idle' && gameStatus === 'IN_PROGRESS') {
      frogTimer = setTimeout(() => {
        frogMood = 'idle';
        frogMessage = '';
      }, duration);
    }
  }

  function startDailyGame() {
    mode = 'daily';
    const daily = getDailyWord();
    targetWord = daily.word;
    puzzleNumber = daily.puzzleNumber;
    dateString = daily.dateString;

    // Check saved state for today
    const saved = loadStoredDaily();
    if (saved && saved.date === daily.dateString && saved.targetWord === daily.word) {
      guesses = saved.guesses;
      currentGuess = '';
      gameStatus = saved.status;
      if (saved.status === 'WON') {
        isWonRow = true;
        setFrogReaction('happy', 'Solved today! 🌟', 999999);
      } else if (saved.status === 'LOST') {
        setFrogReaction('sad', 'See you tomorrow!', 999999);
      } else {
        setFrogReaction('idle', 'Welcome back!');
      }
    } else {
      // Fresh daily game
      guesses = [];
      currentGuess = '';
      gameStatus = 'IN_PROGRESS';
      isWonRow = false;
      isInvalidRow = false;
      setFrogReaction('idle', `Daily #${puzzleNumber}`);
    }
  }

  function startPracticeGame() {
    mode = 'practice';
    puzzleNumber = null;
    dateString = '';
    targetWord = getRandomWord();
    guesses = [];
    currentGuess = '';
    gameStatus = 'IN_PROGRESS';
    isWonRow = false;
    isInvalidRow = false;
    setFrogReaction('hop', 'Practice round! 🪰');
  }

  function handleModeChange(newMode: GameMode) {
    if (newMode === mode) return;
    if (newMode === 'daily') {
      startDailyGame();
    } else {
      startPracticeGame();
    }
  }

  function handleLetter(char: string) {
    if (gameStatus !== 'IN_PROGRESS' || isModalOpen) return;
    if (currentGuess.length < 5) {
      currentGuess += char.toUpperCase();
      playKeyPress(settings.soundEnabled);
      if (currentGuess.length === 1) {
        setFrogReaction('thinking', '');
      }
    }
  }

  function handleDelete() {
    if (gameStatus !== 'IN_PROGRESS' || isModalOpen) return;
    if (currentGuess.length > 0) {
      currentGuess = currentGuess.slice(0, -1);
      playDelete(settings.soundEnabled);
    }
  }

  function handleEnter() {
    if (gameStatus !== 'IN_PROGRESS' || isModalOpen) return;

    if (currentGuess.length < 5) {
      showToast('Not enough letters');
      triggerShake();
      setFrogReaction('thinking', 'Needs 5 letters!');
      playInvalid(settings.soundEnabled);
      return;
    }

    if (!isValidWord(currentGuess)) {
      showToast('Not in word list');
      triggerShake();
      setFrogReaction('thinking', 'Not in word list!');
      playInvalid(settings.soundEnabled);
      return;
    }

    if (settings.hardMode && currentGuess !== 'BUMPY') {
      const violation = checkHardModeViolation(currentGuess, guesses, targetWord);
      if (violation) {
        showToast(violation);
        triggerShake();
        playInvalid(settings.soundEnabled);
        return;
      }
    }

    // Valid guess!
    const guessToSubmit = currentGuess;
    const nextGuesses = [...guesses, guessToSubmit];
    const guessIndex = guesses.length;
    guesses = nextGuesses;
    currentGuess = '';

    // Play staggered tile reveal sounds
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const char = guessToSubmit[i];
        const status = char === targetWord[i] ? 'correct' : targetWord.includes(char) ? 'present' : 'absent';
        playRevealTile(settings.soundEnabled, i, status);
      }, i * 160);
    }

    const won = guessToSubmit === targetWord;
    const lost = !won && nextGuesses.length >= 6;

    if (won) {
      gameStatus = 'WON';
      isWonRow = true;
      const winPhrases = ['Genius!', 'Magnificent!', 'Splendid!', 'Great!', 'Phew!'];
      const phrase = winPhrases[Math.min(winPhrases.length - 1, Math.max(0, guessIndex - 1))] || 'Splendid!';
      setTimeout(() => {
        showToast(phrase, 2500);
        setFrogReaction('happy', 'Ribbit! You did it! 🎉', 999999);
        playWin(settings.soundEnabled);
      }, 5 * 160);

      const updated = recordGameEnd(stats, true, nextGuesses.length, mode === 'daily' ? dateString : undefined);
      stats = updated;
      saveStoredStats(updated);

      if (mode === 'daily') {
        saveStoredDaily({
          date: dateString,
          puzzleNumber: puzzleNumber ?? 1,
          targetWord,
          guesses: nextGuesses,
          status: 'WON',
        });
      }

      setTimeout(() => {
        statsOpen = true;
      }, 1500);
    } else if (lost) {
      gameStatus = 'LOST';
      setTimeout(() => {
        showToast(targetWord, 3500);
        setFrogReaction('sad', `Word was ${targetWord}`, 999999);
        playLoss(settings.soundEnabled);
      }, 5 * 160);

      const updated = recordGameEnd(stats, false, nextGuesses.length, mode === 'daily' ? dateString : undefined);
      stats = updated;
      saveStoredStats(updated);

      if (mode === 'daily') {
        saveStoredDaily({
          date: dateString,
          puzzleNumber: puzzleNumber ?? 1,
          targetWord,
          guesses: nextGuesses,
          status: 'LOST',
        });
      }

      setTimeout(() => {
        statsOpen = true;
      }, 1800);
    } else {
      // Round continues - cheer if green letter found
      const hasCorrect = guessToSubmit.split('').some((c, idx) => c === targetWord[idx]);
      if (hasCorrect) {
        setTimeout(() => {
          setFrogReaction('hop', 'Nice green!', 1500);
        }, 5 * 160);
      }
    }

    if (guessToSubmit === 'BUMPY') {
      setTimeout(openVaultDoor, 5 * 160 + 200);
    }
  }

  function triggerShake() {
    isInvalidRow = true;
    setTimeout(() => {
      isInvalidRow = false;
    }, 500);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (isModalOpen) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      handleEnter();
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      handleDelete();
    } else if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault();
      handleLetter(e.key);
    }
  }

  function handleShare() {
    const text = generateShareText({
      puzzleNumber,
      guesses,
      target: targetWord,
      hardMode: settings.hardMode,
      highContrast: settings.highContrast,
      won: gameStatus === 'WON',
    });

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        shareCopied = true;
        showToast('Copied results to clipboard!');
        setTimeout(() => {
          shareCopied = false;
        }, 2000);
      }).catch(() => {
        showToast('Unable to copy to clipboard');
      });
    } else {
      showToast('Clipboard not supported');
    }
  }

  function handleUpdateSettings(newSettings: GameSettings) {
    settings = newSettings;
    saveStoredSettings(newSettings);
  }

  onMount(() => {
    settings = loadStoredSettings();
    stats = loadStoredStats();
    startDailyGame();
  });

  export function openHelpModal() {
    helpOpen = true;
  }
  export function openStatsModal() {
    statsOpen = true;
  }
  export function openSettingsModal() {
    settingsOpen = true;
  }
  export function switchMode(newMode: GameMode) {
    handleModeChange(newMode);
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="wordle-wrapper">
  <!-- Toast announcement -->
  {#if toastMessage}
    <div class="toast px" role="status" aria-live="assertive">
      {toastMessage}
    </div>
  {/if}

  <!-- Header / Controls Bar -->
  <header class="game-header">
    <div class="header-left">
      <h2 class="game-title">
        <span class="title-text">WORDLE</span>
        <span class="pixel-badge px">{mode === 'daily' ? (puzzleNumber ? `#${puzzleNumber}` : 'Daily') : 'Practice'}</span>
      </h2>
    </div>

    <!-- Mode Selector -->
    <div class="mode-tabs" role="tablist" aria-label="Game mode">
      <button
        type="button"
        role="tab"
        class="mode-btn px"
        class:active={mode === 'daily'}
        aria-selected={mode === 'daily'}
        onclick={() => handleModeChange('daily')}
      >
        Daily
      </button>
      <button
        type="button"
        role="tab"
        class="mode-btn px"
        class:active={mode === 'practice'}
        aria-selected={mode === 'practice'}
        onclick={() => handleModeChange('practice')}
      >
        Practice
      </button>
    </div>

    <!-- Action Icons -->
    <div class="header-actions">
      {#if mode === 'practice'}
        <button
          type="button"
          class="icon-btn px"
          title="New Practice Game"
          aria-label="New Practice Game"
          onclick={startPracticeGame}
        >
          🔄
        </button>
      {/if}

      <button
        type="button"
        class="icon-btn px"
        title={settings.soundEnabled ? 'Mute 8-bit sound' : 'Unmute 8-bit sound'}
        aria-label={settings.soundEnabled ? 'Mute sound' : 'Unmute sound'}
        onclick={() => handleUpdateSettings({ ...settings, soundEnabled: !settings.soundEnabled })}
      >
        {settings.soundEnabled ? '🔊' : '🔇'}
      </button>

      <button
        type="button"
        class="icon-btn px"
        title="How to play"
        aria-label="How to play"
        onclick={() => (helpOpen = true)}
      >
        ?
      </button>

      <button
        type="button"
        class="icon-btn px"
        title="Statistics"
        aria-label="Statistics"
        onclick={() => (statsOpen = true)}
      >
        📊
      </button>

      <button
        type="button"
        class="icon-btn px"
        title="Settings"
        aria-label="Settings"
        onclick={() => (settingsOpen = true)}
      >
        ⚙️
      </button>

      <a
        href="#wordle"
        target="_blank"
        rel="noopener noreferrer"
        class="icon-btn px popout-link"
        title="Open Wordle in separate browser tab"
        aria-label="Open Wordle in separate browser tab"
      >
        ↗
      </a>
    </div>
  </header>

  <!-- Frog Mascot (Bumpy) -->
  <div class="frog-bar">
    <WordleFrog mood={frogMood} message={frogMessage} />
  </div>

  <!-- Game Board Grid -->
  <main class="board-area">
    <WordleGrid
      {guesses}
      {currentGuess}
      target={targetWord}
      {isInvalidRow}
      {isWonRow}
      highContrast={settings.highContrast}
    />
  </main>

  <!-- Virtual Keyboard -->
  <footer class="keyboard-area">
    <WordleKeyboard
      statuses={keyboardStatuses}
      disabled={gameStatus !== 'IN_PROGRESS'}
      highContrast={settings.highContrast}
      onKey={handleLetter}
      onEnter={handleEnter}
      onDelete={handleDelete}
    />
  </footer>
</div>

<!-- Modals -->
<HelpModal open={helpOpen} onClose={() => (helpOpen = false)} />

<SettingsModal
  open={settingsOpen}
  {settings}
  {canToggleHardMode}
  onUpdateSettings={handleUpdateSettings}
  onClose={() => (settingsOpen = false)}
/>

<StatsModal
  open={statsOpen}
  {stats}
  {gameStatus}
  guessesCount={guesses.length}
  {targetWord}
  isDaily={mode === 'daily'}
  {shareCopied}
  onShare={handleShare}
  onPlayPractice={() => {
    statsOpen = false;
    startPracticeGame();
  }}
  onClose={() => (statsOpen = false)}
/>

<style>
  .wordle-wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
    padding: 8px 0 24px;
    gap: 16px;
  }

  .toast {
    position: fixed;
    top: 64px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--fg);
    color: var(--bg);
    font-size: 16px;
    font-weight: 700;
    padding: 10px 18px;
    z-index: 200;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    animation: toast-pop 0.15s ease-out;
    pointer-events: none;
  }

  .game-header {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 12px;
    border-bottom: 2px solid var(--field);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .game-title {
    margin: 0;
    font-size: 26px;
    display: flex;
    align-items: center;
    gap: 8px;
    letter-spacing: 1px;
  }

  .pixel-badge {
    font-size: 12px;
    padding: 3px 6px;
    background: var(--field);
    border: 1px solid var(--dim);
    color: var(--accent);
    font-weight: 700;
  }

  .mode-tabs {
    display: inline-flex;
    background: #111726;
    padding: 2px;
  }

  .mode-btn {
    border: 0;
    background: transparent;
    color: var(--muted);
    font-size: 14px;
    font-weight: 700;
    padding: 6px 12px;
    cursor: var(--cursor-pointer);
    transition: all 0.15s ease;
  }

  .mode-btn.active {
    background: var(--fg);
    color: var(--bg);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    background: var(--field);
    border: 1px solid var(--dim);
    color: var(--fg);
    font-size: 16px;
    cursor: var(--cursor-pointer);
    text-decoration: none;
    transition: background 0.15s ease, border-color 0.15s ease;
  }

  .icon-btn:hover {
    background: var(--field-focus);
    border-color: var(--accent);
    color: var(--accent);
  }

  .popout-link {
    font-size: 14px;
  }

  .frog-bar {
    display: flex;
    justify-content: center;
    margin: 0;
  }

  .board-area {
    width: 100%;
  }

  .keyboard-area {
    width: 100%;
    margin-top: 4px;
  }

  @keyframes toast-pop {
    0% {
      transform: translate(-50%, -10px) scale(0.9);
      opacity: 0;
    }
    100% {
      transform: translate(-50%, 0) scale(1);
      opacity: 1;
    }
  }

  @media (max-width: 540px) {
    .game-header {
      justify-content: center;
      gap: 10px;
    }
    .game-title {
      font-size: 22px;
    }
    .header-actions {
      gap: 4px;
    }
    .icon-btn {
      width: 32px;
      height: 32px;
      font-size: 14px;
    }
  }
</style>
