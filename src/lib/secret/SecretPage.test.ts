// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, tick, unmount } from 'svelte';
import SecretPage from './SecretPage.svelte';
import { clearVaultGrant, issueVaultToken, vaultGrantActive } from './vault-gate';
import type { VaultCopy } from './vault-types';

const FIXTURE: VaultCopy = {
  letter: {
    title: 'Sample Card',
    dedication: 'For a friend.',
    greeting: 'Hello there,',
    paragraphs: ['A sample paragraph.'],
    signoff: 'Yours,',
    signature: 'A friend',
    postscript: 'More below.',
  },
  pond: { title: 'Sample pond', idleSpeech: 'Ribbit', loveLines: ['Ribbit'], button: 'Send' },
  reasons: { title: 'Reasons', desc: 'Some reasons', items: [] },
  coupons: [{ id: 1, title: 'Sample pass', icon: 'boba', desc: 'A sample pass.' }],
  wordle: {
    title: 'Riddle',
    prompt: 'Guess',
    target: 'AAAAA',
    hint: 'none',
    wrong: 'no',
    solvedTitle: 'yes',
    solvedBody: 'done',
    keys: ['A'],
  },
  oracle: { title: 'Oracle', desc: 'Answers' },
};

/** The button whose visible text is exactly `name`. */
function button(name: string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === name);
}

describe('SecretPage component', () => {
  let app: Record<string, unknown> | null = null;

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
    // jsdom lays nothing out, so it has no scrollIntoView; the opened letter scrolls itself into view.
    Element.prototype.scrollIntoView = vi.fn();
    // Nor does it draw: the canvases (envelope, frogs) get no context and draw nothing.
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null);
    window.location.hash = '';
    document.body.innerHTML = '';
    clearVaultGrant();
  });

  afterEach(() => {
    if (app) {
      unmount(app);
      app = null;
    }
  });

  it('stays sealed without a token, including a token link', async () => {
    window.location.hash = '#secret?token=dev';
    app = mount(SecretPage, {
      target: document.body,
      props: { onNavigate: vi.fn() },
    });
    await tick();

    expect(document.querySelector('.denied-title')).not.toBeNull();
    expect(document.querySelector('input')).toBeNull();
    expect(document.querySelector('#anniversary-letter')).toBeNull();
    expect(document.body.textContent).not.toContain('one-time secret token');
    expect(vaultGrantActive()).toBe(false);
  });

  it('opens from the wordle token, hands over the letter first, and locks again', async () => {
    issueVaultToken();
    app = mount(SecretPage, {
      target: document.body,
      props: {
        onNavigate: vi.fn(),
        openVault: async () => FIXTURE,
      },
    });

    await vi.waitFor(() => {
      expect(document.querySelector('.loader-overlay')).not.toBeNull();
    }, 5000);

    (document.querySelector('.skip-btn') as HTMLButtonElement).click();
    await vi.waitFor(() => {
      expect(document.querySelector('#anniversary-letter')).not.toBeNull();
    });

    // Nothing after the letter exists until it is open, and opening it does not wait on a canvas.
    expect(document.querySelector('#anniversary-passes')).toBeNull();
    button('Open the letter')?.click();
    await vi.waitFor(
      () => {
        expect(document.querySelector('#anniversary-passes')).not.toBeNull();
      },
      { timeout: 6000 },
    );
    // While it is being written, a screen reader gets the whole letter at once, not the half-written sheet.
    const words = document.querySelector('.letter .words');
    expect(words?.getAttribute('aria-hidden')).toBe('true');
    expect(document.querySelector('.letter .visually-hidden')?.textContent).toContain('More below.');
    expect(words?.textContent).not.toContain('More below.');

    // Finishing the letter early (the reader's tap) signs it and leaves the rest of the vault standing.
    (document.querySelector('[aria-label="Show the whole letter"]') as HTMLButtonElement).click();
    await tick();
    await tick();
    expect(document.querySelector('[aria-label="Show the whole letter"]')).toBeNull();
    expect(words?.getAttribute('aria-hidden')).not.toBe('true');
    expect(words?.textContent).toContain('More below.');
    expect(document.querySelector('.letter .visually-hidden')).toBeNull();
    expect(document.querySelector('#anniversary-passes')).not.toBeNull();

    button('Goodnight, lock the vault')?.click();
    await tick();
    expect(document.querySelector('.denied-title')).not.toBeNull();
    expect(document.querySelector('#anniversary-letter')).toBeNull();
    expect(vaultGrantActive()).toBe(false);
  });

  it('drops a token that cannot open the vault', async () => {
    issueVaultToken();
    app = mount(SecretPage, {
      target: document.body,
      props: {
        onNavigate: vi.fn(),
        openVault: async () => {
          throw new Error('sealed');
        },
      },
    });
    await vi.waitFor(() => {
      expect(document.querySelector('.passphrase-error')?.textContent).toContain('did not open');
    });

    expect(document.querySelector('#anniversary-letter')).toBeNull();
    expect(document.querySelector('.loader-overlay')).toBeNull();
    expect(vaultGrantActive()).toBe(false);
  });
});
