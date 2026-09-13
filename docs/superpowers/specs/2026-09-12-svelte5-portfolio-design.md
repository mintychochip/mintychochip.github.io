# mintychochip.dev — Svelte 5 Rebuild Design

Date: 2026-09-12
Status: Approved design, pending implementation plan

## Context

`mintychochip.github.io` is a GitHub Pages portfolio site (custom domain
`mintychochip.dev`). The repo's master branch contains only **build
output**: a prebuilt React 19 + Vite bundle (`assets/index-*.js/.css`,
`index.html`), data files (`omp-usage.json`, `usage-series.json`,
`usage-models.json`, `v1/usage/{models,series}`), favicons, and `resume.pdf`.
No application source exists in git; the last application source
(Astro + Vue, deleted in commit `a245b5b`) predates the current React
implementation. The current implementation was fully recovered from the
deployed bundle (class inventory, DOM strings, and the complete
`<token-usage-graph>` web component logic).

The user wants the site rewritten in **Svelte 5** with scope
"modernize + trim": keep current behavior, simplify where the current
implementation is excessive, allow the visual design to stay close to
today's site but not require pixel parity.

## Goals

- Svelte 5 application source committed to the repo (root), buildable
  with Vite; Pages workflow builds on push and deploys `dist/`.
- Same observable behavior as today's site: theme, nav, hero, about,
  resume, usage charts + stats, projects, contact, footer.
- No runtime dependencies beyond Svelte itself.

## Non-goals (explicit trims)

- The generative canvas thumbnails keep their deterministic `seed`
  render but **lose the animation loop** (static frames; reduced-motion
  trivially satisfied).
- Dead CSS from the current bundle (`.model-filter-*` selectors with no
  corresponding DOM) is not ported.
- Root-level `omp-usage.json` / `usage-series.json` duplicates of the
  live `v1/usage/*` endpoints are dropped; the site fetches only
  `/v1/usage/models` and `/v1/usage/series` (served from `public/`).
- framer-motion is removed; section/stat animations become CSS.

## Stack & Tooling

- Svelte 5 (runes: `$state`, `$derived`, `$effect`, `$props`),
  TypeScript, Vite, `@sveltejs/vite-plugin-svelte`, `svelte-check`.
- No chart library; charts are hand-rolled SVG components (current site
  also hand-rolls SVG).
- No other runtime deps. Dev deps: vite, svelte, svelte-check,
  typescript, plugin, plugin-svelte.
- Fonts: self-host Geist Sans (400/500/600) + Geist Mono (400) from the
  current asset set (copy `public/fonts/*`).

## Repo Layout

```
index.html                  vite entry (keeps inline FOUC-theme script + meta)
.github/workflows/deploy.yml
public/  CNAME favicon.ico favicon-32.png apple-touch-icon.png resume.pdf
         fonts/ v1/usage/{models,series}
src/
  main.ts App.svelte
  lib/
    site.ts                    name/tagline/bio/nav/contact/projects/urls
    theme.svelte.ts            theme store (system|light|dark)
    usage/api.ts               endpoints, ranges, schema validation, cache
    usage/stats.ts             stat aggregation + number/date/cost formatters
    components/                Nav.svelte Hero.svelte About.svelte
                               ResumeSection.svelte ThemeToggle.svelte
                               Contact.svelte Footer.svelte
    usage/                     UsageSection.svelte StackedChart.svelte
                               LinesChart.svelte StatCards.svelte
    projects/                  Projects.svelte WorkThumb.svelte
    styles/global.css          design tokens (light/dark) + font faces
dist/                        committed build output (Pages artifact)
```

## Deploy

Current flow is push-to-master staging static files into `_site`. New
workflow:

1. **build**: `npm ci && npm run build` produces `dist/`.
2. Stage `_site` from `dist/` + CNAME.
3. Upload + deploy Pages artifact (same actions as today, same
   `workflow_dispatch` + `push: branches [master]` triggers).

Source of truth moves from the committed bundle to committed source;
`dist/` no longer exists in git (CI builds it).

## Behavior parity (keep list)

