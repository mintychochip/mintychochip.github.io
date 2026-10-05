import { notes, type Song } from './song';

/**
 * Original chiptunes written for the anniversary vault. Everything here is
 * composed by hand as note data — no sampled or copyrighted material.
 */
export const SONGS: Song[] = [
  {
    id: 'anniversary-waltz',
    title: "Bumpy's Anniversary Waltz",
    subtitle: '3/4 waltz · 126 BPM · loops',
    bpm: 126,
    loop: true,
    tracks: [
      {
        wave: 'triangle',
        gain: 0.2,
        notes: notes(`
          C5/1 E5/1 G5/1  A5/1 G5/1 E5/1  F5/1 A5/1 C6/1  G5/3
          C5/1 E5/1 G5/1  A5/1 G5/1 E5/1  D5/1 F5/1 A5/1  G5/3
          E5/1 G5/1 C6/1  B5/1 G5/1 D5/1  C5/1 E5/1 G5/1  A5/1 B5/1 C6/1
          D6/1 B5/1 G5/1  A5/1 F5/1 D5/1  C5/3            -/3
        `),
      },
      {
        wave: 'square',
        gain: 0.07,
        notes: notes(`
          E4/1 G4/1 C5/1  E4/1 A4/1 C5/1  F4/1 A4/1 C5/1  D4/1 G4/1 B4/1
          E4/1 G4/1 C5/1  E4/1 A4/1 C5/1  F4/1 A4/1 C5/1  D4/1 G4/1 B4/1
          E4/1 G4/1 C5/1  D4/1 G4/1 B4/1  C4/1 E4/1 G4/1  F4/1 A4/1 C5/1
          G4/1 B4/1 D5/1  F4/1 A4/1 D5/1  C4/1 E4/1 G4/1  -/3
        `),
      },
      {
        wave: 'triangle',
        gain: 0.16,
        notes: notes(`
          C3/3 A2/3 F2/3 G2/3
          C3/3 A2/3 F2/3 G2/3
          C3/3 G2/3 C3/3 F2/3
          G2/3 D3/3 C3/3 -/3
        `),
      },
    ],
  },
  {
    id: 'pixel-love-theme',
    title: 'Pixel Love Theme',
    subtitle: '4/4 upbeat · 112 BPM · loops',
    bpm: 112,
    loop: true,
    tracks: [
      {
        wave: 'square',
        gain: 0.15,
        notes: notes(`
          G4/0.5 A4/0.5 B4/1 C5/1 D5/1  E5/2 D5/2  C5/1 B4/1 A4/1 G4/1  A4/4
          G4/0.5 A4/0.5 B4/1 C5/1 D5/1  E5/2 G5/2  F5/1 E5/1 D5/1 C5/1  D5/4
          E5/1 E5/1 D5/1 C5/1  D5/2 B4/2  C5/1 C5/1 B4/1 A4/1  B4/4
          G4/0.5 A4/0.5 B4/1 C5/1 D5/1  E5/2 G5/2  F5/1 D5/1 B4/1 G4/1  C5/4
        `),
      },
      {
        wave: 'triangle',
        gain: 0.06,
        notes: notes(`
          E4/1 G4/1 C5/1 E5/1  G4/1 B4/1 D5/1 G5/1  E4/1 A4/1 C5/1 E5/1  F4/1 A4/1 C5/1 F5/1
          E4/1 G4/1 C5/1 E5/1  G4/1 B4/1 D5/1 G5/1  F4/1 A4/1 C5/1 F5/1  G4/1 B4/1 D5/1 G5/1
          E4/1 G4/1 C5/1 E5/1  E4/1 A4/1 C5/1 E5/1  F4/1 A4/1 C5/1 F5/1  G4/1 B4/1 D5/1 G5/1
          E4/1 G4/1 C5/1 E5/1  G4/1 B4/1 D5/1 G5/1  F4/1 A4/1 C5/1 F5/1  C4/1 E4/1 G4/1 C5/1
        `),
      },
      {
        wave: 'triangle',
        gain: 0.15,
        notes: notes(`
          C3/2 G2/2 C3/2 G2/2  A2/2 E2/2 F2/2 G2/2
          C3/2 G2/2 C3/2 G2/2  F2/2 C3/2 G2/2 G2/2
          C3/2 G2/2 A2/2 E2/2  F2/2 C3/2 G2/2 G2/2
          C3/2 G2/2 C3/2 G2/2  F2/2 G2/2 C3/4
        `),
      },
    ],
  },
  {
    id: 'lilypad-lullaby',
    title: 'Lilypad Lullaby',
    subtitle: '4/4 gentle · 76 BPM · loops',
    bpm: 76,
    loop: true,
    tracks: [
      {
        wave: 'triangle',
        gain: 0.18,
        notes: notes(`
          E5/1.5 D5/0.5 C5/2  D5/1.5 E5/0.5 G5/2  A5/1.5 G5/0.5 E5/2  D5/4
          C5/1.5 D5/0.5 E5/2  G5/1.5 E5/0.5 D5/2  C5/1.5 B4/0.5 A4/2  C5/4
          E5/1.5 G5/0.5 A5/2  G5/1.5 E5/0.5 D5/2  C5/1.5 D5/0.5 E5/2  D5/4
          C5/1.5 B4/0.5 A4/2  G4/1.5 A4/0.5 B4/2  C5/2 E5/2             C5/4
        `),
      },
      {
        wave: 'triangle',
        gain: 0.05,
        notes: notes(`
          E4/1 G4/1 C5/1 G4/1  E4/1 A4/1 C5/1 A4/1  F4/1 A4/1 C5/1 A4/1  D4/1 G4/1 B4/1 G4/1
          E4/1 G4/1 C5/1 G4/1  E4/1 G4/1 C5/1 G4/1  F4/1 A4/1 C5/1 A4/1  E4/1 G4/1 C5/1 G4/1
          E4/1 A4/1 C5/1 A4/1  E4/1 G4/1 C5/1 G4/1  F4/1 A4/1 C5/1 A4/1  D4/1 G4/1 B4/1 G4/1
          F4/1 A4/1 C5/1 A4/1  D4/1 G4/1 B4/1 G4/1  C4/1 E4/1 G4/1 E4/1  C4/1 E4/1 G4/1 E4/1
        `),
      },
      {
        wave: 'sine',
        gain: 0.14,
        notes: notes(`
          C3/2 G2/2 A2/2 E2/2  F2/2 C3/2 G2/2 G2/2
          C3/2 G2/2 C3/2 G2/2  F2/2 C3/2 C3/2 C3/2
          A2/2 E2/2 C3/2 G2/2  F2/2 A2/2 G2/2 G2/2
          F2/2 C3/2 G2/2 D3/2  C3/2 G2/2 C3/2 C3/2
        `),
      },
    ],
  },
];
