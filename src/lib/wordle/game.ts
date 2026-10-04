export type TileStatus = 'empty' | 'tbd' | 'correct' | 'present' | 'absent';
export type GameStatus = 'IN_PROGRESS' | 'WON' | 'LOST';
export type GameMode = 'daily' | 'practice';

export interface GameSettings {
  hardMode: boolean;
  soundEnabled: boolean;
  highContrast: boolean;
}

export interface GameStats {
  played: number;
  won: number;
  currentStreak: number;
  maxStreak: number;
  guesses: Record<1 | 2 | 3 | 4 | 5 | 6, number>;
  lastCompletedDate?: string;
}

export interface SavedDailyState {
  date: string;
  puzzleNumber: number;
  targetWord: string;
  guesses: string[];
  status: GameStatus;
}

export const DEFAULT_SETTINGS: GameSettings = {
  hardMode: false,
  soundEnabled: true,
  highContrast: false,
};

export const DEFAULT_STATS: GameStats = {
  played: 0,
  won: 0,
  currentStreak: 0,
  maxStreak: 0,
  guesses: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
};

/**
 * Evaluates a 5-letter guess against the target word according to official Wordle rules.
 * Handles duplicate letters correctly (exact matches take precedence).
 */
export function evaluateGuess(guessRaw: string, targetRaw: string): TileStatus[] {
  const guess = guessRaw.toUpperCase();
  const target = targetRaw.toUpperCase();

  const result: TileStatus[] = Array(5).fill('absent');
  const targetCounts: Record<string, number> = {};

  // First pass: mark exact correct matches and count remaining letters in target
  for (let i = 0; i < 5; i++) {
    const g = guess[i];
    const t = target[i];
    if (g === t) {
      result[i] = 'correct';
    } else {
      targetCounts[t] = (targetCounts[t] || 0) + 1;
    }
  }

  // Second pass: mark present letters from left to right if remaining count > 0
  for (let i = 0; i < 5; i++) {
    if (result[i] === 'correct') continue;
    const g = guess[i];
    if (targetCounts[g] && targetCounts[g] > 0) {
      result[i] = 'present';
      targetCounts[g]--;
    } else {
      result[i] = 'absent';
    }
  }

  return result;
}

/**
 * Calculates the highest status for each letter on the keyboard across all submitted guesses.
 * Hierarchy: correct > present > absent.
 */
export function getKeyboardStatuses(guesses: string[], target: string): Record<string, TileStatus> {
  const statuses: Record<string, TileStatus> = {};

  const priority: Record<TileStatus, number> = {
    empty: 0,
    tbd: 0,
    absent: 1,
    present: 2,
    correct: 3,
  };

  for (const g of guesses) {
    const evaluated = evaluateGuess(g, target);
    for (let i = 0; i < 5; i++) {
      const char = g[i].toUpperCase();
      const current = statuses[char] || 'empty';
      const next = evaluated[i];
      if (priority[next] > priority[current]) {
        statuses[char] = next;
      }
    }
  }

  return statuses;
}

const ORDINAL_NAMES = ['1st', '2nd', '3rd', '4th', '5th'];

/**
 * Validates hard mode constraints against previous guesses:
 * 1. Any letter revealed as correct must remain in the same position.
 * 2. Any letter revealed as present must be used in the guess.
 * Returns an error message string if violated, or null if valid.
 */
export function checkHardModeViolation(
  guessRaw: string,
  previousGuesses: string[],
  target: string
): string | null {
  if (!previousGuesses.length) return null;
  const guess = guessRaw.toUpperCase();

  // Aggregate required correct positions and required present letters from previous guesses
  const requiredPositions: (string | null)[] = [null, null, null, null, null];
  const requiredLetters = new Set<string>();

  for (const prev of previousGuesses) {
    const evaluated = evaluateGuess(prev, target);
    for (let i = 0; i < 5; i++) {
      if (evaluated[i] === 'correct') {
        requiredPositions[i] = prev[i].toUpperCase();
      } else if (evaluated[i] === 'present') {
        requiredLetters.add(prev[i].toUpperCase());
      }
    }
  }

  // Check correct positions
  for (let i = 0; i < 5; i++) {
    const req = requiredPositions[i];
    if (req && guess[i] !== req) {
      return `${ORDINAL_NAMES[i]} letter must be ${req}`;
    }
  }

  // Check present letters
  for (const char of requiredLetters) {
    if (!guess.includes(char)) {
      return `Guess must contain ${char}`;
    }
  }

  return null;
}

