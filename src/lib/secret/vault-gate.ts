const WORD = [24, 62, 49, 221, 199];
const WORD_SEED = 0x5a;
const STORE = [77, 121, 48, 87, 227, 160];
const STORE_SEED = 0x3c;

function reveal(bytes: number[], seed: number): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i] ^ ((seed + i * 17) & 255));
  return out;
}

function slot(): string {
  return reveal(STORE, STORE_SEED);
}

export function isVaultWord(guess: string): boolean {
  return guess.toUpperCase() === reveal(WORD, WORD_SEED);
}

export function issueVaultToken(): void {
  if (typeof sessionStorage === 'undefined') return;
  const token =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : String(Date.now());
  try {
    sessionStorage.setItem(slot(), token);
  } catch {
    /* Storage can be blocked. The door still navigates. */
  }
}

export function vaultGrantActive(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  try {
    const value = sessionStorage.getItem(slot());
    return typeof value === 'string' && value.length > 0;
  } catch {
    return false;
  }
}

export function clearVaultGrant(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(slot());
  } catch {
    /* ignore */
  }
}
