import { describe, expect, it } from 'vitest';
import { TOKEN_GAP_ARTICLE, articleBlocks } from './article-content';
import { articleHeadings, headingId } from './sections';

describe('articleHeadings', () => {
  it('derives one stable id per h2, in document order', () => {
    const headings = articleHeadings(TOKEN_GAP_ARTICLE);
    const h2s = TOKEN_GAP_ARTICLE.filter((b) => b.type === 'h2');

    expect(headings).toHaveLength(h2s.length);
    expect(headings.map((h) => h.label)).toEqual(h2s.map((b) => (b.type === 'h2' ? b.text : '')));
    for (const heading of headings) {
      expect(TOKEN_GAP_ARTICLE[heading.index]).toMatchObject({ type: 'h2' });
      expect(heading.id).toMatch(/^[a-z0-9-]+$/);
    }
    expect(new Set(headings.map((h) => h.id)).size).toBe(headings.length);
  });

  it('disambiguates repeated heading text instead of colliding', () => {
    const blocks = [
      { type: 'h2' as const, text: 'Same' },
      { type: 'p' as const, html: 'x' },
      { type: 'h2' as const, text: 'Same' },
    ];
    expect(articleHeadings(blocks).map((h) => h.id)).toEqual(['same', 'same-2']);
  });

  it('falls back to a positional id for text with no usable characters', () => {
    expect(headingId('—')).toBe('');
    expect(articleHeadings([{ type: 'h2', text: '—' }])[0].id).toBe('section-0');
  });
});

describe('articleBlocks', () => {
  it('returns the copy only for the token gap slug', () => {
    expect(articleBlocks('the-token-gap-10b-day')).toBe(TOKEN_GAP_ARTICLE);
    expect(articleBlocks('something-else')).toEqual([]);
  });
});
