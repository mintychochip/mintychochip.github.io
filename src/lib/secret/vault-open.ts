import { openVault } from './vault-crypto';
import { SEALED_VAULT } from './vault-sealed';
import type { VaultCopy } from './vault-types';

const MATERIAL = [219, 238, 134, 156, 248, 178, 162, 89, 95, 7, 12, 11, 15, 35, 82, 219, 150, 247, 146, 249, 161, 180, 50, 73];
const MATERIAL_SEED = 0x91;

function material(): string {
  let out = '';
  for (let i = 0; i < MATERIAL.length; i++) {
    out += String.fromCharCode(MATERIAL[i] ^ ((MATERIAL_SEED + i * 17) & 255));
  }
  return out;
}

export async function openSealedVault(): Promise<VaultCopy> {
  return openVault<VaultCopy>(SEALED_VAULT, material());
}
