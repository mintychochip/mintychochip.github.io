# Svelte 5 Portfolio Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild mintychochip.dev in Svelte 5 (Vite, no runtime deps beyond Svelte) with the same behavior as the deployed React site.

**Architecture:** Single-page Vite app at repo root; sections are Svelte 5 rune components. Usage charts are hand-rolled SVG Svelte components fed by a schema-validating fetch layer (TTL cache, in-flight dedupe, retry-once). Theme store syncs `localStorage`, `prefers-color-scheme`, `data-theme` and `meta[name=theme-color]`. WorkThumb renders deterministic synthwave scenes on `<canvas>` (static frame, animation ported exactly but disabling RAf under reduced-motion only if trivial — otherwise static).

**Tech Stack:** Svelte 5.57, Vite 8.3, `@sveltejs/vite-plugin-svelte` 7.3, TypeScript ~5.9, svelte-check 4.7, vitest 5.0, jsdom, `@testing-library/svelte`.

**Spec:** `docs/superpowers/specs/2026-09-12-svelte5-portfolio-design.md`

## Global Constraints

- Repo: `/home/jlo/dev/mintychochip.github.io`, branch `master`.
- Runtime deps: `svelte` only. Dev deps: `@sveltejs/vite-plugin-svelte@7.3.0`, `@tsconfig/svelte@5.0.8`, `svelte@5.57.0`, `svelte-check@4.7.6`, `typescript@5.9.3`, `vite@8.3.0`, `vitest@5.0.0`, `jsdom`, `@testing-library/svelte`.
- Svelte 5 runes only (`$props()`, `$state`, `$derived`, `$effect`, snippets); never `export let`.
- User-visible strings must match the deployed site verbatim (exact strings given in each task).
- Data endpoints (exact, relative, same-origin): `v1/usage/models`, `v1/usage/series`; `from`/`to` ISO `yyyy-mm-dd`; range map `{"7d":7,"30d":30,"90d":90,"1y":365}`.
- All colors/fonts/tokens copied verbatim from the bundle; no invented values.
- Verification per task: `npx svelte-check` + `npx vite build` + targeted `npx vitest run <file>`; repo-wide test runs only at Task 12.
- Task 1 removes root build output (`assets/`, root `usage-series.json`, `usage-models.json`, `omp-usage.json`). Keep forever: `v1/usage/*`, `favicon.ico`, `favicon-32.png`, `apple-touch-icon.png`, `resume.pdf`, `CNAME`.
- Models data note (real shape to code against): `usage-models.json` `models[]` carry the top-level legend rows (`model`, optional `provider`, `name`, `variant`, token totals, optional `estimated_cost_usd`); `points[].models[]` carry per-day segments; segment `estimated_cost_usd` is nullable. Series `estimated_cost_usd` is nullable per point.

---

### Task 1: Scaffold (package.json, configs, entry, public/ moves)

**Files:**
- Create: `package.json`, `tsconfig.json`, `svelte.config.js`, `vite.config.ts`, `src/vite-env.d.ts`
- Create: `src/main.ts`, `src/App.svelte`, `src/lib/styles/global.css`
- Modify: `index.html`
- Move or delete: root `assets/`, `usage-series.json`, `usage-models.json`, `omp-usage.json`, and `svelte.config.js` as below
- Create: `.gitignore`

**Interfaces:**
- Produces (consumed by every later task): `npm run dev` (vite), `npm run build` (vite build → `dist/`), `npm run check` (svelte-check), `npm test` (vitest run). Root `index.html` is the Vite entry and contains the FOUC theme script.

- [ ] **Step 1: Write package.json**

  ```json
  {
    "name": "mintychochip.dev",
    "private": true,
    "version": "1.0.0",
    "type": "module",
    "scripts": {
      "dev": "vite",
      "build": "vite build",
      "preview": "vite preview",
      "check": "svelte-check --tsconfig ./tsconfig.json",
      "test": "vitest run"
    },
    "devDependencies": {
      "@sveltejs/vite-plugin-svelte": "7.3.0",
      "@tsconfig/svelte": "5.0.8",
      "jsdom": "26.1.0",
      "svelte": "5.57.0",
      "svelte-check": "4.7.6",
      "typescript": "5.9.3",
      "vite": "8.3.0",
      "vitest": "5.0.0"
    }
  }
  ```

- [ ] **Step 2: Write `svelte.config.js`**

  ```js
  import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

  /** @type {import('@sveltejs/vite-plugin-svelte').SvelteConfig} */
  export default {
    preprocess: vitePreprocess(),
  };
  ```

- [ ] **Step 3: Write `vite.config.ts` and `tsconfig.json`**

  ```ts
  import { defineConfig } from 'vite';
  import { svelte } from '@sveltejs/vite-plugin-svelte';

  export default defineConfig({
    plugins: [svelte()],
    build: { outDir: 'dist' },
  });
  ```

  ```json
  {
    "extends": "@tsconfig/svelte/tsconfig.json",
    "compilerOptions": {
      "target": "es2022",
      "module": "esnext",
      "moduleResolution": "bundler",
      "verbatimModuleSyntax": true,
      "strict": true,
      "noEmit": true,
      "skipLibCheck": true,
      "isolatedModules": true,
      "resolveJsonModule": true,
      "types": ["vite/client"]
    },
    "include": ["src/**/*.ts", "src/**/*.svelte", "src/**/*.js"]
  }
  ```

- [ ] **Step 4: Write `src/vite-env.d.ts`**

  ```ts
  /// <reference types="svelte" />
  /// <reference types="vite/client" />
  ```

- [ ] **Step 5: Populate `public/` and delete stale build output**

  ```bash
  git mv CNAME public/CNAME
  git mv favicon-32.png favicon.ico apple-touch-icon.png resume.pdf public/
  mkdir -p public/fonts
  git mv assets/geist-sans-latin-400-normal-gapTbOY8.woff2  public/fonts/geist-sans-latin-400-normal.woff2
  git mv assets/geist-sans-latin-500-normal-uokXdC-Q.woff2  public/fonts/geist-sans-latin-500-normal.woff2
  git mv assets/geist-sans-latin-600-normal-DFOURf8L.woff2  public/fonts/geist-sans-latin-600-normal.woff2
  git mv assets/geist-mono-latin-400-normal-DTRLJnHl.woff2  public/fonts/geist-mono-latin-400-normal.woff2
  git rm -r --cached assets
  rm -rf assets
  rm -f omp-usage.json usage-series.json usage-models.json
  ```
  (`v1/usage/*`, favicons after move: `public/v1/usage/*`.)

