import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '../../..');
const SRC = join(ROOT, 'src');

/** Phrases that must exist only inside the sealed payload, never in shipped source. */
const PRIVATE_PHRASES = [
  'To My Favorite Person in the World',
  'Unlimited Massage Pass',
  'sweet girl',
  'H-E-A-R-T',
  'sk_preview',
  'sk_dev',
];

function sourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) found.push(...sourceFiles(path));
    else if (/\.(ts|svelte|js|css|html|json)$/.test(entry) && !entry.endsWith('.test.ts')) found.push(path);
  }
  return found;
}

describe('public source', () => {
  it('does not contain vault plaintext or bypass tokens', () => {
    const hits: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const text = readFileSync(file, 'utf8');
      for (const phrase of PRIVATE_PHRASES) {
        if (text.includes(phrase)) hits.push(`${relative(ROOT, file)} contains ${JSON.stringify(phrase)}`);
      }
    }
    expect(hits).toEqual([]);
  });
});
