<script lang="ts">
  import { onMount } from 'svelte';
  import { ChiptunePlayer, type PlaybackState } from '../music/chiptune';
  import { songSeconds } from '../music/song';
  import { SONGS } from '../music/songs';

  let player: ChiptunePlayer | null = $state(null);
  let progressEl: HTMLButtonElement | null = $state(null);
  let trackIndex = $state(0);
  let playback: PlaybackState = $state('stopped');
  let position = $state(0);
  let volumePercent = $state(55);
  /** Autoplay was refused by the browser; the first gesture starts the music. */
  let needsTap = $state(false);

  const song = $derived(SONGS[trackIndex]);
  const duration = $derived(songSeconds(song));
  const progressPercent = $derived(duration > 0 ? Math.min((position / duration) * 100, 100) : 0);

  function formatTime(seconds: number): string {
    const total = Math.max(0, Math.floor(seconds));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }

  async function startMusic(): Promise<void> {
    if (!player) return;
    player.resume();
    if (!(await player.tryResume())) {
      needsTap = true;
      return;
    }
    needsTap = false;
    detachGesture();
    player.play();
  }

  function handleGesture(event: Event): void {
    if (!needsTap) return;
    // Clicks on the player itself are handled by its own controls; only an
    // unrelated gesture should kick the music off.
    const target = event.target;
    if (target instanceof Element && target.closest('.vault-player')) return;
    void startMusic();
  }

  function attachGesture(): void {
    window.addEventListener('pointerdown', handleGesture);
    window.addEventListener('keydown', handleGesture);
  }

  function detachGesture(): void {
    window.removeEventListener('pointerdown', handleGesture);
    window.removeEventListener('keydown', handleGesture);
  }

  function selectTrack(next: number): void {
    if (!player) return;
    const wasPlaying = playback === 'playing';
    trackIndex = ((next % SONGS.length) + SONGS.length) % SONGS.length;
    player.load(SONGS[trackIndex]);
    position = 0;
    if (wasPlaying) void startMusic();
  }

  function togglePlayback(): void {
    if (!player) return;
    if (playback === 'playing') player.pause();
    else void startMusic();
  }

  function handleSeek(event: MouseEvent): void {
    if (!player || !progressEl || duration <= 0) return;
    const rect = progressEl.getBoundingClientRect();
    const ratio = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0;
    player.seek(Math.min(Math.max(ratio, 0), 1) * duration);
  }

  onMount(() => {
    const instance = new ChiptunePlayer({
      onStateChange: (next) => (playback = next),
      onPosition: (seconds) => (position = seconds),
    });
    player = instance;
    instance.setVolume(volumePercent / 100);
    instance.load(SONGS[trackIndex]);
    // Autoplay only if audio is already unlocked (e.g. the vault was opened by a
    // click that created the shared context). Otherwise wait for a real gesture.
    if (instance.running) instance.play();
    else needsTap = true;
    attachGesture();

    return () => {
      detachGesture();
      instance.dispose();
      player = null;
    };
  });

  $effect(() => {
    player?.setVolume(volumePercent / 100);
  });
</script>

