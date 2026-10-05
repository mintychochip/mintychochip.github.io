import { describe, expect, it } from 'vitest';
import { obfuscateVaultChunk } from './obfuscate-vault-chunk';

const SAMPLE = `
import { t as helper } from "./keep.js";
function unlockVault(value) {
  const api = { openSealedVault() { return value + 1; } };
  return helper && api.openSealedVault();
}
export { unlockVault as t };
`;

describe('obfuscateVaultChunk', () => {
  it('renames locals to hex and keeps the import and export names', async () => {
    const out = obfuscateVaultChunk(SAMPLE, true);

    expect(out).toContain('./keep.js');
    expect(out).toMatch(/export\{_0x[0-9a-f]+ as t\}/);
    expect(out).toMatch(/import\{t as _0x[0-9a-f]+\}from['"]\.\/keep\.js['"]/);
    expect(out).not.toContain('unlockVault');
    expect(out).not.toContain('openSealedVault');
    expect(out).toContain('_0xa91c3e');
    expect(out).not.toContain('helper');

    const runnable = out.replace(
      /import\{t as (_0x[0-9a-f]+)\}from['"]\.\/keep\.js['"];?/,
      'const $1 = true;',
    );
    const mod = await import(`data:text/javascript,${encodeURIComponent(runnable)}`);
    expect(mod.t(2)).toBe(3);
  });
});