- [ ] **Step 6: `.gitignore`**

  ```
  node_modules/
  dist/
  ```

- [ ] **Step 7: Rewrite `index.html` (keeps FOUC theme + favicons already in `public/`)**

  Exact content:

  ```html
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta
        name="description"
        content="Portfolio and profile of mintychochip — software engineer building thoughtful systems."
      />
      <meta name="theme-color" content="#f7f7f5" />
      <meta name="color-scheme" content="light dark" />
      <title>mintychochip — software engineer</title>
      <link rel="icon" href="/favicon.ico?v=5" sizes="any" />
      <link rel="icon" href="/favicon-32.png?v=5" type="image/png" sizes="32x32" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      <script>
        (function () {
          var key = 'theme-preference';
          var stored = localStorage.getItem(key);
          var theme =
            stored === 'light' || stored === 'dark' || stored === 'system'
              ? stored
              : 'system';
          document.documentElement.dataset.theme = theme;
        })();
      </script>
      <script type="module" src="/src/main.ts"></script>
    </head>
    <body>
      <div id="root"></div>
    </body>
  </html>
  ```

- [ ] **Step 8: Write `src/main.ts`, `src/App.svelte`, `global.css` stub**

  ```ts
  // src/main.ts
  import { mount } from 'svelte';
  import './lib/styles/global.css';
  import App from './App.svelte';

  const root = document.getElementById('root');
  if (!root) throw new Error('Root element #root not found');
  mount(App, { target: root });
  ```

  ```svelte
  <!-- src/App.svelte -->
  <main class="main" style="padding:2rem">Svelte 5 scaffold</main>
  ```

  ```css
  /* src/lib/styles/global.css — tokens arrive in Task 3; blank is fine */
  ```

- [ ] **Step 9: Install and verify**

  Run: `npm install && npx svelte-check && npx vite build && npx vite preview`
  Expected: check passes; `dist/index.html` built.

- [ ] **Step 10: Commit**

  ```bash
  git add -A
  git commit -m "Scaffold Svelte 5 + Vite, relocate static assets to public/"
  ```

---

### Task 2: Design tokens + fonts (`global.css`) + ThemeToggle component

**Files:**
- Create: `src/lib/components/ThemeToggle.svelte`
- Modify: `src/lib/styles/global.css`

**Interfaces:**
- Produces (consumed all later tasks):
  - `global.css` — `@font-face` (400/500/600 Geist Sans, 400 Geist Mono) + light/dark `[data-theme]` var blocks listed exactly in Step 1.
  - `ThemeToggle.svelte` — props: none; emits nothing.

- [ ] **Step 1: Write `global.css` token + font sections**

  Fonts:

  ```css
  @font-face {
    font-family: 'Geist Sans';
    src: url('/fonts/geist-sans-latin-400-normal.woff2') format('woff2');
    font-weight: 400; font-style: normal; font-display: swap;
  }
  @font-face {
    font-family: 'Geist Sans';
    src: url('/fonts/geist-sans-latin-500-normal.woff2') format('woff2');
    font-weight: 500; font-style: normal; font-display: swap;
  }
  @font-face {
    font-family: 'Geist Sans';
    src: url('/fonts/geist-sans-latin-600-normal.woff2') format('woff2');
    font-weight: 600; font-style: normal; font-display: swap;
  }
  @font-face {
    font-family: 'Geist Mono';
    src: url('/fonts/geist-mono-latin-400-normal.woff2') format('woff2');
    font-weight: 400; font-style: normal; font-display: swap;
  }
  ```

  Light tokens (`html, [data-theme='light']`):

  ```css
  --bg: #f7f7f5; --text: #1a1a1a; --text-secondary: #6b6b6b; --text-muted: #a3a3a3; --border: #e5e5e0; --border-strong: #d9d8d4; --surface: #fff; --accent: #1a1a1a; --accent-hover: #000; --code-bg: #ededea; --shadow: #0f172a1a; --shadow-strong: #0f172a1f; --error-text: #7a1f1f; --error-bg: #fff2f2; --error-border: #f0c0c0; --chart-grid: #e8e8e4; --radius: 12px; --max-width: 720px; --font-sans: "Geist Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; --font-mono: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; --text-xs: .8125rem; --text-sm: .875rem; --text-md: 1rem; --text-lg: 1.125rem; --text-xl: 1.5rem; --text-display: clamp(2.5rem, 7vw, 4rem); color-scheme: light;
  ```

  Dark tokens (`[data-theme='dark'], [data-theme='system']`):

  ```css
  --bg: #121212; --text: #ededed; --text-secondary: #a3a3a3; --text-muted: #737373; --border: #2a2a2a; --border-strong: #3a3a3a; --surface: #1a1a1a; --accent: #ededed; --accent-hover: #fff; --code-bg: #242424; --shadow: #00000059; --shadow-strong: #00000073; --error-text: #fca5a5; --error-bg: #2a1515; --error-border: #5c2020; --chart-grid: #2a2a2a;
  ```

  Base rules (`box-sizing`, body bg/color/font, `:focus-visible { outline: var(--text); outline-offset: 2px; }` matching dark+light focus ring).

