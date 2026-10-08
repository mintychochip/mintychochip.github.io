// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, tick } from 'svelte';
import TabBar from './TabBar.svelte';

describe('TabBar component', () => {
  beforeEach(() => {

   document.body.innerHTML = '';
    class MockIntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  it('lists the site sections and keeps a wordle popout', () => {
    const onSelectTab = vi.fn();
    mount(TabBar, {
      target: document.body,
      props: {
        activeTab: 'portfolio',
        onSelectTab,
      },
    });

    const nav = document.querySelector('[aria-label="Main site navigation"]');
    expect(nav?.textContent).toContain('github');
    expect(nav?.textContent).toContain('wordle');
    expect(nav?.textContent).not.toContain('Happy Anniversary');

    const popout = document.querySelector('.tab-popout') as HTMLAnchorElement;
    expect(popout).not.toBeNull();
    expect(popout.getAttribute('target')).toBe('_blank');
    expect(popout.getAttribute('href')).toBe('#wordle');
    expect(popout.getAttribute('rel')).toContain('noopener');
  });

  it('opens wordle from the nav link', async () => {
    const onSelectTab = vi.fn();
    mount(TabBar, {
      target: document.body,
      props: { activeTab: 'portfolio', onSelectTab },
    });
    await tick();

    const wordle = Array.from(document.querySelectorAll('.links a')).find((el) => el.textContent === 'wordle') as HTMLAnchorElement;
    wordle.click();
    await tick();
    expect(onSelectTab).toHaveBeenCalledWith('wordle');
  });

  it('names the secret area only while it is open', async () => {
    const onSelectTab = vi.fn();
    mount(TabBar, {
      target: document.body,
      props: { activeTab: 'secret', onSelectTab },
    });
    await tick();
    expect(document.body.textContent).toContain('Happy Anniversary');
  });
});
