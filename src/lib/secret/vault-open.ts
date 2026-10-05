import { openVault } from './vault-crypto';
import { SEALED_VAULT } from './vault-sealed';
import type { VaultCopy } from './vault-types';

export async function openSealedVault(passphrase: string): Promise<VaultCopy> {
  return openVault<VaultCopy>(SEALED_VAULT, passphrase);
}
