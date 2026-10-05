// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { clearVaultGrant, isVaultWord, issueVaultToken, vaultGrantActive } from './vault-gate';

describe('vault gate', () => {
  afterEach(() => {
    clearVaultGrant();
  });

  it('recognizes only the door guess and issues a session token for it', () => {
    expect(isVaultWord('crane')).toBe(false);
    expect(isVaultWord('dev')).toBe(false);
    expect(isVaultWord('bumpy')).toBe(true);
    expect(vaultGrantActive()).toBe(false);

    issueVaultToken();
    expect(vaultGrantActive()).toBe(true);
    clearVaultGrant();
    expect(vaultGrantActive()).toBe(false);
  });
});