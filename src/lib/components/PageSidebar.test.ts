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

  it('renders site nav links from site config on portfolio', () => {
    mount(PageSidebar, {
      target: document.body,
      props: {
        activeTab: 'portfolio',
        onSelectTab: vi.fn(),
      },
    });

    const siteNav = document.querySelector('[aria-label="Site navigation"]');
    expect(siteNav).not.toBeNull();
    expect(siteNav?.textContent).toContain('github');
    expect(siteNav?.textContent).toContain('wordle');
    expect(document.querySelector('[aria-label="WORDLE page navigation"]')).toBeNull();
  });

  it('shows wordle page controls below site nav on wordle tab', async () => {
    const onWordleAction = vi.fn();
    mount(PageSidebar, {
      target: document.body,
      props: {
        activeTab: 'wordle',
        onSelectTab: vi.fn(),
        onWordleAction,
      },
    });
    await tick();

    expect(document.querySelector('[aria-label="Site navigation"]')).not.toBeNull();
    const pageNav = document.querySelector('[aria-label="WORDLE page navigation"]');
    expect(pageNav).not.toBeNull();
    expect(pageNav?.textContent).toContain('Daily Puzzle');

    const daily = Array.from(document.querySelectorAll('.page-nav .nav-link')).find((el) =>
      el.textContent?.includes('Daily Puzzle')
    ) as HTMLAnchorElement;
    daily.click();
    await tick();
    expect(onWordleAction).toHaveBeenCalledWith('daily');
  });

  it('switches to wordle when wordle site link is clicked', async () => {
    const onSelectTab = vi.fn();
    mount(PageSidebar, {
      target: document.body,
      props: {
        activeTab: 'portfolio',
        onSelectTab,
      },
    });
    await tick();

    const wordleLink = Array.from(document.querySelectorAll('.site-nav .nav-link')).find((el) =>
      el.textContent?.includes('wordle')
    ) as HTMLAnchorElement;
    wordleLink.click();
    await tick();
    expect(onSelectTab).toHaveBeenCalledWith('wordle');
  });
});
