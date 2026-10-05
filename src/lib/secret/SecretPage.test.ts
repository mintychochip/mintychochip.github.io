// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, tick, unmount } from 'svelte';
import SecretPage from './SecretPage.svelte';
import type { VaultCopy } from './vault-types';

const FIXTURE: VaultCopy = {
  letter: {
    cover: { kicker: 'a note', title: 'Sample Card' },
    greeting: 'Hello there,',
    paragraphs: ['A sample paragraph.'],
    signoff: 'Yours,',
    signature: 'A friend',
    postscript: 'More below.',
  },
  banner: { clearance: 'SEALED', heading: 'Sample heading', subheading: 'Sample sub' },
  pond: { title: 'Sample pond', idleSpeech: 'Ribbit', loveLines: ['Ribbit'], button: 'Send' },
  letterStamp: 'SAMPLE',
  reasons: { title: 'Reasons', desc: 'Some reasons', items: [] },
  coupons: [],
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

describe('SecretPage component', () => {
  let app: ReturnType<typeof mount> | null = null;

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
    window.location.hash = '';
    document.body.innerHTML = '';
  });

  afterEach(() => {
    if (app) {
      unmount(app);
      app = null;
    }
  });

  it('shows a passphrase form and ignores token links', async () => {
    window.location.hash = '#secret?token=dev';
    app = mount(SecretPage, {
      target: document.body,
      props: { onNavigate: vi.fn() },
    });
    await tick();

    expect(document.querySelector('.denied-title')?.textContent).toContain("BUMPY'S SECRET VAULT");
    expect(document.querySelector('#vault-passphrase')).not.toBeNull();
    expect(document.querySelector('.vault-container')).toBeNull();
    expect(document.body.textContent).not.toContain('one-time secret token');
  });

  it('stays shut when the passphrase is wrong', async () => {
    app = mount(SecretPage, {
      target: document.body,
      props: {
        onNavigate: vi.fn(),
        openVault: async () => {
          throw new Error('sealed');
        },
      },
    });
    await tick();

    const input = document.querySelector('#vault-passphrase') as HTMLInputElement;
    input.value = 'wrong-phrase';
    (document.querySelector('.passphrase-form') as HTMLFormElement).requestSubmit();
    await tick();
    await tick();

    expect(document.querySelector('.passphrase-error')?.textContent).toContain('does not open');
    expect(document.querySelector('.vault-container')).toBeNull();
    expect(document.querySelector('.loader-overlay')).toBeNull();
  });

  it('opens after the passphrase decrypts and locks again', async () => {
    app = mount(SecretPage, {
      target: document.body,
      props: {
        onNavigate: vi.fn(),
        openVault: async (phrase: string) => {
          if (phrase !== 'right-phrase') throw new Error('sealed');
          return FIXTURE;
        },
      },
    });
    await tick();

    const input = document.querySelector('#vault-passphrase') as HTMLInputElement;
    input.value = 'right-phrase';
    (document.querySelector('.passphrase-form') as HTMLFormElement).requestSubmit();
    await vi.waitFor(() => {
      expect(document.querySelector('.loader-overlay')).not.toBeNull();
    }, 5000);

    (document.querySelector('.skip-btn') as HTMLButtonElement).click();
    await tick();
    expect(document.querySelector('.letter3d-stage')).not.toBeNull();

    (document.querySelector('.logout-btn') as HTMLButtonElement).click();
    await tick();
    expect(document.querySelector('#vault-passphrase')).not.toBeNull();
    expect(document.querySelector('.letter3d-stage')).toBeNull();
  });
});
