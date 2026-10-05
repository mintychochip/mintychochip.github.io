import { getAudioContext } from './audio-context';
import {
  beatSeconds,
  beatsBefore,
  indexAtBeat,
  noteToFreq,
  songBeats,
  songSeconds,
  type Note,
  type Song,
  type Track,
} from './song';

export type PlaybackState = 'stopped' | 'playing' | 'paused';

export interface ChiptunePlayerOptions {
  /** Injected in tests; defaults to the site-wide AudioContext. */
  context?: AudioContext | null;
  volume?: number;
  onStateChange?: (state: PlaybackState) => void;
  onPosition?: (seconds: number) => void;
  /** Seconds of audio scheduled ahead of the audio clock. */
  lookahead?: number;
  /** Scheduler wake-up interval in milliseconds. */
  tickMs?: number;
}

interface Voice {
  osc: OscillatorNode;
  gain: GainNode;
}

interface TrackCursor {
  track: Track;
  index: number;
  cycle: number;
  /** Audio-clock time the next note starts at. */
  at: number;
  done: boolean;
}

const DEFAULT_LOOKAHEAD = 0.25;
const DEFAULT_TICK_MS = 25;
const MIN_NOTE_SECONDS = 0.05;

/**
 * Streams a {@link Song} to the Web Audio clock.
 *
 * Notes are scheduled a short look-ahead at a time rather than all at once, so
 * a loop can run forever without allocating an unbounded number of nodes, and
 * pausing/seek only has to cancel the handful of voices already queued.
 */
export class ChiptunePlayer {
  #context: AudioContext | null;
  #master: GainNode | null = null;
  #song: Song | null = null;
  #cursors: TrackCursor[] = [];
  #voices = new Set<Voice>();
  #timer: ReturnType<typeof setInterval> | null = null;
  #state: PlaybackState = 'stopped';
  /** Audio-clock time the current run started at, already adjusted for seeks. */
  #startedAt = 0;
  /** Seconds already played before `#startedAt`. */
  #offset = 0;
  #volume: number;
  #lookahead: number;
  #tickMs: number;
  #onStateChange: ((state: PlaybackState) => void) | undefined;
  #onPosition: ((seconds: number) => void) | undefined;

  constructor(options: ChiptunePlayerOptions = {}) {
    this.#context = options.context ?? null;
    this.#volume = options.volume ?? 0.55;
    this.#lookahead = options.lookahead ?? DEFAULT_LOOKAHEAD;
    this.#tickMs = options.tickMs ?? DEFAULT_TICK_MS;
    this.#onStateChange = options.onStateChange;
    this.#onPosition = options.onPosition;
  }

  get state(): PlaybackState {
    return this.#state;
  }

  get song(): Song | null {
    return this.#song;
  }

  get duration(): number {
    return this.#song ? songSeconds(this.#song) : 0;
  }

