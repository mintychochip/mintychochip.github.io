import { describe, expect, it } from 'vitest';
import { getDailyWord, getRandomWord, isValidWord, TARGET_WORDS } from './words';

describe('Wordle words dictionary', () => {
  it('contains expected number of target answers', () => {
    expect(TARGET_WORDS.length).toBe(2315);
  });

  it('validates common target words correctly', () => {
    expect(isValidWord('CRANE')).toBe(true);
    expect(isValidWord('SLATE')).toBe(true);
    expect(isValidWord('CROAK')).toBe(true);
    expect(isValidWord('WATER')).toBe(true);
    expect(isValidWord('GREEN')).toBe(true);
    // case insensitivity
    expect(isValidWord('crane')).toBe(true);
    expect(isValidWord('CrAnE')).toBe(true);
  });

  it('validates extended allowed guesses correctly', () => {
    expect(isValidWord('AAHED')).toBe(true);
    expect(isValidWord('FROGS')).toBe(true);
    expect(isValidWord('XYLYL')).toBe(true);
    expect(isValidWord('aahed')).toBe(true);
  });

  it('rejects invalid or wrong-length words', () => {
    expect(isValidWord('')).toBe(false);
    expect(isValidWord('A')).toBe(false);
    expect(isValidWord('FOUR')).toBe(false);
    expect(isValidWord('SIXLET')).toBe(false);
    expect(isValidWord('ZZZZZ')).toBe(false);
    expect(isValidWord('12345')).toBe(false);
    expect(isValidWord('!@#$%')).toBe(false);
  });

  it('provides deterministic daily word for identical dates', () => {
    const d1 = new Date(2026, 9, 3);
    const d2 = new Date(2026, 9, 3);
    const day1 = getDailyWord(d1);
    const day2 = getDailyWord(d2);
    expect(day1.word).toBe(day2.word);
    expect(day1.puzzleNumber).toBe(day2.puzzleNumber);
    expect(day1.dateString).toBe(day2.dateString);
    expect(day1.word.length).toBe(5);
    expect(isValidWord(day1.word)).toBe(true);
  });

  it('generates different daily words on different dates', () => {
    const day1 = getDailyWord(new Date(2026, 9, 3));
    const day2 = getDailyWord(new Date(2026, 9, 4));
    expect(day1.puzzleNumber).not.toBe(day2.puzzleNumber);
    expect(day1.dateString).not.toBe(day2.dateString);
  });

  it('returns valid random words', () => {
    for (let i = 0; i < 10; i++) {
      const w = getRandomWord();
      expect(w.length).toBe(5);
      expect(isValidWord(w)).toBe(true);
      expect(TARGET_WORDS).toContain(w);
    }
  });
});
