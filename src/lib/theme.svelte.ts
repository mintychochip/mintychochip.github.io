const KEY = 'theme-preference';
export type ThemePreference = 'system' | 'light' | 'dark';

class ThemeStore {
  current = $state<ThemePreference>(read());

  public get effective(): 'light' | 'dark' {
    if (this.current === 'system') {
      return prefersDark() ? 'dark' : 'light';
    }
    return this.current;
  }

  public set(next: ThemePreference) {
    this.current = next;
    localStorage.setItem(KEY, next);
    document.documentElement.dataset.theme = next;
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', this.effective === 'dark' ? '#121212' : '#f7f7f5');
    broadcast();
  }

  public toggle() {
    this.set(this.effective === 'dark' ? 'light' : 'dark');
  }

  public listen() {
    window.matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => {
        if (this.current === 'system') { syncDom(); broadcast(); }
      });
    window.addEventListener('storage', (event) => {
      if (event.key !== KEY) return;
      this.current = read();
      syncDom();
      broadcast();
    });
  }
}

function read(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(KEY);
  return stored === 'system' || stored === 'light' || stored === 'dark' ? stored : 'system';
}
function prefersDark() { return window.matchMedia('(prefers-color-scheme: dark)').matches; }
function syncDom() { document.documentElement.dataset.theme = theme.current; document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.effective === 'dark' ? '#121212' : '#f7f7f5'); }

const listeners = new Set<() => void>();
function broadcast() { listeners.forEach((fn) => fn()); }

export const theme = new ThemeStore();
theme.listen();
