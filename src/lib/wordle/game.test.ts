import { describe, expect, it } from 'vitest';
import {
  checkHardModeViolation,
  evaluateGuess,
  generateShareText,
  getKeyboardStatuses,
  isConsecutiveDay,
  recordGameEnd,
  DEFAULT_STATS,
} from './game';

describe('Wordle game logic', () => {
  describe('evaluateGuess', () => {
    it('evaluates completely correct guess', () => {
      const res = evaluateGuess('CRANE', 'CRANE');
      expect(res).toEqual(['correct', 'correct', 'correct', 'correct', 'correct']);
    });

    it('evaluates completely absent guess', () => {
      const res = evaluateGuess('PLUMB', 'FIGHT');
      expect(res).toEqual(['absent', 'absent', 'absent', 'absent', 'absent']);
    });

    it('evaluates mixed positions', () => {
      const res = evaluateGuess('REACT', 'CRANE');
      // R: present (pos 0 vs 1)
      // E: present (pos 1 vs 4)
      // A: correct (pos 2 vs 2)
      // C: present (pos 3 vs 0)
      // T: absent
      expect(res).toEqual(['present', 'present', 'correct', 'present', 'absent']);
    });

    it('handles duplicate letters correctly when target has fewer occurrences', () => {
      // Target: SPEED (one E? No, SPEED has two E's).
      // Let target be ERASE (has two E's: pos 0 and 4).
      // Guess: ENTER (two E's: pos 0 and 3).
      // pos 0: E === E -> correct
      // pos 3: E in ERASE? Yes, ERASE has one more E at pos 4 -> present
      expect(evaluateGuess('ENTER', 'ERASE')).toEqual([
        'correct',
        'absent',
        'absent',
        'present',
        'present',
      ]);

      // Target: WATER (one E at pos 3).
      // Guess: GEESE (three E's at pos 1, 2, 4).
      // None of the E's match pos 3.
      // First E at pos 1 gets 'present', others get 'absent'.
      expect(evaluateGuess('GEESE', 'WATER')).toEqual([
        'absent',
        'present',
        'absent',
        'absent',
        'absent',
      ]);

      // Exact match takes precedence over earlier present match
      // Target: ABBEY (B at pos 1 and 2)
      // Guess: BABES
      // B at 0: present (allocated to B at 2 if not careful? But B at 2 in BABES matches B at 2 in ABBEY!)
      // Exact match first:
      // guess[2] ('B') matches target[2] ('B') -> correct!
      // target has one B left (at pos 1).
      // guess[0] ('B') gets 'present' because one B is available.
      // A at 1: present (target has A at 0)
      // E at 3: correct (target has E at 3)
      // S at 4: absent
      expect(evaluateGuess('BABES', 'ABBEY')).toEqual([
        'present',
        'present',
        'correct',
        'correct',
        'absent',
      ]);
    });

    it('is case-insensitive', () => {
      expect(evaluateGuess('crane', 'CRANE')).toEqual([
        'correct',
        'correct',
        'correct',
        'correct',
        'correct',
      ]);
      expect(evaluateGuess('Crane', 'cRaNe')).toEqual([
        'correct',
        'correct',
        'correct',
        'correct',
        'correct',
      ]);
    });
  });

  describe('getKeyboardStatuses', () => {
    it('aggregates statuses across multiple guesses with correct priority', () => {
      // Target: CRANE
      // Guess 1: REACT -> R: present, E: present, A: correct, C: present, T: absent
      // Guess 2: CRATE -> C: correct, R: correct, A: correct, T: absent, E: correct
      const guesses = ['REACT', 'CRATE'];
      const statuses = getKeyboardStatuses(guesses, 'CRANE');

      expect(statuses['A']).toBe('correct');
      expect(statuses['C']).toBe('correct'); // upgraded from present to correct
      expect(statuses['R']).toBe('correct'); // upgraded from present to correct
      expect(statuses['E']).toBe('correct'); // upgraded from present to correct
      expect(statuses['T']).toBe('absent');
    });
  });

  describe('checkHardModeViolation', () => {
    it('returns null if there are no previous guesses', () => {
      expect(checkHardModeViolation('CRANE', [], 'WATER')).toBeNull();
    });

    it('enforces keeping correct letters in place', () => {
      // Target: CRANE, Guess 1: CRAFT -> C, R, A are correct at 0, 1, 2
      const previous = ['CRAFT'];
      const target = 'CRANE';

      // Violates 1st letter:
      expect(checkHardModeViolation('BRAIN', previous, target)).toBe('1st letter must be C');
      // Violates 3rd letter:
      expect(checkHardModeViolation('CROOK', previous, target)).toBe('3rd letter must be A');
      // Complies:
      expect(checkHardModeViolation('CRANE', previous, target)).toBeNull();
    });

    it('enforces reusing present letters anywhere in guess', () => {
      // Target: WATER, Guess 1: PLANT -> T is present at pos 4
      const previous = ['PLANT'];
      const target = 'WATER';

      // Guess without T:
      expect(checkHardModeViolation('SPARE', previous, target)).toBe('Guess must contain T');
      // Guess without A:
      expect(checkHardModeViolation('SHIRT', previous, target)).toBe('Guess must contain A');
      // Guess with both A and T:
      expect(checkHardModeViolation('STARE', previous, target)).toBeNull();
    });
  });

  describe('generateShareText', () => {
    it('formats winning score and emoji grid correctly', () => {
      const text = generateShareText({
        puzzleNumber: 42,
        guesses: ['CRANE', 'WATER'],
        target: 'WATER',
        won: true,
      });

      expect(text).toContain('mintychochip wordle #42 2/6');
      expect(text).toContain('🟩🟩🟩🟩🟩');
      expect(text).toContain('https://mintychochip.dev/#wordle');
    });

    it('formats lost score as X/6', () => {
      const text = generateShareText({
        puzzleNumber: 100,
        guesses: ['AAAAA', 'BBBBB', 'CCCCC', 'DDDDD', 'EEEEE', 'FFFFF'],
        target: 'WATER',
        won: false,
      });

      expect(text).toContain('mintychochip wordle #100 X/6');
    });

    it('supports high contrast emojis', () => {
      const text = generateShareText({
        puzzleNumber: 1,
        guesses: ['WATER'],
        target: 'WATER',
        won: true,
        highContrast: true,
      });

      expect(text).toContain('🟧🟧🟧🟧🟧');
    });
  });

  describe('isConsecutiveDay', () => {
    it('detects consecutive calendar days correctly', () => {
      expect(isConsecutiveDay('2026-10-03', '2026-10-04')).toBe(true);
      expect(isConsecutiveDay('2026-09-30', '2026-10-01')).toBe(true); // month change
      expect(isConsecutiveDay('2026-12-31', '2027-01-01')).toBe(true); // year change
      expect(isConsecutiveDay('2026-10-01', '2026-10-03')).toBe(false); // skipped a day
      expect(isConsecutiveDay('2026-10-03', '2026-10-03')).toBe(false); // same day
    });
  });

  describe('recordGameEnd', () => {
    it('increments played and won on a win and tracks streak', () => {
      const s0 = DEFAULT_STATS;
      const s1 = recordGameEnd(s0, true, 3, '2026-10-03');
      expect(s1.played).toBe(1);
      expect(s1.won).toBe(1);
      expect(s1.currentStreak).toBe(1);
      expect(s1.maxStreak).toBe(1);
      expect(s1.guesses[3]).toBe(1);

      // Next consecutive day win
      const s2 = recordGameEnd(s1, true, 4, '2026-10-04');
      expect(s2.played).toBe(2);
      expect(s2.won).toBe(2);
      expect(s2.currentStreak).toBe(2);
      expect(s2.maxStreak).toBe(2);
      expect(s2.guesses[4]).toBe(1);

      // Missed day then win -> streak resets to 1
      const s3 = recordGameEnd(s2, true, 2, '2026-10-10');
      expect(s3.currentStreak).toBe(1);
      expect(s3.maxStreak).toBe(2);

      // Loss -> streak resets to 0
      const s4 = recordGameEnd(s3, false, 6, '2026-10-11');
      expect(s4.played).toBe(4);
      expect(s4.won).toBe(3);
      expect(s4.currentStreak).toBe(0);
      expect(s4.maxStreak).toBe(2);
    });
  });
});
