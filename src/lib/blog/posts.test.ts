import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { POSTS } from './posts';

const PUBLIC = join(process.cwd(), 'public');

function assertImageFile(webPath: string, magic: number[], minBytes = 1024) {
  const file = join(PUBLIC, webPath.replace(/^\//, ''));
  const buf = readFileSync(file);
  expect(buf.length).toBeGreaterThan(minBytes);
  expect(buf.subarray(0, magic.length)).toEqual(Buffer.from(magic));
  const head = buf.subarray(0, 32).toString('utf8');
  expect(head).not.toMatch(/^<!DOCTYPE|^<html/i);
}

describe('Blog Posts & Features', () => {
  it('defines the Token Gap cross-reference post', () => {
    const post = POSTS.find((p) => p.id === 'the-token-gap-10b-day');
    expect(post).toBeDefined();
    expect(post?.title).toMatch(/that was me/i);
    expect(post?.excerpt).toMatch(/that developer is me/i);
    expect(post?.externalUrl).toBe('https://blog.umans.ai/blog/the-token-gap/');
    expect(post?.externalSource).toBe('Umans AI Blog');
    expect(post?.author).toBe('mintychochip');
  });

  it('includes key metrics about the 10B milestone and 99% cache rate', () => {
    const post = POSTS.find((p) => p.id === 'the-token-gap-10b-day')!;
    const peak = post.metrics.find((m) => m.label.includes('Peak'));
    const cache = post.metrics.find((m) => m.label.includes('Cache'));
    expect(peak?.value).toBe('10.95B');
    expect(cache?.value).toBe('99%');
  });

  it('references media images with valid path format', () => {
    const post = POSTS.find((p) => p.id === 'the-token-gap-10b-day')!;
    expect(post.discordQuote.image).toBe('/images/discord-10b-record.png');
    expect(post.telemetryImage).toBe('/images/umans-10b-usage.png');
    expect(post.devdayImage).toBe('/images/openai-devday-tokens.webp');
  });

  it('blog image assets on disk are real images (not HTML error pages)', () => {
    const post = POSTS.find((p) => p.id === 'the-token-gap-10b-day')!;
    assertImageFile(post.discordQuote.image, [0x89, 0x50, 0x4e, 0x47]);
    assertImageFile(post.telemetryImage, [0x89, 0x50, 0x4e, 0x47]);
    assertImageFile(post.devdayImage, [0x52, 0x49, 0x46, 0x46]); // RIFF (WebP)
  });
});
