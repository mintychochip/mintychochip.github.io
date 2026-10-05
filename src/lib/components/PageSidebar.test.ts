// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, tick } from 'svelte';
import PageSidebar from './PageSidebar.svelte';

describe('PageSidebar', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    class MockIntersectionObserver {
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
    }
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  it('stays out of the way on the portfolio', () => {
    mount(PageSidebar, {
      target: document.body,
      props: {
        activeTab: 'portfolio',
      },
    });

    expect(document.querySelector('[aria-label="WORDLE page navigation"]')).toBeNull();
    expect(document.querySelector('.sidebar-wrapper')).toBeNull();
  });

  it('does not repeat the wordle controls that the game already shows', () => {
    mount(PageSidebar, {
      target: document.body,
      props: { activeTab: 'wordle' },
    });

    expect(document.querySelector('.sidebar-wrapper')).toBeNull();
  });

  it('lists secret sections after the page is open', async () => {
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

    const pageNav = document.querySelector('[aria-label="ANNIVERSARY page navigation"]');
    expect(pageNav?.textContent).toContain('Sealed Letter');
    expect(pageNav?.textContent).not.toContain("Bumpy's Vault");

    const lock = Array.from(document.querySelectorAll('.nav-link')).find((el) =>
      el.textContent?.includes('Lock Page')
    ) as HTMLAnchorElement;
    lock.click();
    await tick();
    expect(onSecretAction).toHaveBeenCalledWith('lock');
  });

});