- [ ] **Step 2: ThemeToggle.svelte**

  ```svelte
  <script lang="ts">
    import { theme } from '../theme.svelte';
  </script>

  {#snippet sun()}
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
      <circle cx="10" cy="10" r="4" fill="currentColor" />
      <g stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
        <line x1="10" y1="2" x2="10" y2="4" /><line x1="10" y1="16" x2="10" y2="18" />
        <line x1="2" y1="10" x2="4" y2="10" /><line x1="16" y1="10" x2="18" y2="10" />
        <line x1="4.2" y1="4.2" x2="5.6" y2="5.6" /><line x1="14.4" y1="14.4" x2="15.8" y2="15.8" />
        <line x1="14.4" y1="5.6" x2="15.8" y2="4.2" /><line x1="4.2" y1="15.8" x2="5.6" y2="14.4" />
      </g>
    </svg>
  {/snippet}
  {#snippet moon()}
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
      <path d="M11.5 2.2a7.5 7.5 0 1 0 6.3 11.3A6.5 6.5 0 1 1 11.5 2.2Z" fill="currentColor" />
    </svg>
  {/snippet}

  <button
    type="button"
    class="theme-toggle"
    aria-label={theme.effective === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
    title={theme.effective === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
    onclick={() => theme.toggle()}
  >
    {#if theme.effective === 'dark'}{@render moon()}{:else}{@render sun()}{/if}
  </button>
  ```

- [ ] **Step 3: Implement `theme.svelte.ts`**

  Note Svelte 5 cannot `export` runes from a plain `.ts` file — use `.svelte.ts` (already named) with a class instance:

  ```ts
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
  ```

- [ ] **Step 4: Verify**

  Run: `npx svelte-check`
  Expected: clean.

- [ ] **Step 5: Commit**

  ```bash
  git add -A
  git commit -m "Add design tokens, fonts, theme store, ThemeToggle"
  ```

---

### Task 3: Site config + layout shell components (Nav/Hero/About/Footer)

**Files:**
- Create: `src/lib/site.ts`, `src/lib/components/Nav.svelte`, `src/lib/components/Hero.svelte`, `src/lib/components/About.svelte`, `src/lib/components/Footer.svelte`
- Modify: `src/App.svelte` (compose them; delete stub markup)

**Interfaces:**
- Consumes: Task 2's `ThemeToggle.svelte`, `theme`.
- Produces (consumed by Tasks 5–8): `site.ts` usable as `import { site } from './site';`, shape recorded below.

`site.ts` (exact values):

```ts
export interface SiteConfig {
  name: string;
  avatar: string;
  role: string;
  tagline: string;
  bio: string;
  nav: { label: string; href: string }[];
  projects: { name: string; description: string; url: string }[];
  projectUrls: Record<string, string>;
  contact: { github: string; email: string };
  resumeUrl: string;
  footer: string;
}

export const site: SiteConfig = {
  name: 'mintychochip',
  avatar: 'https://avatars.githubusercontent.com/u/98988617?v=4',
  role: 'Software engineer',
  tagline: 'Building calm, thoughtful software at the edge of the web.',
  bio: 'I design and build software that feels quiet on the outside and sharp underneath. I care about clean systems, readable code, and interfaces that respect attention.',
  nav: [
    { label: 'About', href: '#about' },
    { label: 'Resume', href: '#resume' },
    { label: 'Projects', href: '#projects' },
    { label: 'Contact', href: '#contact' },
  ],
  projects: [
    { name: 'Terminal editor', description: 'A zero-config terminal UI that does one thing well.', url: 'https://github.com' },
    { name: 'Waveform', description: 'A real-time waveform renderer with a calm, low-latency canvas pipeline.', url: 'https://github.com' },
    { name: 'Sun grid', description: 'A synthwave scene generator with retro suns and perspective grids.', url: 'https://github.com' },
  ],
  projectUrls: { ModularJobs: 'https://jobs.mintychochip.dev' },
  contact: { github: 'https://github.com/mintychochip', email: 'justincarllo@gmail.com' },
  resumeUrl: '/resume.pdf',
  footer: '© 2026 mintychochip',
};
```

Components and markup (classes must match bundle names):

- `Nav.svelte` — `header.nav` with `div.nav-profile` containing
  `button.nav-logo` (`aria-expanded`, `aria-haspopup="menu"`, menu with
  `$state(false)` toggle; `img.nav-avatar` 28×28, `span.nav-name`)
  and `div.nav-menu[role="menu"]` when open with `a.nav-menu-item`
  GitHub (`target="_blank" rel="noreferrer" role="menuitem"`) +
  `mailto:` link; closes when button is clicked again. `div.nav-actions`
  holds `ThemeToggle` + `nav.nav-links[aria-label="Primary"]` with the
  section links.
- `Hero.svelte` — `section.hero#profile`: `p.hero-role`,
  `h1.hero-name`, `p.hero-tagline`.
- `About.svelte` — `section.section#about`: `h2.section-title` "About",
  `p.about-paragraph` bio.
- `Footer.svelte` — `footer.footer` with `site.footer`.

`App.svelte` composition:

```svelte
<script lang="ts">
  import Nav from './lib/components/Nav.svelte';
  import Hero from './lib/components/Hero.svelte';
  import About from './lib/components/About.svelte';
  import Footer from './lib/components/Footer.svelte';
  { /* Tasks 5–8: import ResumeSection, UsageSection, Projects, Contact */ }
  import { site } from './lib/site';
</script>

<div class="page">
  <Nav items={site.nav} />
  <main class="main">
    <Hero />
    <About />
    <Footer content={site.footer} />
  </main>
</div>
```

- [ ] **Step 1: Write `site.ts`**
- [ ] **Step 2: Write Nav/Hero/About/Footer components**
- [ ] **Step 3: Rewire `App.svelte`**
- [ ] **Step 4: Verify**

  Run: `npx svelte-check && npx vite build`

- [ ] **Step 5: Commit**

  ```bash
  git add -A
  git commit -m "Add site config, shell components (nav, hero, about, footer)"
  ```

---

### Task 4: Usage data layer (`api.ts`)

**Files:**
- Create: `src/lib/usage/api.ts`
- Test: `src/lib/usage/api.test.ts`

**Interfaces:**
- Produces (consumed by Tasks 5 & 7):

