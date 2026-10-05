import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sealVault } from '../src/lib/secret/vault-crypto.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const passphrase = process.env.VAULT_PASSPHRASE ?? '';
const payload = JSON.parse(readFileSync(resolve(root, 'private/vault-content.json'), 'utf8'));
const sealed = await sealVault(payload, passphrase);

const body = `import type { SealedVault } from './vault-crypto';

/** Ciphertext only. The passphrase is not in this repository. */
export const SEALED_VAULT: SealedVault = ${JSON.stringify(sealed, null, 2)};
`;

writeFileSync(resolve(root, 'src/lib/secret/vault-sealed.ts'), body);
