import { describe, expect, it } from 'vitest';
import { parseContributions, streaks, summarize, toWeekColumns } from './activity';

const days = [
  { date: '2026-01-01', count: 2, level: 1 },
  { date: '2026-01-02', count: 0, level: 0 },
  { date: '2026-01-03', count: 5, level: 2 },
  { date: '2026-01-04', count: 1, level: 1 },
  { date: '2026-01-05', count: 1, level: 1 },
  { date: '2026-01-06', count: 0, level: 0 },
  { date: '2026-01-07', count: 0, level: 0 },
  { date: '2026-01-08', count: 3, level: 2 },
];

describe('streaks', () => {
  it('counts current and longest runs', () => {
    expect(streaks(days)).toEqual({ current: 1, longest: 3 });
  });

  it('handles no activity', () => {
    expect(streaks([{ date: '2026-01-01', count: 0, level: 0 }])).toEqual({ current: 0, longest: 0 });
  });
});

describe('toWeekColumns', () => {
  it('chunks into weeks of seven', () => {
    expect(toWeekColumns(days)).toEqual([[1, 0, 2, 1, 1, 0, 0], [2, 0, 0, 0, 0, 0, 0]]);
  });
});

describe('parseContributions', () => {
  it('reads the public API shape', () => {
    const out = parseContributions({
      total: { lastYear: 100 },
      contributions: [{ date: '2026-03-01', count: 4, level: 2 }],
    });
    expect(out.totalLastYear).toBe(100);
    expect(out.days).toHaveLength(1);
  });
});

describe('summarize', () => {
  it('picks the busiest day', () => {
    const s = summarize(days, 42);
    expect(s.best.count).toBe(5);
    expect(s.totalLastYear).toBe(42);
  });
});