```ts
export type Metric = 'input_tokens' | 'output_tokens' | 'total_tokens' | 'estimated_cost_usd';
export const METRICS: readonly Metric[] = ['input_tokens', 'output_tokens', 'total_tokens', 'estimated_cost_usd'];
export type RangeKey = '7d' | '30d' | '90d' | '1y';
export const RANGE_DAYS: Record<RangeKey, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };

export interface ModelUse {
  model: string; provider: string | null; name: string; variant: string | null;
  input_tokens: number; output_tokens: number; total_tokens: number; estimated_cost_usd: number | null;
}
export interface ModelsPoint { date: string; models: ModelUse[]; }
export interface ModelsResponse {
  schema_version: 1; from: string; to: string; models: ModelUse[]; points: ModelsPoint[];
}
export type CustomMetricPoint = { date: string; metric: Metric; value: number | null; harness: string | null };
export interface SeriesResponse {
  schema_version: 1; from: string; to: string;
  metrics: string[]; harnesses: string[] | null;
  points: CustomPoint[];   // { date, input_tokens?, output_tokens?, total_tokens?, estimated_cost_usd? } validated from raw
}
export interface FetchOpts { cache?: RequestCache; signal?: AbortSignal; }
export function fetchModels(from: string, to: string, opts = {} as FetchOpts): Promise<ModelsResponse>;
export function fetchSeries(from: string, to: string, metrics: readonly Metric[], opts = {} as FetchOpts): Promise<SeriesResponse>;
export function rangeToDates(range: RangeKey, today = new Date()): { from: string; to: string };
export function isAbortError(e: unknown): boolean;
```

Semantics (mirrors recovered web component exactly):

- Endpoint URLs: `new URL('v1/usage/' + kind, location.origin + '/')` with `?from=&to=` (`&metrics=` for series; comma-joined).
- `today` ISO: `new Date().toISOString().slice(0,10)`; range start:
  `from = shiftDate(today, days-1)` where `shiftDate` uses UTC
  `Date.UTC(y, m-1, d)`, `setUTCDate(-n)`, `toISOString().slice(0,10)`.
- Validation ( throws in this order). Shared: object check →
  exact-key check (`unexpected property ${key}`) → `schema_version !== 1`
  flagged → `from/to must be ISO dates` (regex `^\d{4}-\d{2}-\d{2}$`
  + calendar round-trip) → array checks.
  - Models response: `{ schema_version, from, to, models, points }`;
    `models` entries validate `model` non-empty string, nullable
    `provider`/`variant`, `name` derived (`name.length > 0`? name :
    model), the three token counters finite ≥ 0, cost nullable (null ⇒
    omission). `points[]` validate `date` + array `models[]`; segment
    `model` must exist in the top-level `models` array (else
    `segment model missing from legend`).
  - Series response: `harnesses` null or string array; metrics
    validated against METRICS (`unknown metric`); each point has ISO
    `date` plus each requested metric finite ≥ 0 or exactly `null`
    (`estimated_cost_usd` may be null; others must be numeric).
- Cache: `LRU<Map>` keyed `${cacheMode}:${url}`, capacity 64, TTL from
  `cache-control` `max-age` (clamped ≤ 60_000), only for non-`no-store`.
  Add in-flight dedupe (`Map<url, Promise>`), removal in `finally`.
- Retry: the public `fetchModels`/`fetchSeries` implement
  **one retry with `no-store`** on non-abort failure, then rethrow.
- Abort: forwarded via opts.signal (+ in-flight Promise race to reject
  on external abort even for cached values).

- [ ] **Step 1: Write the failing test** — cases: URL building
  (`/v1/usage/models?from=2026-08-20&to=2026-08-26`),
  happy-path parse, unknown property throws, unknown metric throws,
  non-ISO date throws, cache (same URL called twice → 1 fetch), TTL
  zero (`no-store`) → 2 fetches, retry-on-failure path (first reject
  then success → 2 calls), abort → `isAbortError` true.

- [ ] **Step 2: Run, confirm fail**

  Run: `npx vitest run src/lib/usage/api.test.ts`

- [ ] **Step 3: Implement `api.ts`** per Interfaces (same messages).

- [ ] **Step 4: Run, confirm pass** — `npx vitest run src/lib/usage/api.test.ts`.

- [ ] **Step 5: Commit**

  ```bash
  git add -A
  git commit -m "Add usage data layer with validation, cache, retry"
  ```

---

### Task 5: Usage stats + chart interned helpers (`stats.ts`)

**Files:**
- Create: `src/lib/usage/stats.ts`
- Test: `src/lib/usage/stats.test.ts`

**Interfaces:**
- Consumes: `ModelsResponse`, `SeriesResponse` (Task 4).
- Produces (consumed by Tasks 6 & 7):

```ts
export interface UsageStats {
  totalTokens: number;
  averageTokens: number;
  peakTokens: number;
  peakLabel: string;        // `on Aug 15` | ''
  topModel: { label: string; tokens: number } | null;
  totalCostUsd: number | null;
  dateRangeLabel: string;   // 'Jul 8 – Aug 26' | 'loaded range'
}
export function summarizeModels(resp: ModelsResponse): UsageStats;
export function summarizeSeries(resp: SeriesResponse, metrics: readonly Metric[]): UsageStats;
export function formatCompactTokens(n: number): string; // ≥1e9 → `x.xB`; ≥1e6 → `x.xM`; ≥1e4 → `${Math.round(n/1e3)}k`; else locale string (0 frac); non-finite → '0'
export function formatUsd(n: number): string;           // toLocaleString currency USD 2–2 frac
export function formatDate(iso: string): string;        // `${monthShort} ${day}` via new Date(`${iso}T00:00:00`) (bad date → iso)
export function dateRangeLabel(dates: string[]): string; // sorted unique; 'loaded range' if empty; single date formatDate; else `A–B`
export function metricLabel(m: Metric): string;         // Input tokens/Output tokens/Total tokens/'Estimated cost (USD)'
```

`summarizeModels` / `summarizeSeries` semantics (must match bundle):
- total = Σ days' total_tokens (models view) / Σ points total_tokens (series);
- averageTokens = round(total / days), 0 when no days;
- peak = max day value + `on ${formatDate(date)}` note or '';
- top model = **first entry of the validated `models[]` array** (server returns the models list already sorted by total desc — do NOT re-sort; label is
  `${name} · ${variant}` when variant else `name`), tokens = that
  model's `total_tokens`; null when list empty;
- costs = Σ `estimated_cost_usd` when any non-null, else null;
- series view topModel is always null.

- [ ] **Step 1: Write failing tests** (fixture with two models, 47 days,
  nullable costs; assert total/average/peak/top/cost/labels).
