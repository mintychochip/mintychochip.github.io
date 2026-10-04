import { describe, expect, it } from 'vitest';
import { DESCRIPTION_MAX_WORDS, FALLBACK, metaLine, sortProjects, toProject, truncateWords } from './github';

const raw = (over: Record<string, unknown> = {}) => ({
  name: 'kitsune',
  description: ' AI semantic search ',
  html_url: 'https://github.com/mintychochip/kitsune',
  language: 'Java',
  stargazers_count: 2,
  pushed_at: '2026-08-29T10:00:00Z',
  fork: false,
  ...over,
});

describe('truncateWords', () => {
  it('leaves short text unchanged', () => {
    expect(truncateWords('one two three')).toBe('one two three');
  });

  it('truncates with an ellipsis', () => {
    const words = Array.from({ length: DESCRIPTION_MAX_WORDS + 5 }, (_, i) => `w${i}`).join(' ');
    expect(truncateWords(words).endsWith('…')).toBe(true);
    expect(truncateWords(words).split(/\s+/).length).toBe(DESCRIPTION_MAX_WORDS);
  });
});

describe('toProject', () => {
  it('maps a repo', () => {
    expect(toProject(raw())).toEqual({
      name: 'kitsune',
      description: 'AI semantic search',
      url: 'https://github.com/mintychochip/kitsune',
      live: null,
      language: 'Java',
      stars: 2,
      pushed: '2026-08-29T10:00:00Z',
    });
  });

  it('skips forks, the site repo and the profile repo', () => {
    expect(toProject(raw({ fork: true }))).toBeNull();
    expect(toProject(raw({ name: 'mintychochip.github.io' }))).toBeNull();
    expect(toProject(raw({ name: 'mintychochip' }))).toBeNull();
    expect(toProject(null)).toBeNull();
    expect(toProject({ description: 'no name' })).toBeNull();
  });

  it('links ModularJobs to its live site', () => {
    const p = toProject(raw({ name: 'ModularJobs', html_url: 'https://github.com/mintychochip/ModularJobs' }))!;
    expect(p.url).toBe('https://jobs.mintychochip.dev');
    expect(p.live).toBe('jobs.mintychochip.dev');
  });

  it('tolerates missing fields', () => {
    const p = toProject({ name: 'bare' })!;
    expect(p).toMatchObject({ description: '', language: null, stars: 0, url: 'https://github.com/mintychochip/bare' });
  });
});

describe('listing', () => {
  it('sorts by last push, newest first', () => {
    const names = sortProjects([...FALLBACK].reverse()).map((p) => p.name);
    expect(names[0]).toBe('toktally');
    expect(names.at(-1)).toBe('guildpost');
  });

  it('writes a short meta line', () => {
    const now = new Date('2026-10-03T00:00:00Z');
    const jobs = FALLBACK.find((p) => p.name === 'ModularJobs')!;
    expect(metaLine(jobs, now)).toBe('Java · 1 star · updated Aug 26 · jobs.mintychochip.dev');
    expect(metaLine({ ...jobs, stars: 3, live: null, pushed: '2025-05-08T00:00:00Z' }, now)).toBe('Java · 3 stars · updated May 8, 2025');
  });
});