/**
 * Formats the share text emoji grid.
 */
export function generateShareText(options: {
  puzzleNumber?: number | null;
  guesses: string[];
  target: string;
  hardMode?: boolean;
  highContrast?: boolean;
  won: boolean;
}): string {
  const { puzzleNumber, guesses, target, hardMode, highContrast, won } = options;

  const titlePart = puzzleNumber != null ? `#${puzzleNumber}` : 'Practice';
  const hardMark = hardMode ? '*' : '';
  const scorePart = won ? `${guesses.length}/6` : 'X/6';

  const correctEmoji = highContrast ? '🟧' : '🟩';
  const presentEmoji = highContrast ? '🟦' : '🟨';
  const absentEmoji = '⬛';

  const rows = guesses.map((guess) => {
    const evaluated = evaluateGuess(guess, target);
    return evaluated
      .map((status) => {
        if (status === 'correct') return correctEmoji;
        if (status === 'present') return presentEmoji;
        return absentEmoji;
      })
      .join('');
  });

  return [
    `mintychochip wordle ${titlePart}${hardMark} ${scorePart}`,
    '',
    ...rows,
    '',
    'https://mintychochip.dev/#wordle',
  ].join('\n');
}

/** Check if two YYYY-MM-DD date strings are consecutive calendar days. */
export function isConsecutiveDay(prevDate: string, currDate: string): boolean {
  const p = new Date(prevDate + 'T00:00:00');
  const c = new Date(currDate + 'T00:00:00');
  const diffDays = Math.round((c.getTime() - p.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}

/** Updates game statistics upon game completion. */
export function recordGameEnd(
  currentStats: GameStats,
  won: boolean,
  guessCount: number,
  todayDateString?: string
): GameStats {
  const stats: GameStats = {
    ...currentStats,
    guesses: { ...currentStats.guesses },
  };

  stats.played += 1;

  if (won) {
    stats.won += 1;
    const count = Math.min(6, Math.max(1, guessCount)) as 1 | 2 | 3 | 4 | 5 | 6;
    stats.guesses[count] = (stats.guesses[count] || 0) + 1;

    if (todayDateString && stats.lastCompletedDate) {
      if (stats.lastCompletedDate === todayDateString) {
        // Already played today, don't increase streak again
      } else if (isConsecutiveDay(stats.lastCompletedDate, todayDateString)) {
        stats.currentStreak += 1;
      } else {
        stats.currentStreak = 1;
      }
    } else {
      stats.currentStreak += 1;
    }

    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
  } else {
    stats.currentStreak = 0;
  }

  if (todayDateString) {
    stats.lastCompletedDate = todayDateString;
  }

  return stats;
}

// LocalStorage helpers
const STATS_KEY = 'minty_wordle_stats_v1';
const DAILY_KEY = 'minty_wordle_daily_v1';
const SETTINGS_KEY = 'minty_wordle_settings_v1';

export function loadStoredSettings(): GameSettings {
  if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: GameSettings): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

export function loadStoredStats(): GameStats {
  if (typeof localStorage === 'undefined') return DEFAULT_STATS;
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return DEFAULT_STATS;
    const parsed = JSON.parse(raw);
    return {
      played: parsed.played || 0,
      won: parsed.won || 0,
      currentStreak: parsed.currentStreak || 0,
      maxStreak: parsed.maxStreak || 0,
      guesses: { ...DEFAULT_STATS.guesses, ...(parsed.guesses || {}) },
      lastCompletedDate: parsed.lastCompletedDate,
    };
  } catch {
    return DEFAULT_STATS;
  }
}

export function saveStoredStats(stats: GameStats): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {}
}

export function loadStoredDaily(): SavedDailyState | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveStoredDaily(daily: SavedDailyState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(daily));
  } catch {}
}
