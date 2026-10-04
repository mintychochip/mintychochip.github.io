# Frog pond redesign: plan

Spec: `docs/superpowers/specs/2026-10-03-frog-pond-redesign-design.md`.

1. Pond engine in `src/lib/pond/`: field and dither, palettes, sprite
   renderer, frog poses, night scene, bars, ticker. Check renders frame by
   frame (hop, dive, swim, climb, snap, croak) and the spread of shades.
2. `PondCanvas.svelte`: pixel scale, resize, visibility, pointer input,
   `react()`.
3. Shell: fonts and licence, global styles, `index.html`, `site.ts`, hero,
   footer, `App.svelte`; delete About, Nav, the theme toggle and store, and
   Geist.
4. Usage: `series.ts` (daily fill, ranges, top-two stacking, weekly bars),
   `UsageChart.svelte`, `UsageSection.svelte`; delete the old charts and
   stat cards.
5. Projects: `github.ts` (fetch with paging, mapping, fallback list, meta
   line), cards with ponds, pager.
6. Resume and Contact: download link; mailto form with validation.
7. Tests for the pure modules; `npm run check`, `npm test`, `npm run build`.
8. Browser pass at 1280px and 390px: layout, frame rate per canvas (12 FPS on
   screen, 0 off screen, 0 with reduced motion), chart hover and keys, form
   errors, pointer input with no page errors.
9. Deploy workflow builds with Node 22 and uploads `dist/`.
10. Owner review of a local preview, then
    `git push origin master:backup/pre-redesign` and push `master`.
