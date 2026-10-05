import { describe, expect, it } from 'vitest';
import { SONGS } from './songs';
import {
  beatsBefore,
  indexAtBeat,
  noteToFreq,
  notes,
  songBeats,
  songSeconds,
  trackBeats,
  validateSong,
  type Song,
} from './song';

describe('noteToFreq', () => {
  it('maps concert pitch and octaves', () => {
    expect(noteToFreq('A4')).toBeCloseTo(440, 6);
    expect(noteToFreq('A5')).toBeCloseTo(880, 6);
    expect(noteToFreq('A3')).toBeCloseTo(220, 6);
    expect(noteToFreq('C4')).toBeCloseTo(261.6256, 3);
  });

  it('handles accidentals', () => {
    expect(noteToFreq('F#3')).toBeCloseTo(noteToFreq('Gb3')!, 6);
    expect(noteToFreq('Bb2')).toBeCloseTo(noteToFreq('A#2')!, 6);
    expect(noteToFreq('C#4')! / noteToFreq('C4')!).toBeCloseTo(Math.pow(2, 1 / 12), 6);
  });

  it('applies transpose in semitones', () => {
    expect(noteToFreq('C4', -12)).toBeCloseTo(noteToFreq('C3')!, 6);
    expect(noteToFreq('C4', 7)).toBeCloseTo(noteToFreq('G4')!, 6);
  });

  it('returns null for rests and unknown pitches', () => {
    expect(noteToFreq('-')).toBeNull();
    expect(noteToFreq('H4')).toBeNull();
    expect(noteToFreq('C')).toBeNull();
    expect(noteToFreq('')).toBeNull();
  });
});

describe('notes authoring helper', () => {
  it('parses pitches, durations and rests', () => {
    expect(notes('C4/1 E4/0.5 -/2')).toEqual([
      { n: 'C4', d: 1 },
      { n: 'E4', d: 0.5 },
      { n: '-', d: 2 },
    ]);
  });

  it('defaults a missing duration to one beat', () => {
    expect(notes('C4 G4')).toEqual([
      { n: 'C4', d: 1 },
      { n: 'G4', d: 1 },
    ]);
  });
});

describe('timing helpers', () => {
  const song: Song = {
    id: 'timing',
    title: 'Timing',
    subtitle: '',
    bpm: 120,
    loop: false,
    tracks: [
      { wave: 'square', gain: 0.5, notes: notes('C4/1 D4/1 E4/2') },
      { wave: 'triangle', gain: 0.5, notes: notes('C3/2 G3/2') },
    ],
  };

  it('measures beats and seconds', () => {
    expect(trackBeats(song.tracks[0])).toBe(4);
    expect(songBeats(song)).toBe(4);
    expect(songSeconds(song)).toBe(2); // 4 beats at 120 BPM
  });

  it('reports beats before a note', () => {
    expect(beatsBefore(song.tracks[0], 0)).toBe(0);
    expect(beatsBefore(song.tracks[0], 2)).toBe(2);
    expect(beatsBefore(song.tracks[0], 99)).toBe(4);
  });

  it('seeks to the next clean attack instead of mid-note', () => {
    const track = song.tracks[0];
    expect(indexAtBeat(track, 0)).toBe(0);
    expect(indexAtBeat(track, 0.5)).toBe(1);
    expect(indexAtBeat(track, 1)).toBe(1);
    expect(indexAtBeat(track, 2)).toBe(2);
    expect(indexAtBeat(track, 4)).toBe(3);
  });
});

describe('validateSong', () => {
  it('accepts well-formed songs', () => {
    expect(validateSong(SONGS[0])).toEqual([]);
  });

  it('reports structural problems', () => {
    const broken: Song = {
      id: '',
      title: '',
      subtitle: '',
      bpm: 0,
      loop: true,
      tracks: [
        { wave: 'square', gain: 0, notes: notes('H9/0') },
        { wave: 'sine', gain: 0.5, notes: [] },
      ],
    };
    const errors = validateSong(broken);
    expect(errors).toEqual(
      expect.arrayContaining([
        'song id is required',
        expect.stringContaining('bpm must be greater than 0'),
        expect.stringContaining('gain must be within'),
        expect.stringContaining('has no notes'),
        expect.stringContaining('duration must be greater than 0'),
        expect.stringContaining('unknown pitch "H9"'),
      ])
    );
  });
});

describe('bundled songs', () => {
  it('are all valid', () => {
    for (const song of SONGS) expect(validateSong(song)).toEqual([]);
  });

  it('have unique ids and playable tempos', () => {
    const ids = SONGS.map((song) => song.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const song of SONGS) {
      expect(song.title.length).toBeGreaterThan(0);
      expect(song.bpm).toBeGreaterThanOrEqual(60);
      expect(song.bpm).toBeLessThanOrEqual(180);
      expect(song.loop).toBe(true);
    }
  });

  // Hand-written note data drifts easily; equal track lengths keep every voice
  // aligned on the loop boundary.
  it('keep every track the same length', () => {
    for (const song of SONGS) {
      const lengths = new Set(song.tracks.map((track) => trackBeats(track)));
      expect([...lengths]).toHaveLength(1);
    }
  });
});
