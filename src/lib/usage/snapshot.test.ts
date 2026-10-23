import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The usage files are static exports served by GitHub Pages, which ignores the
 * query string. `llms.txt` tells clients to filter by `date`, so the snapshot
 * must actually carry dates and stay a single window; if a live API ever
 * replaces it, this test is the signal to update that documentation.
 */
const read = (name: string) =>
  JSON.parse(readFileSync(join(process.cwd(), 'public/v1/usage', name), 'utf8')) as {
    schema_version: number;
    from: string;
    to: string;
    points: { date: string }[];
  };

describe.each(['models', 'series'])('public/v1/usage/%s snapshot', (name) => {
  it('is a dated window with sortable ISO points', () => {
    const data = read(name);
    expect(data.schema_version).toBe(1);
    expect(data.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(data.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(data.points.length).toBeGreaterThan(0);
    for (const point of data.points) expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Clients are told to filter by date, so every point must fall in the window.
    for (const point of data.points) {
      expect(point.date >= data.from && point.date <= data.to).toBe(true);
    }
  });

  it('covers a contiguous window, so filtering by date is sound', () => {
    const dates = read(name).points.map((point) => point.date).sort();
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(`${dates[i - 1]}T00:00:00Z`).getTime();
      const next = new Date(`${dates[i]}T00:00:00Z`).getTime();
      expect(next - prev).toBe(86_400_000);
    }
  });
});
