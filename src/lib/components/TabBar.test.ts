// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, tick } from 'svelte';
import TabBar from './TabBar.svelte';

describe('TabBar component', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('shows current area and the new tab popout link', () => {
    const onSelectTab = vi.fn();
    mount(TabBar, {
      target: document.body,
      props: {
        activeTab: 'portfolio',
        onSelectTab,
      },
    });

    expect(document.body.textContent).toContain('Portfolio');

    const popout = document.querySelector('.tab-popout') as HTMLAnchorElement;
    expect(popout).not.toBeNull();
    expect(popout.getAttribute('target')).toBe('_blank');
    expect(popout.getAttribute('href')).toBe('#wordle');
    expect(popout.getAttribute('rel')).toContain('noopener');
  });

  it('reflects wordle and secret active areas', async () => {
    const onSelectTab = vi.fn();

    document.body.innerHTML = '';
    mount(TabBar, {
      target: document.body,
      props: {
        activeTab: 'wordle',
        onSelectTab,
      },
    });
    await tick();
    expect(document.body.textContent).toContain('Wordle');

    document.body.innerHTML = '';
    mount(TabBar, {
      target: document.body,
      props: {
        activeTab: 'secret',
        onSelectTab,
      },
    });
    await tick();
    expect(document.body.textContent).toContain('Happy Anniversary');
  });
});
