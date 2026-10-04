# Frog pond redesign

Date: 2026-10-03. Supersedes the visual design in
`2026-09-12-svelte5-portfolio-design.md` and Tasks 8–12 of its plan
(including the synthwave thumbnail port). The Svelte 5 + Vite stack, the
usage data layer (`src/lib/usage/api.ts`, `stats.ts`) and the static
`public/v1/usage/*` snapshot carry over unchanged.

## Goal

A site that looks made by a person: dark night ponds drawn as animated pixel
art, with frogs on lily pads, in one pixel typeface. Picked from the
"Ponds" mockup; feedback on it asked for better frog animation and more
shades, while keeping the dither and the font.

## Reversed non-goal

The old spec said: "The generative canvas thumbnails keep their
deterministic `seed` render but **lose the animation loop** (static frames;
reduced-motion trivially satisfied)." This redesign brings animation back,
with these safeguards:

- One shared clock at 12 FPS (`src/lib/pond/ticker.ts`) for every pond.
- A pond only draws while on screen (IntersectionObserver), and nothing
  draws while the tab is hidden.
- `prefers-reduced-motion: reduce` gets one still frame per pond and no loop.
- Fixed steps: each pond advances by whole frames (`t = frame / 12`), so a
  seed always plays out the same way and a scene paused off screen resumes
  where it stopped.
- A 320×110 hero frame costs about 0.8 ms.

## Look

- Colours: background `#0b0f19`, text `#ece6cc`, muted `#8f98a8`, dim
  `#687184`, accent `#8bbf73`. Dark only; the theme toggle and light theme
  are removed.
- Type: Pixelify Sans (variable, 400–700), self-hosted at
  `public/fonts/PixelifySans.woff2` with its OFL text alongside
  (`PixelifySans-OFL.txt`). No Google Fonts or other CDN. Geist is removed.
  The font has no arrow or star glyphs, so copy uses words instead.
- All lettering is real text. Only pond art and the chart are canvas.
- Not used: serif body text, figure/plate captions, roman-numeral contents,
  colophon, two-ink paper styling, boxed stat tiles, spaced uppercase labels,
  monospace everywhere, terminal-style nav, filler taglines.

## Pond engine (`src/lib/pond/`)

- `field.ts`: tone field (0..1 per art pixel), seeded RNG, 8×8 Bayer ordered
  dither into palette levels. A value exactly on a level never dithers.
- `palette.ts`: six palettes (night, moss, dusk, ember, potion, mist), each
  8 levels interpolated through hand-picked anchors in OKLab.
  `assignPalettes` gives each project on a page its own palette.
- `sprite.ts`: ellipsoid-part sprites, cel-shaded in three bands with a 1px
  ink outline, inner seams between limbs and body, and flat marks (mouth,
  pupil, gleam) on exact levels.
- `frog.ts`: frog parts and four poses (sit, crouch, leap, land) that blend;
  breath, throat flutter, vocal sac, blinks and eye direction.
- `night.ts`: the scene. Sky, moon, two tree lines, reflective water with
  ripples, pads that dip under landings, lotus flowers, reeds and fireflies.
  Frogs hop between pads in arcs, dive, swim with only their eyes above water,
  climb back out, croak, turn, and snap fireflies with their tongues. Pointer
  input makes ripples, and frogs watch it; a tap startles a frog. `react()`
  lets a project card wake its frog on hover.
- `bars.ts`: stacked bars on exact palette levels over a dithered
  background, with rounded tick steps.
- `PondCanvas.svelte`: sizes the canvas so one art pixel is about 3 CSS px
  and a whole number of device pixels, rebuilds on resize, and wires pointer
  input and `react()`.

## Page

1. Hero: a 330px pond (240px on phones) with the name over its bottom-left
   corner and section links top right. Below it is the intro line (a
   placeholder for the owner to rewrite), plus GitHub and Email links.
2. Token usage: a one-sentence summary built from the data, plus a canvas bar
   chart. The chart stacks the two biggest named models over everything else,
   and the window is counted back from the last data date. Range buttons are
   7d, 30d, 90d and 1y, each shown only if shorter than the data, plus all.
   Windows over 120 days use weekly bars. Axis labels, the peak note and the
   legend are HTML. Hovering a bar, or using the arrow keys, shows its
   numbers in the legend, which is an `aria-live` region.
3. Projects: public repos from the GitHub API (forks, this site's repo and the
   profile README repo are skipped), newest push first, 6 per page with a
   pager. A built-in list shows until the API answers and stays if it fails.
   ModularJobs links to https://jobs.mintychochip.dev. Each card has its own
   pond.
4. Resume (download `/resume.pdf` as `mintychochip-resume.pdf`) and Contact
   (a mailto form with field validation, `aria-invalid`, and a note after
   sending).
5. Footer: a thin pond strip, the name and year, and links.

The hero, usage section and projects each sit in a `<svelte:boundary>` so
one failure leaves the rest of the page up.

## Files

Added:

- `src/lib/pond/*`
- `src/lib/usage/series.ts`
- `src/lib/usage/UsageChart.svelte`
- `src/lib/projects/*`
- `src/lib/contact/*`
- `src/lib/components/Resume.svelte`
- `public/fonts/PixelifySans.woff2` and `public/fonts/PixelifySans-OFL.txt`
- tests for the pond, series, projects and mail modules

Replaced:

- `src/App.svelte`
- `src/lib/site.ts`
- `src/lib/styles/global.css`
- `src/lib/components/Hero.svelte` and `Footer.svelte`
- `src/lib/usage/UsageSection.svelte`
- `index.html` (dark theme colour, no theme script, font preload)
- `.github/workflows/deploy.yml`

Deleted:

- `src/lib/components/About.svelte`, `Nav.svelte` and `ThemeToggle.svelte`
- `src/lib/theme.svelte.ts` and `theme.test.ts`
- `src/lib/usage/StackedChart.svelte`, `LinesChart.svelte`,
  `StatCards.svelte` and `chartTheme.ts`
- `public/fonts/geist-*.woff2`

## Deploy

The old workflow copied files that no longer exist at the repo root, so it
must be fixed before anything is pushed to `master`. The new one runs
`npm ci`, `npm run check`, `npm test` and `npm run build`, then uploads
`dist/` (which includes `CNAME`) with `upload-pages-artifact@v3` and
`deploy-pages@v4`. Triggers stay `push` to `master` and `workflow_dispatch`.
Before the first push, the current remote `master` is saved as
`backup/pre-redesign`.