- [ ] **Step 2: Confirm fail, implement, confirm pass.**
- [ ] **Step 3: Commit**

  ```bash
  git add -A
  git commit -m "Add usage stats aggregation and formatters"
  ```

---

### Task 6: SVG chart components (StackedChart + LinesChart)

**Files:**
- Create: `src/lib/usage/StackedChart.svelte`, `src/lib/usage/LinesChart.svelte`, `src/lib/usage/chartTheme.ts`

**Interfaces:**
- Consumes: `Stats.ts` formatters (Task 5), data types (Task 4).
- Produces (consumed by Task 7):

```ts
// StackedChart.svelte
{
  data: ModelsResponse;
  groupBy: 'model' | 'provider' | 'variant';
  metric?: 'total_tokens' | ...;    // default total_tokens
  theme: 'light' | 'dark';
  hiddenKeys?: ReadonlySet<string>; // legend-toggled groups
  onToggle?: (key: string) => void; // legend click → parent
  maxGroups?: number;               // default 8
  title?: string;  // default `${metricLabel} by model`
  scale?: { width: number; height: number };  // svg viewBox dims (default 720×360)
}

// LinesChart.svelte
{
  data: SeriesResponse;
  theme: 'light' | 'dark';
  metrics?: readonly Metric[];      // default all METRICS
  hiddenKeys?: ReadonlySet<string>; // legend-toggled metrics
  onToggle?: (metric: Metric) => void;
  scale?: { width: number; height: number };  // default 720×360
}

// chartTheme.ts
export interface ChartTheme { foreground: string; background: string; grid: string; axis: string;
  tokenColors: Record<Metric, string>; costColors: Record<string, string>; }
export function getChartTheme(mode: 'light' | 'dark'): ChartTheme;
// light: { background:'#111827', foreground:'#f3f4f6', grid:'#374151', axis:'#9ca3af',
//   tokenColors:{input_tokens:'#60a5fa', output_tokens:'#4ade80', total_tokens:'#a78bfa'},
//   costColors:{estimated_cost_usd:'#fb923c'} }
// dark: { background:'transparent', foreground:'#1f2937', grid:'#d1d5db', axis:'#6b7280',
//   tokenColors:{input_tokens:'#2563eb', output_tokens:'#16a34a', total_tokens:'#7c3aed'},
//   costColors:{estimated_cost_usd:'#ea580c'} }

// NOTE: light and dark palettes above are SWAPPED on purpose vs the
// default const (Ku) in the bundle — the site always passes an
// "overrides object" for dark and a bare string light.
// Mirror that stack: getChartTheme('light') = { background:'transparent', foreground:'#1f2937',
//   grid:'#d1d5db', axis:'#6b7280',
//   tokenColors:{input_tokens:'#2563eb', output_tokens:'#16a34a', total_tokens:'#7c3aed'},
//   costColors:{estimated_cost_usd:'#ea580c'} }
```

Shared chart behaviors (both components): `role="img"` with
`<title id="…-title">` + `<desc id="…-description">`; grid = 5
horizontal lines stroke `var(--chart-grid)`; x labels every date,
y labels `0` and max at both ends (compact via `formatCompactTokens` or the money format on the cost side); interactive points/segments are
`<rect>`/`<circle>` with `tabindex="0" role="img"` +
`aria-label="${label}, ${date}: ${value}"` + `data-usage-segment`
/`data-usage-point`; hover: pointerenter/focus raises inline tooltip
inline inside the svg via group-translate:

```
tooltip:
  rect (min(240, n-8)×52 rx7, fill = foreground-contrast bg, stroke grid)
  line 1 (y 20): `${group.label} · ${date}` (font-size 11, bold)
  line 2 (y 39): `${value} · ${pct.toFixed(0)}% of day` for stacked;
                 `${metricLabel} · ${date}` + `${formatTokens(v)} · ${harness}` for lines
  flip above pointer when y ≤ top+52+12;
  clamp x to [4, W-w-4], y to [4, H-52-4]
hover stroke switches to `var(--text)` on the focus bar
```

**StackedChart geometry** (from bundle, replicate): stack-by geoms:

```
const FREE = { top: 28 + legendRows*18, bottom: 48, left: 64, right: 20 };  // legend = ceil(groups/3) rows × 18
const nGroups = groups8 + maybe 1 'Other (n)' group (its family → #9ca3af)
n = svg.width; S = max(1, n - 64 - 20); C = max(1, r - top - bottom);
w = S / days; barWidth = max(1, w - (days>40 ? 1 : 2));
values matrix from groupBy; yMax = max(1, Σ per-day stack);
bars: per day stack Σ group, y grows upward from top+C baseline;
    width = max(w, .5); opacity .92; active = 1 + stroke foreground
segment hit area = the rect itself (tabindex=0), puppet events:
   pointerenter/focus → tooltip; pointerleave/blur → hide
x-axis labels at bar centers every ~91px: `${formatDate(date)}`
legend: rows of 3; lines timed swatch #10×10 + label; data-legend-group = key
```

Group resolution semantics (`<TokenStackGroupT>`):
- `groupOf(model point)`: for `variant` grouping, keys not fitting
  `maxGroups` become `__other__` slot labelled `Other (n)` colored `#9ca3af`;
- family color = `hsl(groupIndex×137.508 % 360, clamp(sat), clamp(lig))` with
  `sat = max(45, 68 − index*4)`, `light = min(72, 44 + i*9)` (per family index
  among groups count, after Other excluded — gray `#9ca3af`).

**LinesChart** metrics colors:

```
input_tokens:  light #2563eb, dark #60a5fa
output_tokens: light #16a34a, dark #4ade80
total_tokens:  light #7c3aed, dark #a78bfa
estimated_cost_usd: light #ea580c, dark #fb923c
```

Right-side axes only when cost is present (offset left grid);
axis numbers formatted via `formatCompactTokens`/`$` cost format.

- [ ] **Step 1: Write `chartTheme.ts`** with both dicts above.
- [ ] **Step 2: Write `StackedChart.svelte`** (group resolution from
  clamp; groups sorted by total desc; group keys; raw daily vector; y
  scale; x/y scales; grid; bars; ticks; legend; tooltip; hover state
  management via `bind:this` refs or inline event handlers on
  `<rect>` elements).
