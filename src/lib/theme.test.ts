// @vitest-environment jsdom
import { describe, it, expect, beforeEach, beforeAll, afterEach, vi } from 'vitest';

interface ThemeStore {
  current: 'system' | 'light' | 'dark';
  effective: 'light' | 'dark';
  set(next: 'system' | 'light' | 'dark'): void;
  toggle(): void;
  listen(): void;
}

function createMql(matches = false) {
  return {
    matches,
    media: '(prefers-color-scheme: dark)',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  } as unknown as MediaQueryList;
}

const matchMedia = vi.fn<(query: string) => MediaQueryList>();
vi.stubGlobal('matchMedia', matchMedia);

let theme: ThemeStore;

describe('theme store', () => {
  beforeAll(async () => {
    matchMedia.mockReturnValue(createMql(false));
    // Dynamic import is required here because theme.svelte.ts reads
    // window.matchMedia at module evaluation time; we must stub the global
    // before the module is loaded.
    const mod = await import('./theme.svelte');
    theme = mod.theme as ThemeStore;
  });

  beforeEach(() => {
    matchMedia.mockReturnValue(createMql(false));
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.head.innerHTML = '';
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = '';
    document.head.appendChild(meta);
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.documentElement.removeAttribute('data-theme');
    document.head.innerHTML = '';
  });

  it('initializes to system and resolves to light by default', () => {
    expect(theme.current).toBe('system');
    expect(theme.effective).toBe('light');
  });

  it('set stores preference, updates DOM and theme-color meta', () => {
    theme.set('dark');
    expect(theme.current).toBe('dark');
    expect(theme.effective).toBe('dark');
    expect(localStorage.getItem('theme-preference')).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#121212');
  });

  it('set to system resolves against matchMedia', () => {
    matchMedia.mockReturnValue(createMql(true));
    theme.set('system');
    expect(theme.current).toBe('system');
    expect(theme.effective).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('system');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#121212');
  });

  it('toggle flips effective theme', () => {
    matchMedia.mockReturnValue(createMql(false));
    theme.set('light');
    theme.toggle();
    expect(theme.current).toBe('dark');
    theme.toggle();
    expect(theme.current).toBe('light');
  });
});