<aside class="vault-player px" aria-label="Vault chiptune player">
  <div class="vp-eq" class:on={playback === 'playing'} aria-hidden="true">
    {#each Array(5) as _, i}
      <span class="vp-bar" style:--i={i}></span>
    {/each}
  </div>

  <div class="vp-controls">
    <button
      type="button"
      class="vp-btn px"
      onclick={() => selectTrack(trackIndex - 1)}
      aria-label="Previous song"
    >
      ⏮
    </button>
    <button
      type="button"
      class="vp-btn px vp-play"
      onclick={togglePlayback}
      aria-label={playback === 'playing' ? 'Pause music' : 'Play music'}
    >
      {playback === 'playing' ? '⏸' : '▶'}
    </button>
    <button
      type="button"
      class="vp-btn px"
      onclick={() => selectTrack(trackIndex + 1)}
      aria-label="Next song"
    >
      ⏭
    </button>
  </div>

  <div class="vp-meta">
    <span class="vp-title">{song.title}</span>
    <span class="vp-sub">{song.subtitle}</span>
  </div>

  <button
    type="button"
    class="vp-track"
    bind:this={progressEl}
    onclick={handleSeek}
    aria-label="Seek within {song.title}"
  >
    <span class="vp-track-fill" style:width="{progressPercent}%"></span>
    <span class="vp-track-head" style:left="{progressPercent}%"></span>
  </button>

  <span class="vp-time">{formatTime(position)} / {formatTime(duration)}</span>

  <label class="vp-volume">
    <span aria-hidden="true">🔊</span>
    <input
      class="vp-range"
      type="range"
      min="0"
      max="100"
      step="1"
      bind:value={volumePercent}
      aria-label="Music volume"
    />
  </label>

  {#if needsTap}
    <span class="vp-hint px">Tap ▶ for music 🎶</span>
  {/if}
</aside>

<style>
  .vault-player {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 120;
    display: flex;
    align-items: center;
    gap: 12px;
    height: var(--vp-bar-h, 76px);
    padding-inline: max(12px, calc((100% - var(--width)) / 2));
    background: rgba(9, 13, 22, 0.94);
    border-top: 2px solid #f48cb8;
    box-shadow: 0 -8px 26px rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(6px);
  }

  /* Equalizer bars: animated only while music is playing. */
  .vp-eq {
    display: flex;
    align-items: flex-end;
    gap: 3px;
    height: 26px;
  }

  .vp-bar {
    width: 5px;
    height: 30%;
    background: #8bbf73;
    animation: vp-bounce 0.55s ease-in-out infinite alternate;
    animation-delay: calc(var(--i) * 90ms);
    animation-play-state: paused;
  }

  .vp-eq.on .vp-bar {
    animation-play-state: running;
  }

  @keyframes vp-bounce {
    from {
      height: 20%;
    }
    to {
      height: 100%;
    }
  }

  .vp-controls {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .vp-btn {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    font-size: 15px;
    line-height: 1;
    background: #0e1320;
    border: 1px solid var(--dim);
    color: var(--fg);
    cursor: var(--cursor-pointer);
    transition: all 0.15s ease;
  }

  .vp-btn:hover {
    background: var(--field-focus);
    border-color: #f48cb8;
    color: #ffe8f3;
  }

  .vp-play {
    width: 46px;
    height: 46px;
    font-size: 18px;
    background: #251329;
    border-color: #d65a8f;
    color: #ff94c2;
  }

  .vp-play:hover {
    background: #d65a8f;
    color: #ffffff;
  }

  .vp-meta {
    display: flex;
    flex-direction: column;
    min-width: 0;
    max-width: 240px;
  }

  .vp-title {
    font-size: 14px;
    font-weight: 700;
    color: #ffd9ea;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .vp-sub {
    font-size: 11px;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .vp-track {
    position: relative;
    flex: 1 1 auto;
    height: 12px;
    min-width: 60px;
    padding: 0;
    background: #1b2334;
    border: 1px solid var(--dim);
    cursor: var(--cursor-pointer);
  }

  .vp-track-fill {
    position: absolute;
    inset: 0 auto 0 0;
    background: linear-gradient(90deg, #8bbf73, #f48cb8);
  }

  .vp-track-head {
    position: absolute;
    top: -3px;
    width: 3px;
    height: 16px;
    background: #ffe8f3;
    transform: translateX(-1px);
  }

  .vp-time {
    font-size: 12px;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .vp-volume {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
  }

  .vp-range {
    width: 92px;
    accent-color: #f48cb8;
    cursor: var(--cursor-pointer);
  }

  .vp-hint {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 700;
    color: #ffe8f3;
    background: #251329;
    border: 1px solid #d65a8f;
    white-space: nowrap;
  }

  @media (max-width: 720px) {
    .vault-player {
      flex-wrap: wrap;
      align-content: center;
      gap: 4px 8px;
    }

    .vp-eq,
    .vp-sub,
    .vp-volume {
      display: none;
    }

    /* Two rows: transport + title + clock, then the full-width progress bar. */
    .vp-controls {
      order: 0;
    }

    .vp-meta {
      order: 1;
      flex: 1 1 auto;
      max-width: none;
    }

    .vp-title {
      font-size: 13px;
    }

    .vp-time {
      order: 2;
      font-size: 11px;
    }

    .vp-track {
      order: 3;
      flex: 1 0 100%;
      min-width: 0;
    }

    .vp-btn {
      width: 32px;
      height: 32px;
    }

    .vp-play {
      width: 38px;
      height: 38px;
    }
  }
</style>
