export const VAULT_KDF_ITERATIONS = 600_000;

export interface SealedVault {
  kdf: 'PBKDF2-SHA-256';
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

export class VaultSealError extends Error {
  constructor() {
    super('sealed');
    this.name = 'VaultSealError';
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number, usage: 'encrypt' | 'decrypt'): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    [usage],
  );
}

export async function sealVault(payload: unknown, passphrase: string, iterations = VAULT_KDF_ITERATIONS): Promise<SealedVault> {
  const phrase = passphrase.trim();
  if (!phrase || !Number.isInteger(iterations) || iterations < 1) throw new VaultSealError();

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(phrase, salt, iterations, 'encrypt');
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

  return {
    kdf: 'PBKDF2-SHA-256',
    iterations,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
  };
}

export async function openVault<T>(sealed: SealedVault, passphrase: string): Promise<T> {
  const phrase = passphrase.trim();
  if (!phrase || sealed.kdf !== 'PBKDF2-SHA-256') throw new VaultSealError();

  try {
    const salt = base64ToBytes(sealed.salt);
    const iv = base64ToBytes(sealed.iv);
    const key = await deriveKey(phrase, salt, sealed.iterations, 'decrypt');
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      base64ToBytes(sealed.ciphertext) as BufferSource,
    );
    return JSON.parse(new TextDecoder().decode(decrypted)) as T;
  } catch (error) {
    if (error instanceof VaultSealError) throw error;
    throw new VaultSealError();
  }
}
