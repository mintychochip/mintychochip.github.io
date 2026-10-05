// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, tick, unmount } from 'svelte';
import WordleGame from './WordleGame.svelte';

describe('WordleGame component', () => {
  let app: any;

  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    if (app) {
      unmount(app);
      app = null;
    }
  });

  it('mounts without crashing and renders grid and keyboard', async () => {
    app = mount(WordleGame, { target: document.body });
    await tick();
    expect(document.querySelector('.wordle-wrapper')).not.toBeNull();
    expect(document.querySelector('.grid-board')).not.toBeNull();
    expect(document.querySelector('.keyboard')).not.toBeNull();
    expect(document.querySelector('.game-title')?.textContent).toContain('WORDLE');
  });

  it('switches between daily and practice mode', async () => {
    app = mount(WordleGame, { target: document.body });
    await tick();

    const practiceBtn = document.querySelectorAll('.mode-btn')[1] as HTMLButtonElement;
    practiceBtn.click();
    await tick();

    expect(document.querySelector('.pixel-badge')?.textContent).toBe('Practice');

    const dailyBtn = document.querySelectorAll('.mode-btn')[0] as HTMLButtonElement;
    dailyBtn.click();
    await tick();

    expect(document.querySelector('.pixel-badge')?.textContent).toContain('#');
  });

  it('opens and closes help modal', async () => {
    app = mount(WordleGame, { target: document.body });
    await tick();

    const helpBtn = document.querySelector('button[aria-label="How to play"]') as HTMLButtonElement;
    expect(helpBtn).not.toBeNull();
    helpBtn.click();
    await tick();

    expect(document.querySelector('#help-title')?.textContent).toBe('How To Play');

    const closeBtn = document.querySelector('.close-btn') as HTMLButtonElement;
    closeBtn.click();
    await tick();

    expect(document.querySelector('#help-title')).toBeNull();
  });

  it('opens and closes settings modal and toggles settings', async () => {
    app = mount(WordleGame, { target: document.body });
    await tick();

    const settingsBtn = document.querySelector('button[aria-label="Settings"]') as HTMLButtonElement;
    expect(settingsBtn).not.toBeNull();
    settingsBtn.click();
    await tick();

    expect(document.querySelector('#settings-title')?.textContent).toBe('Settings');

    // Toggle sound
    const soundSwitch = document.querySelector('button[aria-label="Toggle sound effects"]') as HTMLButtonElement;
    expect(soundSwitch).not.toBeNull();
    const wasChecked = soundSwitch.getAttribute('aria-checked') === 'true';
    soundSwitch.click();
    await tick();
    expect(soundSwitch.getAttribute('aria-checked')).toBe(String(!wasChecked));
  });

  it('handles typing and backspace via keyboard events', async () => {
    app = mount(WordleGame, { target: document.body });
    await tick();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    await tick();

    const filledTiles = document.querySelectorAll('.tile.filled');
    expect(filledTiles.length).toBe(3);
    expect(filledTiles[0].textContent?.trim()).toBe('C');
    expect(filledTiles[1].textContent?.trim()).toBe('R');
    expect(filledTiles[2].textContent?.trim()).toBe('A');

    // Backspace
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
    await tick();

    const remainingTiles = document.querySelectorAll('.tile.filled');
    expect(remainingTiles.length).toBe(2);
    expect(remainingTiles[1].textContent?.trim()).toBe('R');
  });

  it('displays error toast when submitting word with fewer than 5 letters', async () => {
    app = mount(WordleGame, { target: document.body });
    await tick();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'i', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await tick();

    expect(document.querySelector('.toast')?.textContent).toContain('Not enough letters');
  });

  it('displays error toast when word is not in word list', async () => {
    app = mount(WordleGame, { target: document.body });
    await tick();

    for (const ch of 'zzzzz') {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true }));
    }
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await tick();

    expect(document.querySelector('.toast')?.textContent).toContain('Not in word list');
  });

  it('allows clicking virtual keyboard keys to type and enter', async () => {
    app = mount(WordleGame, { target: document.body });
    await tick();

    const findKey = (label: string) => {
      const keys = Array.from(document.querySelectorAll<HTMLButtonElement>('.keyboard button'));
      return keys.find((k) => k.textContent?.trim() === label);
    };

    findKey('P')?.click();
    findKey('L')?.click();
    findKey('A')?.click();
    findKey('N')?.click();
    findKey('T')?.click();
    await tick();

    const filledTiles = document.querySelectorAll('.tile.filled');
    expect(filledTiles.length).toBe(5);

    findKey('ENTER')?.click();
    await tick();

    // The row should now be revealed!
    const revealedTiles = document.querySelectorAll('.tile.revealed');
    expect(revealedTiles.length).toBe(5);
  });

  it('keeps the vault closed when Bumpy the frog is clicked', async () => {
    const onNavigateToSecret = vi.fn();
    window.location.hash = '#wordle';
    app = mount(WordleGame, {
      target: document.body,
      props: { onNavigateToSecret },
    });
    await tick();

    const bumpyFrog = document.querySelector('.frog-container') as HTMLButtonElement;
    expect(bumpyFrog).not.toBeNull();
    expect(bumpyFrog.getAttribute('aria-label')).toBe('Bumpy the Frog');
    bumpyFrog.click();
    await new Promise((r) => setTimeout(r, 500));

    expect(onNavigateToSecret).not.toHaveBeenCalled();
    expect(window.location.hash).toBe('#wordle');
    expect(document.body.textContent).not.toContain('secret vault');
  });

  it('opens the vault door when BUMPY is entered', async () => {
    const onNavigateToSecret = vi.fn();
    app = mount(WordleGame, {
      target: document.body,
      props: { onNavigateToSecret },
    });
    await tick();

    for (const ch of 'bumpy') {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true }));
    }
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await tick();

    expect(onNavigateToSecret).not.toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 1200));
    expect(onNavigateToSecret).toHaveBeenCalledOnce();
    expect(onNavigateToSecret.mock.calls[0]).toEqual([]);
  });
});
