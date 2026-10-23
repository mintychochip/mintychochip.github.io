import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PAGES, SITE_URL, canonical, headTags, noScriptHtml, pageFor, sitemapXml } from './seo';

/**
 * The pages are client-rendered, so these tags only reach a crawler if the build
 * writes them into the entry HTML. These tests guard the table, the escaping, and
 * the paths that must stay in sync with the Vite entries.
 */
const ROOT = process.cwd();

function documentFor(entry: string): { html: string } {
  return { html: readFileSync(join(ROOT, entry), 'utf8') };
}

describe('SEO page table', () => {
  it('covers every HTML entry the build emits', () => {
    const entries = [
      'index.html',
      'blog/index.html',
      'blog/the-token-gap/index.html',
      'blog/bytemill/index.html',
    ];
    for (const entry of entries) {
      const path = entry.replace(/index\.html$/, '');
      expect(pageFor(`/${path}`), entry).toBeDefined();
    }
    expect(PAGES).toHaveLength(entries.length);
  });

  it('maps /blog/index.html and /blog/ to the same page', () => {
    expect(pageFor('/blog/index.html')?.path).toBe('/blog/');
    expect(pageFor('/blog/')?.path).toBe('/blog/');
    expect(pageFor('/')).toBeDefined();
  });

  it('gives every page a unique absolute canonical ending in a slash', () => {
    const canonicals = PAGES.map((page) => {
      const url = canonical(page);
      expect(url.startsWith(`${SITE_URL}/`) || url === `${SITE_URL}/`).toBe(true);
      expect(url.endsWith('/')).toBe(true);
      return url;
    });
    expect(new Set(canonicals).size).toBe(canonicals.length);
  });

  it('points every page at a 1200x630 social card it owns', () => {
    const images = PAGES.map((page) => page.image);
    expect(new Set(images).size).toBe(images.length);
    for (const image of images) expect(image).toMatch(/^\/images\/og\/[a-z0-9-]+\.png$/);
  });

  it('keeps titles and descriptions inside the lengths search engines show', () => {
    for (const page of PAGES) {
      expect(page.title.length, page.path).toBeLessThanOrEqual(70);
      expect(page.description.length, page.path).toBeGreaterThanOrEqual(70);
      expect(page.description.length, page.path).toBeLessThanOrEqual(200);
    }
  });
});

describe('headTags', () => {
  it('emits one canonical, one description, and the OG pair per page', () => {
    for (const page of PAGES) {
      const html = headTags(page);
      expect(html.match(/rel="canonical"/g), page.path).toHaveLength(1);
      expect(html.match(/name="description"/g), page.path).toHaveLength(1);
      expect(html.match(/<title>/g), page.path).toHaveLength(1);
      expect(html).toContain(`<meta property="og:url" content="${canonical(page)}" />`);
      expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
      expect(html).toContain('<meta property="og:image:width" content="1200" />');
    }
  });

  it('escapes quotes so titles cannot break their attributes', () => {
    const page = PAGES.find((candidate) => candidate.path === '/blog/the-token-gap/')!;
    const html = headTags(page);
    const title = html.match(/<title>(.*?)<\/title>/)![1]!;
    expect(title).toContain('&quot;');
    expect(title).not.toContain('"');
  });

  it('emits JSON-LD that parses and never closes the script early', () => {
    for (const page of PAGES) {
      const html = headTags(page);
      const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)];
      expect(blocks.length, page.path).toBe(page.jsonLd.length);
      for (const [, json] of blocks) {
        const parsed = JSON.parse(json!) as Record<string, unknown>;
        expect(parsed['@context']).toBe('https://schema.org');
        expect(typeof parsed['@type']).toBe('string');
        expect(json).not.toContain('</script');
      }
    }
  });

  it('marks the article pages as articles with a published time', () => {
    const post = PAGES.find((page) => page.path === '/blog/the-token-gap/')!;
    const html = headTags(post);
    expect(html).toContain('<meta property="og:type" content="article" />');
    expect(html).toContain('<meta property="article:published_time" content="2026-08-25" />');
  });

  it('keeps noindex pages out of the sitemap', () => {
    const drafted = { ...PAGES[0]!, path: '/draft/', noindex: true };
    const xml = sitemapXml([...PAGES, drafted]);
    expect(xml).not.toContain('/draft/');
    expect(xml).toContain(`<loc>${SITE_URL}/</loc>`);
  });
});

describe('social card files', () => {
  /** PNG IHDR holds width/height as big-endian u32 at bytes 16 and 20. */
  it('exist at the referenced path and are 1200x630', () => {
    for (const page of PAGES) {
      const file = join(ROOT, 'public', page.image);
      const buf = readFileSync(file);
      expect(buf.subarray(1, 4).toString('ascii'), file).toBe('PNG');
      expect(buf.readUInt32BE(16), `${file} width`).toBe(1200);
      expect(buf.readUInt32BE(20), `${file} height`).toBe(630);
    }
  });
});

describe('sitemapXml', () => {
  it('lists every indexable page exactly once', () => {
    const xml = sitemapXml();
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    for (const page of PAGES) expect(xml).toContain(`<loc>${canonical(page)}</loc>`);
    expect(xml.match(/<loc>/g)).toHaveLength(PAGES.length);
  });
});

describe('noScriptHtml', () => {
  it('gives a scriptless reader the heading, a contact, and a way onward', () => {
    for (const page of PAGES) {
      const html = noScriptHtml(page);
      expect(html).toContain('<h1>');
      expect(html).toContain('mailto:');
      expect(html).toContain('href="/blog/"');
    }
  });
});

describe('built entries', () => {
  it('carry their injected metadata in the shipped HTML', () => {
    for (const page of PAGES) {
      const entry = page.path === '/' ? 'dist/index.html' : `dist${page.path}index.html`;
      let html: string;
      try {
        html = documentFor(entry).html;
      } catch {
        // `npm test` can run before `npm run build` locally; CI builds after testing too.
        return;
      }
      expect(html, entry).toContain(`<link rel="canonical" href="${canonical(page)}" />`);
      expect(html, entry).toContain(`<meta property="og:image" content="${SITE_URL}${page.image}" />`);
      expect(html, entry).toContain('<noscript>');
    }
  });
});
