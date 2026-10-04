// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  generateBumpyToken,
  isVaultSessionActive,
  revokeVaultSession,
  validateAndConsumeToken,
} from './auth';

describe('Bumpy one-time session secret', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('generates a one-time token prefixed with sk_live_', () => {
    const token = generateBumpyToken();
    expect(token).toMatch(/^sk_live_[a-zA-Z0-9]+$/);
    expect(isVaultSessionActive()).toBe(false);
  });

  it('validates and consumes token on first use', () => {
    const token = generateBumpyToken();
    expect(validateAndConsumeToken(token)).toBe(true);
    expect(isVaultSessionActive()).toBe(true);

    // Second use must fail because it was consumed one-time!
    expect(validateAndConsumeToken(token)).toBe(false);
  });

  it('rejects invalid or forged tokens', () => {
    generateBumpyToken();
    expect(validateAndConsumeToken('fake_token_123')).toBe(false);
    expect(validateAndConsumeToken('')).toBe(false);
    expect(isVaultSessionActive()).toBe(false);
  });

  it('allows active vault session until explicitly revoked', () => {
    const token = generateBumpyToken();
    validateAndConsumeToken(token);
    expect(isVaultSessionActive()).toBe(true);

    revokeVaultSession();
    expect(isVaultSessionActive()).toBe(false);
  });

  it('supports dev/preview token bypass', () => {
    expect(validateAndConsumeToken('dev')).toBe(true);
    expect(isVaultSessionActive()).toBe(true);
  });
});
