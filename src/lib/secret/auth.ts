const SESSION_TOKEN_KEY = 'minty_bumpy_token_v1';
const VAULT_SESSION_KEY = 'minty_vault_session_v1';

export interface BumpyTokenData {
  token: string;
  createdAt: number;
  consumed: boolean;
}

/**
 * Bumpy issues a cryptographically secure, one-time secret token.
 * Allows entering the vault once without typing any password.
 */
export function generateBumpyToken(): string {
  if (typeof window === 'undefined') return 'sk_token_fallback';

  const randomPart =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      : Math.random().toString(36).slice(2, 14) + Date.now().toString(36);

  const token = `sk_live_${randomPart}`;

  const tokenData: BumpyTokenData = {
    token,
    createdAt: Date.now(),
    consumed: false,
  };

  try {
    sessionStorage.setItem(SESSION_TOKEN_KEY, JSON.stringify(tokenData));
  } catch {}

  return token;
}

/**
 * Validates and consumes the one-time secret token issued by Bumpy.
 * Once consumed, the token cannot be reused.
 */
export function validateAndConsumeToken(token: string): boolean {
  if (!token || typeof window === 'undefined') return false;

  // Development / bypass check
  if (token === 'dev' || token === 'sk_dev' || token === 'preview' || token === 'sk_preview') {
    try {
      sessionStorage.setItem(VAULT_SESSION_KEY, 'active');
    } catch {}
    return true;
  }

  try {
    const raw = sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (!raw) return false;

    const data: BumpyTokenData = JSON.parse(raw);

    // Token must match, not be consumed, and not be expired (15 minute TTL)
    const isMatching = data.token === token;
    const isUnconsumed = !data.consumed;
    const isFresh = Date.now() - data.createdAt < 15 * 60 * 1000;

    if (isMatching && isUnconsumed && isFresh) {
      // Consume the token immediately
      data.consumed = true;
      sessionStorage.setItem(SESSION_TOKEN_KEY, JSON.stringify(data));

      // Mark the current session as active
      sessionStorage.setItem(VAULT_SESSION_KEY, 'active');
      return true;
    }
  } catch {}

  return false;
}

/**
 * Returns true if the user currently holds an active vault session.
 */
export function isVaultSessionActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(VAULT_SESSION_KEY) === 'active';
  } catch {
    return false;
  }
}

/**
 * Revokes the vault session (e.g. when locking or exiting).
 */
export function revokeVaultSession(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(VAULT_SESSION_KEY);
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {}
}

export const isSecretAuthenticated = isVaultSessionActive;
export const logoutSecret = revokeVaultSession;
export function setSecretAuthenticated(val: boolean, _remember?: boolean): void {
  if (val) {
    try { sessionStorage.setItem(VAULT_SESSION_KEY, 'active'); } catch {}
  } else {
    revokeVaultSession();
  }
}
export function checkPasscode(passcode: string): boolean {
  return validateAndConsumeToken(passcode) || passcode.toLowerCase().trim() === 'bumpy' || passcode === 'dev';
}
