import type { TileStatus } from './game';
import { getAudioContext } from '../music/audio-context';

/** Short beep for typing letters */
export function playKeyPress(enabled: boolean): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(640, now);
  osc.frequency.exponentialRampToValueAtTime(780, now + 0.03);

  gain.gain.setValueAtTime(0.06, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.035);
}

/** Low click for backspace/delete */
export function playDelete(enabled: boolean): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(180, now + 0.04);

  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.045);
}

/** Staggered pitch reveal per tile */
export function playRevealTile(enabled: boolean, index: number, status: TileStatus): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const baseFreq = 340 + index * 75;

  if (status === 'correct') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq * 1.35, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.12);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  } else if (status === 'present') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 1.1, now);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  } else {
    // Absent: low wooden click
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.05);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }
}

/** Invalid word buzz */
export function playInvalid(enabled: boolean): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'sawtooth';
  osc2.type = 'sawtooth';
  osc1.frequency.setValueAtTime(140, now);
  osc2.frequency.setValueAtTime(145, now); // slight detune for classic retro buzz

  gain.gain.setValueAtTime(0.1, now);
  gain.gain.setValueAtTime(0.1, now + 0.06);
  gain.gain.setValueAtTime(0.01, now + 0.08);
  gain.gain.setValueAtTime(0.1, now + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.2);
  osc2.stop(now + 0.2);
}

/** Triumphant 8-bit fanfare arpeggio */
export function playWin(enabled: boolean): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  const noteDuration = 0.09;
  const startTime = ctx.currentTime + 0.05;

  notes.forEach((freq, idx) => {
    const noteStart = startTime + idx * noteDuration;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, noteStart);

    gain.gain.setValueAtTime(0.09, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.001, noteStart + (idx === notes.length - 1 ? 0.35 : noteDuration));

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(noteStart);
    osc.stop(noteStart + (idx === notes.length - 1 ? 0.4 : noteDuration));
  });
}

/** Game lost cadence */
export function playLoss(enabled: boolean): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [392.0, 349.23, 311.13, 261.63]; // G4, F4, Eb4, C4
  const noteDuration = 0.16;
  const startTime = ctx.currentTime + 0.05;

  notes.forEach((freq, idx) => {
    const noteStart = startTime + idx * noteDuration;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, noteStart);

    gain.gain.setValueAtTime(0.09, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDuration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(noteStart);
    osc.stop(noteStart + noteDuration + 0.02);
  });
}

/** Secret vault unlocked 8-bit discovery chime */
export function playSecretUnlock(enabled = true): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  // G4, C5, E5, G5, C6 in rapid ascending glissando
  const notes = [392.0, 523.25, 659.25, 783.99, 1046.5, 1318.5];
  const startTime = ctx.currentTime + 0.02;

  notes.forEach((freq, idx) => {
    const noteStart = startTime + idx * 0.06;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, noteStart);

    gain.gain.setValueAtTime(0.1, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(noteStart);
    osc.stop(noteStart + 0.28);
  });
}

/** Fun 8-bit frog croak */
export function playFrogCroak(enabled = true): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(160, now);
  osc.frequency.linearRampToValueAtTime(110, now + 0.12);

  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.16);
}

/** Romantic 8-bit love serenade melody */
export function playLoveSerenade(enabled = true): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  // C5, E5, G5, B5, C6, E6 sweet romantic arpeggio
  const notes = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.51];
  const startTime = ctx.currentTime + 0.03;

  notes.forEach((freq, idx) => {
    const noteStart = startTime + idx * 0.11;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, noteStart);

    gain.gain.setValueAtTime(0.1, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(noteStart);
    osc.stop(noteStart + 0.38);
  });
}

/** Sparkling heart chime */
export function playHeartChime(enabled = true): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [880.0, 1174.66, 1567.98, 1760.0];
  const startTime = ctx.currentTime + 0.01;

  notes.forEach((freq, idx) => {
    const noteStart = startTime + idx * 0.07;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, noteStart);

    gain.gain.setValueAtTime(0.08, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(noteStart);
    osc.stop(noteStart + 0.24);
  });
}

/** Cute duet croak between green Bumpy and pink girlfriend frog */
export function playDuetCroak(enabled = true): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Bumpy's deep croak
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(160, now);
  osc1.frequency.linearRampToValueAtTime(110, now + 0.12);
  gain1.gain.setValueAtTime(0.12, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.16);

  // Pink girlfriend frog's cute higher-pitched reply
  const replyTime = now + 0.18;
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(280, replyTime);
  osc2.frequency.linearRampToValueAtTime(220, replyTime + 0.14);
  gain2.gain.setValueAtTime(0.14, replyTime);
  gain2.gain.exponentialRampToValueAtTime(0.001, replyTime + 0.18);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(replyTime);
  osc2.stop(replyTime + 0.2);
}

