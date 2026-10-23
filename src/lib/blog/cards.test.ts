import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BLOG_CARDS } from './cards';

/** Every card links to a real HTML entry, so the pages cannot drift from the cards. */
function entryFor(href: string): string {
  const rel = href.replace(/^\//, '').replace(/\/$/, '');
  return join(process.cwd(), rel, 'index.html');
}

describe('BLOG_CARDS', () => {
  it('links each card to an HTML entry on disk', () => {
    for (const card of BLOG_CARDS) {
      expect(card.href.startsWith('/blog/'), card.href).toBe(true);
      expect(existsSync(entryFor(card.href)), entryFor(card.href)).toBe(true);
    }
  });

  it('lists the cross-reference first and links its source article', () => {
    const [first] = BLOG_CARDS;
    expect(first.href).toBe('/blog/the-token-gap/');
    expect(first.external?.href).toBe('https://blog.umans.ai/blog/the-token-gap/');
  });
});