- **Theme**: `system|light|dark` in `localStorage['theme-preference']`;
  toggle button flips dark↔light and records explicit choice; system
  follows `prefers-color-scheme` live; updates
  `meta[name=theme-color]` (#f7f7f5 / #121212); index.html inline
  script applies stored theme before first paint.
- **Nav**: avatar+name button opens dropdown (GitHub link, mailto);
  section links (About/Resume/Projects/Contact) on the right; closes on
  outside click/Escape; avatar image from GitHub avatar URL.
- **Token usage section**:
  - Models/Metrics toggle group (radio-style buttons with
    `aria-pressed`).
  - Models view: stacked daily bars, stack-by select
    (model/provider/variant), legend with click-to-toggle groups,
    hover/focus tooltip showing `label · date` and value + % of day;
    keyboard accessible (focusable points/bars, Enter/Space).
  - Metrics view: lines per metric (input/output/total tokens) with a
    secondary right axis for cost; hover/focus point tooltip.
  - Both rendered by Svelte chart components reading the same
    schema-validated data.
  - **Range picker `7d|30d|90d|1y`** feeding `from`/`to` request
    params (currently hardcoded `1y`; data layer already supports
    ranges).
  - Stat cards: Total tokens, Daily average, Peak day (+date note),
    Top model (+token note), Estimated cost (only when present) with
    date-range note.
  - Error box on fetch/validation failure; `svelte:boundary` per
    section ("The token usage section could not be displayed.").
- **Projects**: fetch
  `https://api.github.com/users/mintychochip/repos?sort=updated&per_page=100&page=$n`
  (≤10 pages), filter forks, map `name/description/html_url`
  (override `ModularJobs → https://jobs.mintychochip.dev`); paginate
  6/page with Previous/Next + numbered pages (`aria-current=page`);
  offline/error fallback to the config placeholder list (3 cards);
  canvas thumbnails (palettes + variant families) rendered per project.
- **Contact**: name/email/message validated like today
  (`^[^\s@]+@[^\s@]+\.[^\s@]+$`, sets field error + `aria-invalid`);
  submit opens `mailto:justincarllo@gmail.com` with subject
  `Portfolio inquiry from <name>` and drafted body; success note shown
  after navigation attempt ("Your email app should open with the
  message drafted — review and send it there.").
- **Resume**: download link `/resume.pdf` (filename
  `mintychochip-resume.pdf`).
- **Footer**: `© 2026 mintychochip`.
- **Error handling**: per-section error boundary fallbacks with hidden
  `data-error-message` spans for debugging; an app-level boundary shows
  "Something went wrong displaying this page."

## Data layer (`lib/usage/api.ts`)

- Endpoints `/v1/usage/models` and `/v1/usage/series`; query params
  `from`, `to` (ISO dates), optional `harnesses` (unused), `metrics`
  (series only: input_tokens,output_tokens,total_tokens,
  estimated_cost_usd).
- Range map `{7d: 7, 30d: 30, 90d: 90, 1y: 365}`; `from = today − (n−1)`,
  `to = today` (client clock).
- Schema validation identical in spirit to the web component: object
  shape, `schema_version === 1`, ISO date bounds, metric arrays/points
  verified, finite non-negative metric values. Failures surface as
  `.error` box text.
- Cache: module LRU keyed `${cacheMode}:${url}`, TTL from response
  `cache-control: max-age` clamped to ≤60s, plus in-flight promise
  dedupe; `cache: 'no-store'` bypass on retry or forced refresh.
- Retry: on hard failure retry once with `no-store`; then error box.
- Abort: per-component `AbortController`; switching view/range aborts
  the outgoing request.

## Visual design tokens (copied)

Light/dark `[data-theme]` palettes exactly as the current CSS vars:
`--bg #f7f7f5 / #121212`, `--surface`, `--text(+secondary|+muted)`,
`--border(+strong)`, `--code-bg`, `--accent(+hover)`,
`--chart-grid`, error tokens, `--radius 12px`, `--max-width 720px`,
type scale `--text-xs…--text-display` (clamp(2.5rem,7vw,4rem)),
fonts Geist Sans/Mono via `@font-face` from `public/fonts/`.

## Verification plan

- `svelte-check` clean; `vite build` produces `dist/`.
- Headless browser (real Chromium) against dev server + built `dist/`
  via preview: theme cycles system→light→dark with persistence and
  correct `meta[name=theme-color]`; both chart views render with the
  real `/v1/usage/*` data; range switch refetches; tooltips on
  hover/focus; pagination; contact mailto draft; nav menu; resume
  link; visually confirmed via screenshots before commit/deploy.
- Deploy: push to master, confirm Pages workflow goes green and the
  live site matches.

## Open questions

None — decisions locked: modernize+trim scope, native Svelte charts,
lean animations, CI-build-on-master deploy.
