import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { openSealedVault } from './vault-open';

describe('openSealedVault', () => {
  it('opens the sealed copy without a typed passphrase', async () => {
    const source = readFileSync(join(import.meta.dirname, 'vault-open.ts'), 'utf8');
    expect(source).not.toMatch(/['"][A-Z0-9-]{10,}['"]/);

    const copy = await openSealedVault();
    expect(copy.reasons.items).toHaveLength(8);
    expect(copy.coupons).toHaveLength(6);
    expect(copy.letter.paragraphs).toHaveLength(3);
  });
});