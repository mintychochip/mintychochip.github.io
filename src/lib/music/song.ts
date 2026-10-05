/**
 * Chiptune song format.
 *
 * Songs are plain data (JSON-serializable) so they can be authored by hand,
 * generated, or shipped as files. A song is a list of tracks; every track is a
 * monophonic note list on one oscillator waveform. Timing is in beats, so the
 * same song can be re-tempoed by changing `bpm` alone.
 */

export type Wave = 'square' | 'triangle' | 'sawtooth' | 'sine';

export interface Note {
  /** Scientific pitch name ("C4", "F#3", "Bb2") or `REST`. */
  n: string;
  /** Duration in beats, where 1 beat = a quarter note. */
  d: number;
}

export interface Track {
  wave: Wave;
  /** Peak gain of this voice, 0 < gain <= 1. */
  gain: number;
  /** Semitone offset applied to every note (e.g. -12 to drop an octave). */
  transpose?: number;
  notes: Note[];
}

export interface Song {
  id: string;
  title: string;
  subtitle: string;
  bpm: number;
  loop: boolean;
  tracks: Track[];
}

export const REST = '-';

const SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NOTE_RE = /^([A-Ga-g])([#b]?)(-?\d)$/;

export function isRest(name: string): boolean {
  return name.trim() === REST;
}

/** Scientific pitch name to frequency in Hz. Rests and junk return null. */
export function noteToFreq(name: string, transpose = 0): number | null {
  if (isRest(name)) return null;
  const match = NOTE_RE.exec(name.trim());
  if (!match) return null;
  const letter = match[1].toUpperCase();
  const accidental = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0;
  const midi = (Number(match[3]) + 1) * 12 + SEMITONES[letter] + accidental + transpose;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Compact authoring helper: `notes('C4/1 E4/0.5 -/2')`. */
export function notes(spec: string): Note[] {
  return spec
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      const [name, duration] = token.split('/');
      return { n: name, d: duration === undefined ? 1 : Number(duration) };
    });
}

export function beatSeconds(bpm: number): number {
  return 60 / bpm;
}

export function trackBeats(track: Track): number {
  return track.notes.reduce((sum, note) => sum + note.d, 0);
}

/** Length of one pass of the song, in beats (longest track wins). */
export function songBeats(song: Song): number {
  return song.tracks.reduce((max, track) => Math.max(max, trackBeats(track)), 0);
}

export function songSeconds(song: Song): number {
  return songBeats(song) * beatSeconds(song.bpm);
}

/** Beats that elapse before `index` starts playing. */
export function beatsBefore(track: Track, index: number): number {
  let acc = 0;
  for (let i = 0; i < index && i < track.notes.length; i++) acc += track.notes[i].d;
  return acc;
}

/**
 * First note index that starts at or after `beats`.
 *
 * Used when seeking: a note already in progress is skipped rather than started
 * mid-way, so resuming always lands on a clean attack.
 */
export function indexAtBeat(track: Track, beats: number): number {
  let acc = 0;
  let index = 0;
  while (index < track.notes.length && acc < beats) {
    acc += track.notes[index].d;
    index++;
  }
  return index;
}

/** Structural problems with a song, as human-readable messages. */
export function validateSong(song: Song): string[] {
  const errors: string[] = [];
  const label = song.id || '(untitled song)';
  if (!song.id) errors.push('song id is required');
  if (!(song.bpm > 0)) errors.push(`${label}: bpm must be greater than 0`);
  if (song.tracks.length === 0) errors.push(`${label}: needs at least one track`);

  song.tracks.forEach((track, trackIndex) => {
    const where = `${label} track ${trackIndex}`;
    if (!(track.gain > 0 && track.gain <= 1)) errors.push(`${where}: gain must be within (0, 1]`);
    if (track.notes.length === 0) errors.push(`${where}: has no notes`);
    track.notes.forEach((note, noteIndex) => {
      if (!(note.d > 0)) errors.push(`${where} note ${noteIndex}: duration must be greater than 0`);
      if (!isRest(note.n) && noteToFreq(note.n) === null) {
        errors.push(`${where} note ${noteIndex}: unknown pitch "${note.n}"`);
      }
    });
  });

  return errors;
}