  /** Playhead in seconds; wraps inside a looping song. */
  get position(): number {
    const song = this.#song;
    if (!song || this.#state !== 'playing' || !this.#context) return this.#offset;
    const elapsed = this.#context.currentTime - this.#startedAt;
    const total = this.duration;
    if (song.loop && total > 0) return ((elapsed % total) + total) % total;
    return Math.min(Math.max(elapsed, 0), total);
  }

  get running(): boolean {
    return this.#context?.state === 'running';
  }

  /** Ensure a context and master gain exist, creating them on first use. */
  prepare(): AudioContext | null {
    if (!this.#context) this.#context = getAudioContext();
    if (!this.#context) return null;
    if (!this.#master) {
      this.#master = this.#context.createGain();
      this.#master.gain.value = this.#volume;
      this.#master.connect(this.#context.destination);
    }
    return this.#context;
  }

  /** Wake the shared AudioContext; safe to call from any user gesture. */
  resume(): void {
    const ctx = this.prepare();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  /** Await the context actually reaching `running` (browser autoplay policy). */
  async tryResume(): Promise<boolean> {
    const ctx = this.prepare();
    if (!ctx) return false;
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        return false;
      }
    }
    return ctx.state === 'running';
  }

  load(song: Song): void {
    this.stop();
    this.#song = song;
    this.#onPosition?.(0);
  }

  play(): void {
    const song = this.#song;
    if (!song || this.#state === 'playing') return;
    const ctx = this.prepare();
    if (!ctx) return;

    this.resume();
    this.#startedAt = ctx.currentTime - this.#offset;
    this.#buildCursors(this.#offset);
    this.#setState('playing');
    this.#tick();
    this.#timer = setInterval(() => this.#tick(), this.#tickMs);
  }

  pause(): void {
    if (this.#state !== 'playing') return;
    this.#offset = this.position;
    this.#silence();
    this.#setState('paused');
    this.#onPosition?.(this.#offset);
  }

  stop(): void {
    this.#silence();
    this.#cursors = [];
    this.#offset = 0;
    this.#setState('stopped');
    this.#onPosition?.(0);
  }

  toggle(): void {
    if (this.#state === 'playing') this.pause();
    else this.play();
  }

  seek(seconds: number): void {
    const song = this.#song;
    if (!song) return;
    const target = Math.min(Math.max(seconds, 0), this.duration);
    const wasPlaying = this.#state === 'playing';
    this.#silence();
    this.#offset = target;
    this.#setState('paused');
    if (wasPlaying) this.play();
    else this.#onPosition?.(target);
  }

  setVolume(volume: number): void {
    this.#volume = Math.min(Math.max(volume, 0), 1);
    if (this.#master) this.#master.gain.value = this.#volume;
  }

  dispose(): void {
    this.#silence();
    this.#cursors = [];
    this.#master?.disconnect();
    this.#master = null;
    this.#context = null;
    this.#setState('stopped');
  }

  #setState(state: PlaybackState): void {
    if (this.#state === state) return;
    this.#state = state;
    this.#onStateChange?.(state);
  }

  /** Drop every queued voice and stop the scheduler. */
  #silence(): void {
    if (this.#timer !== null) {
      clearInterval(this.#timer);
      this.#timer = null;
    }
    for (const voice of this.#voices) {
      try {
        voice.osc.stop();
      } catch {
        // Already stopped by its scheduled end time.
      }
      voice.gain.disconnect();
    }
    this.#voices.clear();
  }

  /**
   * Point every track at the note that starts at or after `offsetSeconds`.
   *
   * Seeking never starts a note mid-way: the note in progress is skipped so
   * playback always resumes on a clean attack.
   */
  #buildCursors(offsetSeconds: number): void {
    const song = this.#song;
    if (!song) {
      this.#cursors = [];
      return;
    }
    const beatSec = beatSeconds(song.bpm);
    const cycleBeats = songBeats(song);
    const playedBeats = beatSec > 0 ? offsetSeconds / beatSec : 0;

    this.#cursors = song.tracks.map((track) => {
      const cycle = song.loop && cycleBeats > 0 ? Math.floor(playedBeats / cycleBeats) : 0;
      const withinCycle = playedBeats - cycle * cycleBeats;
      const index = indexAtBeat(track, withinCycle);
      return {
        track,
        index,
        cycle,
        at: this.#startedAt + cycle * cycleBeats * beatSec + beatsBefore(track, index) * beatSec,
        done: !song.loop && index >= track.notes.length,
      };
    });
  }

  #tick(): void {
    const ctx = this.#context;
    const song = this.#song;
    if (!ctx || !song || this.#state !== 'playing') return;

    const beatSec = beatSeconds(song.bpm);
    const cycleSec = songBeats(song) * beatSec;
    const horizon = ctx.currentTime + this.#lookahead;

    for (const cursor of this.#cursors) {
      if (cursor.done) continue;
      while (cursor.at <= horizon) {
        if (cursor.index >= cursor.track.notes.length) {
          if (!song.loop) {
            cursor.done = true;
            break;
          }
          // Looping tracks restart on the song's cycle boundary, so shorter
          // tracks wait out their trailing rest instead of drifting ahead.
          cursor.cycle += 1;
          cursor.index = 0;
          cursor.at = this.#startedAt + cursor.cycle * cycleSec;
          continue;
        }
        const note = cursor.track.notes[cursor.index];
        this.#scheduleNote(cursor.track, note, cursor.at, beatSec);
        cursor.at += Math.max(note.d * beatSec, 0.001);
        cursor.index += 1;
      }
    }

    if (this.#cursors.every((cursor) => cursor.done) && ctx.currentTime >= this.#startedAt + this.duration) {
      this.stop();
      return;
    }
    this.#onPosition?.(this.position);
  }

  #scheduleNote(track: Track, note: Note, at: number, beatSec: number): void {
    const ctx = this.#context;
    const master = this.#master;
    if (!ctx || !master) return;
    const freq = noteToFreq(note.n, track.transpose ?? 0);
    if (freq === null) return;

    const length = Math.max(note.d * beatSec, MIN_NOTE_SECONDS);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = track.wave;
    osc.frequency.setValueAtTime(freq, at);

    // Near-instant attack, exponential tail: a chiptune blip, never a click.
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(track.gain, at + Math.min(0.012, length / 2));
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);

    osc.connect(gain);
    gain.connect(master);
    osc.start(at);
    osc.stop(at + length + 0.02);

    const voice: Voice = { osc, gain };
    this.#voices.add(voice);
    osc.onended = () => {
      this.#voices.delete(voice);
      gain.disconnect();
    };
  }
}
