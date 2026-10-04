import { describe, expect, it } from 'vitest';
import { TOKEN_GAP_ARTICLE } from './article-content';

describe('TOKEN_GAP_ARTICLE draft', () => {
  it('has a TL;DR and section headings for revision', () => {
    expect(TOKEN_GAP_ARTICLE.length).toBeGreaterThan(10);
    const first = TOKEN_GAP_ARTICLE[0];
    expect(first.type).toBe('p');
    if (first.type === 'p') {
      expect(first.html).toContain('TL;DR');
      expect(first.html).toContain('mintychochip');
    }
    const headings = TOKEN_GAP_ARTICLE.filter((b) => b.type === 'h2');
    expect(headings.length).toBeGreaterThanOrEqual(5);
  });

  it('includes devday, discord, and telemetry figures', () => {
    const figures = TOKEN_GAP_ARTICLE.filter((b) => b.type === 'figure');
    expect(figures.map((f) => (f.type === 'figure' ? f.which : ''))).toEqual([
      'devday',
      'discord',
      'telemetry',
    ]);
  });
});