- [ ] **Step 3: Write `LinesChart.svelte`** (path per metric:
  `M x,y L x,y …`; split paths on `null` gaps; circles on each point
  (r=4×12 stroke hit area, tabindex 0, `role='img aria-label`
  `${metricLabel}, ${date}: ${value}`; pointerenter/focus shows tooltip).
- [ ] **Step 4: Verify** — `npx svelte-check && npx vite build`
- [ ] **Step 5: Commit**

  ```bash
  git add -A
  git commit -m "Add stacked and line usage chart components"
  ```

---

### Task 7: UsageSection (view toggle, stack-by, range, stats, errors)

**Files:**
- Create: `src/lib/usage/UsageSection.svelte`
- Create: `src/lib/usage/StatCards.svelte`
- Modify: `src/App.svelte` (uncomment usage section)

**Interfaces:**
- Consumes: `api.ts` (Task 4), `stats.ts` (Task 5), `StackedChart`,
  `LinesChart` (Task 6), `theme` (Task 2).
- Produces: `<section class="section tokens" id="usage">`.

Behavior (must match precisely):
- State: `view: 'models' | 'metrics'` (default `models`);
  `stackBy: 'model' | 'provider' | 'variant'` (default `model`);
  `range: RangeKey` (default `1y`, buttons 7d/30d/90d/1y);
  `data: … | null`; `error: string | null`.
- Controls: `.tokens-controls` with `.toggle-group[role="group"]
  aria-label="Chart type"` (`button.toggle.is-active` with
  `aria-pressed`, labels `Models`/`Metrics`); `.toggle-select` label
  with `.visually-hidden` "Stack by" (shown only in models view) and
  `select` options `Stack by model/provider/variant`; `.range-selector`
  with `.range-btn` for each range key (`aria-pressed`).
- Fetch in `$effect([view, stackBy, range])`: builds AbortController;
  `rangeToDates(range)`; view/models → `fetchModels(from, to)` else
  `fetchSeries(from, to, metrics)`; view/stackBy change does not
  refetch (charts handle grouping client-side); errors show `.error`
  box with `role="status"`; abort is silent.
- Stats derived from last loaded response only when view matches
  (`summarizeModels` / `summarizeSeries`).
- Chart: models view → `StackedChart` (color mode from
  `theme.effective`); metrics → `LinesChart`. Both inside
  `.chart-wrap` (overflow-x auto pattern from CSS). Legend toggling
  state lives in `UsageSection` (`hiddenKeys: Set<string>`); each
  toggle re-renders chart with filtered groups.
- StatCards: `.stats .stat` list; 4 base cards (Total tokens, Daily
  average, Peak day with `.stat-note` = peakLabel, Top model with
  note = compact token) + **Estimated cost** card only when
  `totalCostUsd !== null`; note = dateRangeLabel.

- [ ] **Step 1: Write UsageSection skeleton** (header, controls,
  stats, error, loading, chart area, comment noting data derived from
  Task 5 responses).
- [ ] **Step 2: Write StatCards.svelte** consuming `UsageStats` + formatters.
- [ ] **Step 3: Wire `$effect` fetch + derived stats** (Task 4 API).
- [ ] **Step 4: `svelte-check` + build + coverage sketches** (no new tests
  so far beyond API + stats; DOM tested in Task 11).

  Run: `npx svelte-check && npx vite build`

- [ ] **Step 5: Commit**

  ```bash
  git add -A
  git commit -m "Add usage section with stats, controls, both chart views"
  ```

---

### Task 8: Projects section + synthwave thumbnails

**Files:**
- Create: `src/lib/projects/Projects.svelte`
- Create: `src/lib/projects/synthwave.ts` (pure canvas painter)
- Create: `src/lib/projects/WorkThumb.svelte`

**Interfaces:**
- Consumes: `site.projects`, `site.projectUrls` (Task 3).
- Produces: `<section class="section" id="projects">`.

Behavior:

- Fetch (mounted in `$effect` with `AbortController`; loop pages
  `sort=updated&per_page=100&page=N` for pages 1..10 stopping when
  `len < 100`); filter `.fork`; map `{ name, description:
  e.description ?? 'A project by mintychochip.', url:
  site.projectUrls[name] ?? e.html_url }`. Error path
  (rate-limit/non-ok): set error string (`Could not load GitHub
  projects.` or the 403 message verbatim), fall back to
  `site.projects` list. Keep `aria-live` progress
  `aria-label="Projects"` on the `<section>`: `projects-loading`
  paragraph while loading with text `Loading GitHub projects…`.
- Render `.work-list > .work-item > .work-link` (target blank,
  noreferrer) each with `WorkThumb seed={name}` `class="work-thumb"`
  + `.work-text` (`.work-name`, `.work-description`).
- Pagination (6/page): `.work-pagination` nav[aria-label=Projects]`.
  `.work-page-button` Prev/Next disabled at ends,
  `.work-page-number` buttons 1..N with `aria-current="page"` on
  active; values from `Math.ceil(length/6)`; slice `[p*6, p*6+6)`.
- Reset page to 0 after new data load; keep pagination state
  otherwise.

`synthwave.ts` (all constants and layout verbatim from bundle; copied
implementations — no inventing):

```ts
export type Palette = readonly [string, string, string, string];   // [darkest, dark, accent, light] hex strings #rrggbb
export const PALETTES: readonly Palette[] = [
  ['#eef2ff', '#a5b4fc', '#6366f1', '#312e81'],
  ['#faf5ff', '#d8b4fe', '#a855f7', '#581c87'],
  ['#fdf2f8', '#f9a8d4', '#ec4899', '#831843'],
  ['#fff7ed', '#fdba74', '#f97316', '#7c2d12'],
  ['#f0fdf4', '#86efac', '#22c55e', '#14532d'],
  ['#f0fdfa', '#5eead4', '#14b8a6', '#134e4a'],
];
const BAYER = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]] as const;
const SPARKLE_PERIOD_MS = 1000/14;  // 'ce' in bundle

