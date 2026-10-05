// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChiptunePlayer } from './chiptune';
import { notes, type Song } from './song';

class FakeParam {
  value = 0;
  setValueAtTime(value: number): void {
    this.value = value;
  }
  linearRampToValueAtTime(value: number): void {
    this.value = value;
  }
  exponentialRampToValueAtTime(value: number): void {
    this.value = value;
  }
}

class FakeOscillator {
  type = 'sine';
  frequency = new FakeParam();
  started: number | null = null;
  stopped: number | null = null;
  onended: (() => void) | null = null;
  connect(): void {}
  start(at: number): void {
    this.started = at;
  }
  stop(at?: number): void {
    this.stopped = at ?? 0;
  }
}

class FakeGain {
  gain = new FakeParam();
  connect(): void {}
  disconnect(): void {}
}

class FakeAudioContext {
  currentTime = 0;
  state = 'running';
  destination = { name: 'destination' };
  oscillators: FakeOscillator[] = [];
  gains: FakeGain[] = [];

  createOscillator(): FakeOscillator {
    const osc = new FakeOscillator();
    this.oscillators.push(osc);
    return osc;
  }

  createGain(): FakeGain {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }

  resume(): Promise<void> {
    this.state = 'running';
    return Promise.resolve();
  }
}

type TestContext = FakeAudioContext & AudioContext;

/** The DOM AudioContext cannot be constructed under Node; the player touches only these members. */
function fakeContext(): TestContext {
  return new FakeAudioContext() as unknown as TestContext;
}

function makeSong(overrides: Partial<Song> = {}): Song {
  return {
    id: 'test',
    title: 'Test Tune',
    subtitle: '',
    bpm: 120, // one beat = 0.5s
    loop: true,
    tracks: [{ wave: 'square', gain: 0.5, notes: notes('C4/1 D4/1') }],
    ...overrides,
  };
}

const C4 = 261.6256;
const D4 = 293.6648;

describe('ChiptunePlayer', () => {
  let ctx: TestContext;
  let player: ChiptunePlayer;

  beforeEach(() => {
    vi.useFakeTimers();
    ctx = fakeContext();
    player = new ChiptunePlayer({ context: ctx, lookahead: 0.25, tickMs: 10 });
  });

  afterEach(() => {
    player.dispose();
    vi.useRealTimers();
  });

  it('starts stopped with no song', () => {
    expect(player.state).toBe('stopped');
    expect(player.duration).toBe(0);
    expect(player.position).toBe(0);
  });

  it('plays notes at the right clock times and frequencies', () => {
    player.load(makeSong());
    player.play();

    expect(player.state).toBe('playing');
    expect(ctx.oscillators).toHaveLength(1);
    expect(ctx.oscillators[0].started).toBeCloseTo(0, 6);
    expect(ctx.oscillators[0].frequency.value).toBeCloseTo(C4, 3);
    expect(ctx.oscillators[0].type).toBe('square');

    ctx.currentTime = 0.3;
    vi.advanceTimersByTime(10);
    expect(ctx.oscillators).toHaveLength(2);
    expect(ctx.oscillators[1].frequency.value).toBeCloseTo(D4, 3);
  });

  it('wraps a looping song onto the cycle boundary without drift', () => {
    player.load(makeSong());
    player.play();

    ctx.currentTime = 0.3;
    vi.advanceTimersByTime(10);
    ctx.currentTime = 0.8;
    vi.advanceTimersByTime(10);

    // The loop restart is C4 exactly one cycle (1s) after the song started.
    expect(ctx.oscillators).toHaveLength(3);
    expect(ctx.oscillators[2].started).toBeCloseTo(1, 6);
    expect(player.state).toBe('playing');
  });

  it('holds its position while paused and resumes from there', () => {
    player.load(makeSong());
    player.play();

    ctx.currentTime = 0.6;
    player.pause();
    expect(player.state).toBe('paused');
    expect(player.position).toBeCloseTo(0.6, 6);
    expect(ctx.oscillators[0].stopped).not.toBeNull();

    ctx.currentTime = 5; // the wall clock moves on while paused
    player.play();
    expect(player.position).toBeCloseTo(0.6, 6);

    // 0.6s into the cycle the D4 is still sounding, so the next attack is the
    // loop restart at 5.4s — 0.4s away, just outside the look-ahead window.
    ctx.currentTime = 5.2;
    vi.advanceTimersByTime(10);
    expect(ctx.oscillators.at(-1)!.started).toBeCloseTo(5.4, 6);
  });

  it('stops a non-looping song once it runs out', () => {
    player.load(makeSong({ loop: false }));
    player.play();

    ctx.currentTime = 0.3;
    vi.advanceTimersByTime(10);
    expect(ctx.oscillators).toHaveLength(2);

    ctx.currentTime = 1.1;
    vi.advanceTimersByTime(10);
    expect(player.state).toBe('stopped');
    expect(player.position).toBe(0);
  });

  it('seeks to the next clean attack instead of a mid-note start', () => {
    player.load(makeSong());
    player.play();

    ctx.currentTime = 0.6;
    player.seek(0.25);
    expect(player.position).toBeCloseTo(0.25, 6);
    // 0.25s lands inside the C4; playback resumes on the D4 attack at 0.85s.
    expect(ctx.oscillators.at(-1)!.frequency.value).toBeCloseTo(D4, 3);
    expect(ctx.oscillators.at(-1)!.started).toBeCloseTo(0.85, 6);
  });

  it('clamps seeks to the song bounds', () => {
    player.load(makeSong({ loop: false }));
    player.seek(99);
    expect(player.position).toBeCloseTo(1, 6);
    player.seek(-5);
    expect(player.position).toBeCloseTo(0, 6);
  });

  it('applies volume to the master gain', () => {
    player.setVolume(0.2);
    player.load(makeSong());
    player.play();
    expect(ctx.gains[0].gain.value).toBeCloseTo(0.2, 6);

    player.setVolume(4);
    expect(ctx.gains[0].gain.value).toBe(1);
  });

  it('toggles play and pause', () => {
    player.load(makeSong());
    player.toggle();
    expect(player.state).toBe('playing');
    player.toggle();
    expect(player.state).toBe('paused');
  });

  it('silences every queued voice on dispose', () => {
    player.load(makeSong());
    player.play();
    const voices = [...ctx.oscillators];

    player.dispose();
    expect(player.state).toBe('stopped');
    for (const osc of voices) expect(osc.stopped).not.toBeNull();
  });

  it('is inert when the browser has no audio at all', async () => {
    const silent = new ChiptunePlayer({ context: null });
    expect(silent.prepare()).toBeNull();
    silent.load(makeSong());
    silent.play();
    expect(silent.state).toBe('stopped');
    await expect(silent.tryResume()).resolves.toBe(false);
  });
});
