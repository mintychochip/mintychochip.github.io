import { describe, expect, it } from 'vitest';
import { openVault, sealVault, VaultSealError } from './vault-crypto';

const PASSPHRASE = 'correct horse battery';
const PAYLOAD = { letter: { greeting: 'Hello' }, n: 7 };

describe('vault seal', () => {
  it('opens a sealed payload with the same passphrase', async () => {
    const sealed = await sealVault(PAYLOAD, PASSPHRASE, 1_000);
    const opened = await openVault<typeof PAYLOAD>(sealed, PASSPHRASE);
    expect(opened).toEqual(PAYLOAD);
  });

  it('rejects a wrong passphrase', async () => {
    const sealed = await sealVault(PAYLOAD, PASSPHRASE, 1_000);
    await expect(openVault(sealed, 'nope')).rejects.toBeInstanceOf(VaultSealError);
  });

  it('rejects a tampered ciphertext', async () => {
    const sealed = await sealVault(PAYLOAD, PASSPHRASE, 1_000);
    const flipped = sealed.ciphertext.slice(0, -4) + (sealed.ciphertext.endsWith('aaaa') ? 'bbbb' : 'aaaa');
    await expect(openVault({ ...sealed, ciphertext: flipped }, PASSPHRASE)).rejects.toBeInstanceOf(VaultSealError);
  });

  it('rejects an empty passphrase', async () => {
    await expect(sealVault(PAYLOAD, '   ', 1_000)).rejects.toBeInstanceOf(VaultSealError);
  });
});
