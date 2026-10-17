// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, tick, unmount } from 'svelte';
import PageSidebar from './PageSidebar.svelte';

describe('PageSidebar', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('stays out of the way on the portfolio', () => {
    mount(PageSidebar, {
      target: document.body,
      props: {
        activeTab: 'portfolio',
      },
    });

    expect(document.querySelector('.sidebar-wrapper')).toBeNull();
  });

  it('does not repeat the wordle controls that the game already shows', () => {
    mount(PageSidebar, {
      target: document.body,
      props: { activeTab: 'wordle' },
    });

    expect(document.querySelector('.sidebar-wrapper')).toBeNull();
  });

  it('stays hidden on the secret tab until the vault is open', () => {
    mount(PageSidebar, {
      target: document.body,
      props: { activeTab: 'secret', secretRevealed: false },
    });

    expect(document.querySelector('.sidebar-wrapper')).toBeNull();
  });

  it('links the sections after the letter only once the letter is open', () => {
    const linksWith = (vaultUnlocked: boolean) => {
      const app = mount(PageSidebar, {
        target: document.body,
        props: { activeTab: 'secret', secretRevealed: true, vaultUnlocked },
      });
      const hrefs = Array.from(document.querySelectorAll('.page-nav a'), (a) => a.getAttribute('href'));
      unmount(app);
      return hrefs;
    };

    const sealed = linksWith(false);
    expect(sealed).toContain('#anniversary-letter');
    expect(sealed).not.toContain('#anniversary-passes');
    expect(linksWith(true)).toContain('#anniversary-passes');
  });

  it('locks the vault from the open vault navigation', async () => {
    const onSecretAction = vi.fn();
    mount(PageSidebar, {
      target: document.body,
      props: {
        activeTab: 'secret',
        secretRevealed: true,
        onSecretAction,
      },
    });
    await tick();

    const lock = Array.from(document.querySelectorAll<HTMLAnchorElement>('.page-nav a')).find((el) =>
      /lock/i.test(el.textContent ?? ''),
    );
    lock?.click();
    await tick();
    expect(onSecretAction).toHaveBeenCalledWith('lock');
  });
});