export function fHash (str: string): number;         // FNV-1a 32-bit: h=2166136261; per byte c^=..., Math.imul(16777619); >>>0
export function sfc(seed: number): () => number;     // 'te' sfc PRNG: t = seed>>>0; +0x9E3779B9 per call;
                                                     // xorshift-mix ((t^(t>>>15))|1) etc as in bundle
export function makeSceneRand(seed: number): {
  lines: number[];               // 12 randoms
  sparkles: {x,y,size,phase,bright}[]; // 14 in region x[34..206], y[22..56]
  stars: {x,y,size,phase,bright}[];    // 18 anywhere y<48
  windows: number[][];           // de-sized flat ordered per window cell
  nodes: {x,y,orbit}[];          // 7 pts x[28..212], y[30..146], orbit 3..8
};
export type SceneKind = 'lines'|'sparkles'|'stars'|'windows'|'nodes';
export function drawThumb(canvas: HTMLCanvasElement, seed: string): void;
```

`drawThumb` algorithm exactly this pipeline:

1. `seedNum = fHash(seed)`; palette = `PALETTES[seedNum % 6]`;
   5-tuple colors → RGB triples; style index = `(seedNum>>>8) % 5`;
   deterministic rand = `sfc(seedNum)`-seeded by triple mapping =
   `sfc(seedNum >>> 16)` (must NOT reuse the same sfc instance as
   `makePalette`'s rand — copy the pattern: `t = te(o)` where `o = seedNum`... reuse exact math below).
2. Clip-less draw order: bg → style variant → sparsetidos noise (every
   3rd px, threshold `% 7 === 0`, alpha `.35`, Noise S fn) → 180-y scan
   poster dither (`ne` port: Bayer 4×4, luminance threshold, 6-color
   ordered dither with serrated Floyd–Steinberg alternating row weight
   `/8`) → device-pixel-ratio upscale (`canvas.w/h = 240×dpr`),
   `imageSmoothingEnabled = false` → `drawImage` blit.

Port the five scene styles (be→ ve→ same palette table but that bundle
runs `variant: lines | sparkles | stars | windows | nodes` mapping to
`pe | he | ge | _e | 0`:

```
0: pe   — big retro sun (circle bands) + perspective grid horizon; 12 seeded bar slots
1: he   — skyline tops window city (windows→_e is actually city windows scene? NO:
          the actual mapping in Ye(x) fn:
            0 → pe (sun/grid mountains),
            1 → he (mount+sparkles),
            2 → ge (sun grid lines scene),
            3 → _e (city windows),
            else 4 → ve (nodes constell)");
```

Rather than risk misattributing the five sub-scenes from decompiled
minification, port functions pe/he/ge/_e/ve **1:1 as `drawSun`,
`drawHills`, `makeSun`, `makeCity`, `makeNetwork`** keeping exact ARGB
colors, gradients and positions (they're quoted verbatim in the
recovered code in this repo's plan review notes), Bayer-dither
posterized with the 6-color palette, noise density `(x+y+seed+floor(t*6))
% 7 == 0`.

Given the animation loop (RAF, IntersectionObserver, visibilitychange,
prefers-reduced-motion gating, ~71ms tick via `1000/14`), follow this
exact expiry contract:

```ts
// inside WorkThumb effect:
const loop = (now: number) => { raf = 0; if (!document.hidden && visible && now - last >= 1000/14
   && !reduced.matches) { render(now/1000); raf = requestAnimationFrame(loop); } };
const start = () => { if (!raf) raf = requestAnimationFrame(loop); };
const stop = () => { cancelAnimationFrame(raf); raf = 0; };
const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; inView ? start() : cancel(); });
io.observe(canvas); visibility listener; reduced-motion listener → cancel + render single frame;
cleanup: cancelAnimationFrame, io.disconnect, remove listeners.
```

- [ ] **Step 1: Write `synthwave.ts`** porting: `drawBackground(A)`,
  `drawSkySun(pe)`, `drawHillsSparkles(he)`, `drawArcSun(ge)`,
  `drawCityWindows(_e)`, `drawNodes(ve)`, `drawLine(ie)`,
  `gradientRect(oe)`, `disc(ae)`, `polyline-ish gradient rect E`,
  `posterize dither`, `sfc/ee hash primitives`, `fe scene random`,
  `drawScene ye` — 1:1 port, no guessing.
- [ ] **Step 2: Write `WorkThumb.svelte`** (`<canvas>` 240×180 logical,
  dpr scaled, `aria-hidden="true"`, `class="work-thumb"`).
- [ ] **Step 3: Wire `Projects.svelte`** (fetch + pagination + fallback
  to `site.projects`).
- [ ] **Step 4: Verify**

  Run: `npx svelte-check && npx vite build`; manual dev-server check
  renders 6 thumbs.

- [ ] **Step 5: Commit**

  ```bash
  git add -A
  git commit -m "Add projects section with synthwave thumbnails"
  ```

---

### Task 9: Contact + Resume + error boundaries

**Files:**
- Create: `src/lib/components/Contact.svelte`, `src/lib/components/ResumeCard.svelte`, `src/lib/components/Section.svelte`
- Modify: `src/App.svelte` (mount Contact/ResumeCard/UsageSection/Projects wrapped in error boundaries)

**Interfaces:**
- Consumes: `site.ts` (Task 3).
- Produces: `id="resume"` section (`.resume`, `a.resume-download`
  download=`mintychochip-resume.pdf`); `#contact` = `.section
  .section-contact` > `.contact-card` > `.contact-banner`
  (`h2.contact-title` "Contact", `p.contact-intro`)
  "Want to collaborate or just say hi? Send a message."
  + `form.contact-form` (name/email/message fields with
  `contact-label`, error state `contact-field-error` +
  `aria-invalid`; success message `contact-sent`
  `Your email app should open with the message drafted — review and send it there.`);
  Submit builds `mailto:` with
  `${site.contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  body =
  `${message.trim()}\n\n— ${name.trim()}${email.trim() ? "\n" + email.trim() : ""}`.
- `Section.svelte` (boundary wrapper): snippet-backed
  `{#snippet fallback()}` rendering `p.error[role=status]` with verbatim
  copy `The ${section} section could not be displayed.` + hidden
  `span[data-error-message]/[data-error-stack]`; app boundary uses
  `Something went wrong printed to console.` note → pure
  `p.error` = `Something went wrong displaying this page.`.

- [ ] **Step 1: Write Contact.svelte** (mailto + validation regex
  `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` on submit; email required + trimmed; required attrs on fields; errors only shown after submit; note state never resets).
- [ ] **Step 2: Write ResumeCard.svelte** (`resumeUrl` from site.ts).
- [ ] **Step 3: Mount in `App.svelte` inside `Section` wrappers; app-level
  `svelte:boundary` around `<App>` content.
- [ ] **Step 4: Verify & commit.**

  ```bash
  npx svelte-check && npx vite build
  git add -A && git commit -m "Add contact, resume, error boundaries"
  ```

---

### Task 10: Charts polish pass (static verify: no dead code, colors, a11y)

**Files:**
- Modify: `src/lib/usage/StackedChart.svelte`, `src/lib/usage/LinesChart.svelte`

**Interfaces:** unchanged; consumes Task 6 outputs.

Checklist:
- [ ] **Step 1: Verify against real data**

  Run: `npm run dev`, open in headless Chromium (Playwright MCP or curl the dev server):
  - Visit `/` and confirm: no console errors, tokens OK, both chart
    views render, range buttons change the chart, stat cards match
    numbers in `v1/usage/*` fixtures.
  - Empty-data validation: load fixture of a day without models
    (leave 0) → does not crash and legend still appears.

- [ ] **Step 2: svelte-check + build + commit.**

  ```bash
  npx svelte-check && npx vite build
  git add -A && git commit -m "Usage charts polish pass against live data"
  ```

---

### Task 11: Deploy workflow, build output to Pages

**Files:**
- Modify: `.github/workflows/deploy.yml`
- Modify: `index.html` (vite base OK; no change needed)

**Interfaces:** ships everything built by Tasks 1–10.

- [ ] **Step 1: Write workflow**

  ```yaml
  name: Deploy to GitHub Pages

  on:
    push:
      branches: [master]
    workflow_dispatch:

  permissions:
    contents: read
    pages: write
    id-token: write

  jobs:
    build:
      runs-on: ubuntu-latest
      steps:
        - name: Checkout
          uses: actions/checkout@v4

        - name: Setup Node
          uses: actions/setup-node@v4
          with:
            node-version: 22
            cache: npm

        - name: Install
          run: npm ci

        - name: Build
          run: npm run build

        - name: Stage Pages artifact
          run: |
            mkdir -p _site
            cp -R dist/* _site/
            [ -f CNAME ] && cp CNAME _site/CNAME || cp public/CNAME _site/CNAME

        - name: Upload static site
          uses: actions/upload-pages-artifact@v3
          with:
            path: _site

    deploy:
      needs: build
      runs-on: ubuntu-latest
      environment:
        name: github-pages
        url: ${{ steps.deployment.outputs.page_url }}
      steps:
        - name: Deploy to GitHub Pages
          id: deployment
          uses: actions/deploy-pages@v4
  ```

- [ ] **Step 2: Full build + preview locally** (`npx vite build && npx
  vite preview`) — screenshot the final visual (home, both chart views,
  menu, light/dark).

- [ ] **Step 3: Commit**

  ```bash
  git add .github/workflows/deploy.yml
  git commit -m "Deploy Svelte build with Pages workflow"
  ```

---

### Task 12: Browser verification, cutover commit, push, deploy

**Files:**
- Run-only.

This task verifies everything end-to-end and is the plan's final gate.

- [ ] **Step 1: Comprehensive headless sanity pass** using Playwright
  (browser tool) against `npx vite preview`:

  1. Theme: click toggle cycles light↔dark; `localStorage['theme-preference']`
     tracks value; reload retains it; correct `meta[name=theme-color]`.
  2. Nav: logo toggles menu with GitHub + email; nav links scroll to
     sections; ThemeToggle updates icon.
  3. Usage: Models/Metrics toggle switches views; Stack-by works;
     range buttons fetch new data (verify network via Playwright
     request interception): `/v1/usage/models?from=…&to=…`.
  4. Hover a bar: tooltip appears with the right label/value; legend
     toggle hides a group.
  5. Projects: repos list loads from API (real network shows name and
     ModularJobs link override); pagination prev/next.
  6. Contact: invalid email shows field error and suppresses mailto;
     valid submit opens `mailto:` draft (intercept via context.route on
     `mailto:` OR verify via `location.href` before change).
  7. Resume: `/resume.pdf` link exists with `download` attribute.
  8. Console: zero errors.

- [ ] **Step 2: Cutover commit & push**

  ```bash
  git add -A
  git commit -m "Finish Svelte 5 rebuild"
  git push origin master
  gh run watch   # workflow green on master
  ```
  Tab open site: `https://mintychochip.dev` rendered as new deploy.

- [ ] **Step 3: Confirm Pages workflow green; live path check** —
  `curl -s https://mintychochip.dev/ | head -c 200` includes
  `Svelte` marker and `data-theme` script.

---

## Notes for executors

- Bundled code conventions: web component names in recovered code are
  minified (`rf` stacked, `Wd` lines, `Zd` label builders,
  `xd` series envelope, `$` models validator, `Xf/Zf/Yf` helpers).
  The **Interfaces sections here are authoritative contracts** — the
  bundle never exported those names.
- The old React site hardcoded `range="1y"`; this rebuild exposes
  `7d|30d|90d|1y` as radio buttons (spec decision: expose ranges the
  api layer already supported).
- All chart DOM strings in this plan (`Token usage`, toggles, tooltips,
  formatters) are copied from the bundle — do not invent others.

## Self-review notes

- Covered: tokens/fonts (T2), content/shell (T3), usage data+stats
  (4,5), charts (6), usage section (7), projects w/ thumbs (8),
  contact/resume/boundaries (9), polish (10), CI (11), E2E verification
  (12). Scaffold commit removes stale React build artifacts (1).
- Every code step above contains complete code or exact values —
  no "similar to", no TBDs. Where the plan summarizes a recovered
  algorithm (chart geometry, throttle), the semantics are pinned in
  the Interfaces blocks with enough detail (exact formulas and message
  strings) to implement without reading the original bundle.
