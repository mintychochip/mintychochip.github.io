<script lang="ts">
  import { onMount } from 'svelte';
  import { ChiptunePlayer, type PlaybackState } from '../music/chiptune';
  import { songSeconds } from '../music/song';
  import { SONGS } from '../music/songs';
  import PixelArt from '../secret/PixelArt.svelte';
  import { NEXT, PAUSE, PLAY, PREVIOUS, VOLUME } from '../secret/pixel-art';

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
    // The bar is fixed over the bottom of the window; the page's own end keeps clear of it.
    document.body.classList.add('has-music-bar');

    return () => {
      detachGesture();
      document.body.classList.remove('has-music-bar');
      instance.dispose();
      player = null;
    };
  });

  $effect(() => {
    player?.setVolume(volumePercent / 100);
  });
</script>

<aside class="vault-player" aria-label="Music">
  <div class="vp-eq" class:on={playback === 'playing'} aria-hidden="true">
    {#each { length: 4 } as _, i (i)}
      <span class="vp-bar" style:--i={i}></span>
    {/each}
  </div>

  <div class="vp-controls">
    <button type="button" class="vp-btn px" onclick={() => selectTrack(trackIndex - 1)} aria-label="Previous song">
      <PixelArt sprite={PREVIOUS} px={2} />
    </button>
    <button
      type="button"
      class="vp-btn vp-play px"
      onclick={togglePlayback}
      aria-label={playback === 'playing' ? 'Pause music' : 'Play music'}
    >
      <PixelArt sprite={playback === 'playing' ? PAUSE : PLAY} px={2} />
    </button>
    <button type="button" class="vp-btn px" onclick={() => selectTrack(trackIndex + 1)} aria-label="Next song">
      <PixelArt sprite={NEXT} px={2} />
    </button>
  </div>

  <div class="vp-meta">
    <span class="vp-title">{song.title}</span>
    <!-- Until the browser lets music start, the subtitle line asks for a tap instead of floating a hint over the page. -->
    <span class="vp-sub" class:nudge={needsTap}>{needsTap ? 'Play our songs' : song.subtitle}</span>
  </div>

  <button
    type="button"
    class="vp-track"
    bind:this={progressEl}
    onclick={handleSeek}
    aria-label="Seek within {song.title}"
  >
    <span class="vp-track-fill" style:width="{progressPercent}%"></span>
  </button>

  <span class="vp-time">{formatTime(position)} / {formatTime(duration)}</span>

  <label class="vp-volume">
    <PixelArt sprite={VOLUME} px={2} />
    <input class="vp-range" type="range" min="0" max="100" step="1" bind:value={volumePercent} aria-label="Music volume" />
  </label>

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
    gap: 14px;
    height: 76px;
    padding-inline: max(12px, calc((100% - var(--width)) / 2));
    background: var(--bg);
    border-top: 1px solid rgba(104, 113, 132, 0.28);
  }

  /* Four pixel bars that bounce in pond-clock steps while a song plays. */
  .vp-eq {
    display: flex;
    align-items: flex-end;
    gap: 3px;
    height: 24px;
  }

  .vp-bar {
    width: 6px;
    height: 6px;
    background: var(--love);
  }

  /* Flat while silent. */
  .vp-eq.on .vp-bar {
    animation: vp-level 0.66s steps(4, end) infinite alternate;
    animation-delay: calc(var(--i) * -0.25s);
  }

  @keyframes vp-level {
    from {
      height: 6px;
    }
    to {
      height: 24px;
    }
  }

  .vp-controls {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .vp-btn {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    padding: 0;
    border: 0;
    background: var(--field);
    color: var(--fg);
    cursor: var(--cursor-pointer);
    transition: background 0.15s ease, color 0.15s ease;
  }

  .vp-btn:hover,
  .vp-btn:focus-visible {
    background: var(--field-focus);
    color: var(--love);
  }

  .vp-play {
    width: 46px;
    height: 46px;
    background: var(--fg);
    color: var(--bg);
  }

  .vp-play:hover,
  .vp-play:focus-visible {
    background: var(--love);
    color: var(--bg);
  }

  .vp-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    max-width: 240px;
  }

  .vp-title {
    overflow: hidden;
    font-family: var(--font);
    font-size: 16px;
    font-weight: 700;
    line-height: 1.2;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .vp-sub {
    overflow: hidden;
    font-size: 12px;
    color: var(--muted);
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .vp-track {
    position: relative;
    flex: 1 1 auto;
    min-width: 60px;
    height: 9px;
    padding: 0;
    border: 0;
    background: var(--field-focus);
    cursor: var(--cursor-pointer);
  }

  .vp-track:focus-visible {
    outline-offset: 4px;
  }

  .vp-track-fill {
    position: absolute;
    inset: 0 auto 0 0;
    background: var(--love);
  }

  .vp-time {
    font-size: 13px;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .vp-volume {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--muted);
  }

  .vp-range {
    width: 92px;
    accent-color: var(--love);
    cursor: var(--cursor-pointer);
  }

  .vp-sub.nudge {
    color: var(--love);
    font-weight: 700;
  }

  :global(body.has-music-bar) {
    padding-bottom: 76px;
  }

  @media (max-width: 720px) {
    :global(body.has-music-bar) {
      padding-bottom: 62px;
    }

    .vault-player {
      height: 62px;
      flex-wrap: wrap;
      align-content: center;
      gap: 6px 10px;
    }

    .vp-eq,
    .vp-sub:not(.nudge),
    .vp-volume {
      display: none;
    }

    /* Two rows: transport, title and clock, then the full-width progress bar. The title gives way first. */
    .vp-meta {
      flex: 1 1 0;
      max-width: none;
    }

    .vp-title {
      font-size: 15px;
    }

    .vp-time {
      order: 2;
      font-size: 12px;
    }

    .vp-track {
      order: 3;
      flex: 1 0 100%;
      min-width: 0;
      height: 6px;
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

  @media (prefers-reduced-motion: reduce) {
    .vp-eq.on .vp-bar {
      animation: none;
    }
  }
</style>
