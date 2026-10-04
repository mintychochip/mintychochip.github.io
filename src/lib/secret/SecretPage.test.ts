// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, tick, unmount } from 'svelte';
import SecretPage from './SecretPage.svelte';
import { generateBumpyToken, revokeVaultSession, validateAndConsumeToken } from './auth';

describe('SecretPage component', () => {
  let app: any;

  beforeEach(() => {
    class MockResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    class MockIntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

    sessionStorage.clear();
    localStorage.clear();
    revokeVaultSession();
    window.location.hash = '';
    document.body.innerHTML = '';
  });

  afterEach(() => {
    if (app) {
      unmount(app);
      app = null;
    }
  });

  it('renders denied gate when unauthenticated and without token', async () => {
    const onNavigate = vi.fn();
    app = mount(SecretPage, {
      target: document.body,
      props: { onNavigate },
    });
    await tick();

    expect(document.querySelector('.denied-title')?.textContent).toContain("BUMPY'S SECRET VAULT");
    expect(document.querySelector('.wordle-btn')).not.toBeNull();
  });

  it('triggers grand loader and unlocks vault when valid token is in URL', async () => {
    const token = generateBumpyToken();
    window.location.hash = `#secret?token=${token}`;

    const onNavigate = vi.fn();
    app = mount(SecretPage, {
      target: document.body,
      props: { onNavigate },
    });
    await tick();

    // With a valid token, GrandLoader is active
    expect(document.querySelector('.loader-overlay')).not.toBeNull();
    expect(document.querySelector('.loader-title')?.textContent).toContain("DECRYPTING ANNIVERSARY VAULT");

    // Clicking Skip finishes the loader
    const skipBtn = document.querySelector('.skip-btn') as HTMLButtonElement;
    expect(skipBtn).not.toBeNull();
    skipBtn.click();
    await tick();

    // Now vault is displayed!
    expect(document.querySelector('.vault-container')).not.toBeNull();
    expect(document.querySelector('.vault-heading')?.textContent).toContain("HAPPY ANNIVERSARY");
  });

  it('renders vault immediately when session is already authenticated', async () => {
    // Pre-authorize session
    validateAndConsumeToken('dev');
    const onNavigate = vi.fn();
    app = mount(SecretPage, {
      target: document.body,
      props: { onNavigate },
    });
    await tick();

    expect(document.querySelector('.clearance-tag')).not.toBeNull();
    expect(document.querySelector('.vault-heading')?.textContent).toContain("HAPPY ANNIVERSARY");
  });

  it('locks vault and returns to denied screen when Lock Vault is clicked', async () => {
    validateAndConsumeToken('dev');
    const onNavigate = vi.fn();
    app = mount(SecretPage, {
      target: document.body,
      props: { onNavigate },
    });
    await tick();

    expect(document.querySelector('.clearance-tag')).not.toBeNull();

    const lockBtn = document.querySelector('.logout-btn') as HTMLButtonElement;
    lockBtn.click();
    await tick();

    // Now locked
    expect(document.querySelector('.denied-title')?.textContent).toContain("BUMPY'S SECRET VAULT");
  });
});
