# Pond scenes

Date: 2026-10-16. Builds on `2026-10-03-frog-pond-redesign-design.md`: the
tone field, Bayer dither, palettes, frog sprites, 12 FPS clock and
`PondCanvas` sizing carry over. This replaces its single scene (`night.ts`)
and the project cards' copy of it (`scene.ts`, `biome.ts`).

## Goal

Every pond on the site is the same picture: a pine treeline, a moon and a lake
with lily pads. The project-card "biomes" (bamboo, oasis, swamp) only swap
colours; their vegetation, water tint and fog settings are never drawn. The
owner wants different scenes across the whole site, in the same dithered
pixel style, with Bumpy and his girl living in each one.

Six scenes: the night lake as it is, a beach at sunset, a meadow by day, a
snowy onsen, a waterfall and river, and a cave lake. Each pond keeps one
scene for good (no daily or per-visit shuffling).

## Engine (`src/lib/pond/`)

### Frog core (`life.ts`)

Everything alive, written once and shared by every scene:

- frogs sitting, hopping in arcs, diving, swimming, climbing out, croaking,
  turning, and snapping flies with their tongues;
- ripples, splashes and landing dips;
- pointer input (`look`, `poke`, `tap`), `react()` for card hovers, and
  `meet()`, which seats both frogs side by side on one perch facing each
  other under a heart, in any scene with two frogs;
- `still` (reduced motion: frogs sit and look around) and `clear` boxes that
  keep perches and frogs out from under titles;
- `frogs()` for tests.

`pond(W, H, opts, setting): Scene` builds a scene from a setting. The `Scene`
interface keeps its methods (`render`, `poke`, `tap`, `look`, `react`,
`meet`, `frogs`); `meet` stops being optional, since every scene has it.
Options shared by every scene: `seed`, `k` (frog scale), `frogs`, `flies`,
`horizon`, `clear`, `still`. The lake-only `moon`, `reeds` and `pads` options
are dropped: no pond that keeps the lake passes them.

Draw order each frame: the setting's static layer, the setting's animated
back layer, ripples, perches and frogs sorted by depth, the meeting heart,
splash drops, the setting's front layer, then flies.

### Settings (`scenes/*.ts`)

A setting paints its own world and tells the core three things:

- **Perches**: where frogs can sit, placed by the setting (avoiding `clear`
  boxes), at least `frogs + 2` of them, each big enough for a frog. A perch
  either floats (lily pads: bobs, dips and ripples when landed on) or stands
  (rocks, stones, mushroom caps: no bob, no ripple). The setting draws its
  own perches.
- **Water**: where frogs may dive and swim, or none. Dives only land in
  water, away from perches and `clear` boxes. Water can be marked for
  soaking (the onsen): a frog that slips in rests there for a while with
  happy closed eyes before swimming back to a perch.
- **Depth**: frog and ripple scale by height in the frame (today's
  perspective rule from the horizon down).

Each setting has a static layer drawn once per size (sky, peaks, cliffs,
cave walls), an animated layer behind the frogs (water, waves, river flow,
glints) and an animated layer in front (reeds, tall grass, snow, steam,
mist). Fly drawing is per setting: glowing fireflies at night and in the
cave, dark gnats by day.

### Shared painting (`sky.ts`)

Vertical sky gradients, a sun or moon disc with its halo and its glint
column on water, twinkling stars, drifting clouds, and ridge silhouettes
(today's treeline function, also used for hills, peaks and stalactites).

### Scene registry and `PondCanvas`

`scenes/index.ts` maps each `SceneName` to its setting and default palette.
`PondCanvas` takes `scene` (default `lake`) and an optional `palette` that
overrides the scene's own; the `biome` prop is removed. `assignScenes(names)`
replaces `assignBiomes`: each card on a page gets a different scene, and a
project keeps the same one.

### Colours

Each scene has one 8-step ramp, dark to light, dithered as today. The six
existing palettes (night, moss, dusk, ember, potion, mist) stay, so any
scene can be repainted and the vault's dusk letter pond is unchanged. Two
ramps are added: `day` (deep green, leaf green, sky blue, white) for the
meadow and `snow` (twilight blue, lavender, snow white) for the onsen.

Small accents are fixed sprite colours like the frog's, outside the dither:
flowers, butterflies, the onsen lantern's glow, the frogs' towels and
crystal glints. There is one set of sprite colours (`palette.ts` `INK`);
the second set in `biome.ts` goes with it.

## The six scenes

1. **Night lake** (`night`): unchanged. Pines, moon and glint, lily pads,
   lotus flowers, reeds, fireflies.
2. **Beach at sunset** (`dusk`): a low sun half-set on the sea with its glitter
   column, long lit clouds, a far headland and gulls drifting across. Waves
   roll up the wet sand and slide back, foam lines moving with them. Frogs sit
   on dark rocks along the shore and can dive into the shallows and swim back.
3. **Meadow by day** (`day`): blue sky with slow puffy clouds and a high sun,
   three layers of rolling hills fading with distance, one round tree on a
   far hill. Tall grass sways in front, with wildflowers through it. Frogs
   hop between mossy stones and big spotted mushrooms. No water, so no
   diving. Butterflies flutter past; gnats are what the frogs snap at.
4. **Snowy onsen** (`snow`): sharp snowy peaks under a twilight sky with a few
   stars. A steaming hot spring ringed by snow-capped rocks, a stone lantern
   glowing warm beside it, steam curling up and snow falling in front. Frogs
   sit on the rim rocks, slip in to soak up to their eyes with happy closed
   eyes and a tiny folded towel on their heads, then climb back out.
5. **Waterfall and river** (`moss`): mossy cliffs with leafy trees on top, a
   waterfall pouring down with mist puffing at its base, and a river running
   across the bottom with moving streaks and foam around stepping stones.
   Frogs hop stone to stone or swim between them.
6. **Cave lake** (`potion`): jagged stalactites overhead, crystal clusters
   glowing and pulsing softly, their light shimmering in the black water, and
   drips that fall and ripple the lake. Frogs sit on glowing mushroom caps
   and flat rocks and snap at drifting glow motes.

## Where each scene goes

| Pond | File | Scene |
|---|---|---|
| Hero | `Hero.svelte` | Night lake |
| GitHub activity strip | `GitHubActivitySection.svelte` | Waterfall and river, the fall at one end of the strip |
| Project cards | `Projects.svelte`, `ProjectCard.svelte` | `assignScenes`: all six on a page, stable per project |
| Footer strip | `Footer.svelte` | Beach at sunset |
| Vault letter | `LetterStage.svelte` | Night lake in `dusk`, as now |
| Vault passes | `LovePasses.svelte` | By pass icon (below) |
| Goodnight | `PondGoodbye.svelte` | Night lake, as now |

Passes are matched by icon name, never by title (titles are sealed):
`massage` the onsen, `dinner` the waterfall, `boba` the night lake, `movie`
the cave, `crown` the meadow, `getaway` the beach. An icon with no match
takes the next scene not yet used on the page, in registry order.

## Tests

`pond.test.ts`'s scene checks become contracts run over all six scenes:

- the same seed draws the same picture;
- a frame uses at least 5 of the scene's 8 levels;
- the first frame, still or not, has frog skin, eyes and the pink bow;
- over 120 s the frogs stay in frame, every tone stays finite, and a frog
  hops (reaches `air`);
- `still` leaves every frog sitting;
- `poke`, `tap`, `look` and `react` are safe;
- `meet()` ends with both frogs sitting side by side on one perch, facing
  each other, no more than a frog's width apart.

Scene-specific checks: meadow frogs never swim; onsen frogs soak within a
minute; perches stay out of `clear` boxes in every scene; every pond's scene
exists; pass icons map as above and an unknown icon falls back in order.
The frog sprite and palette tests stay as they are.

## Speed

A 320×110 lake frame costs about 0.8 ms today. Each scene stays per pixel:
static layers once per size, capped particles (snow, steam, drips, gulls,
butterflies), the shared 12 FPS clock, and no drawing off screen. Every
scene is timed at hero size (render plus dither) against the lake, and none
may cost more than 1.5 times the lake's frame.

## Files

Added:

- `src/lib/pond/life.ts`, `src/lib/pond/sky.ts`
- `src/lib/pond/scenes/index.ts`, `lake.ts`, `beach.ts`, `meadow.ts`,
  `onsen.ts`, `waterfall.ts`, `cave.ts`

Changed:

- `src/lib/pond/palette.ts` (`day` and `snow` ramps, accent sprite colours),
  `frog.ts` (the towel), `PondCanvas.svelte` (`scene` prop), `pond.test.ts`
- `Hero.svelte`, `GitHubActivitySection.svelte`, `Footer.svelte`,
  `Projects.svelte`, `ProjectCard.svelte`
- `LetterStage.svelte`, `LovePass.svelte`, `LovePasses.svelte`,
  `PondGoodbye.svelte`

Deleted:

- `src/lib/pond/night.ts` (split into `life.ts` and `scenes/lake.ts`)
- `src/lib/pond/scene.ts` and `src/lib/pond/biome.ts`

## Order of work

Each step leaves the site working and its tests passing:

1. The lake rebuilt on the core; today's lake tests pass unchanged in what
   they check.
2. Scene names on every pond and the registry; `scene.ts` and `biome.ts`
   deleted.
3. The five new scenes, one at a time, each with its contract tests.
4. The placements.
5. Browser check at desktop and phone size, reduced motion included.

## Deploy

Nothing is pushed until the owner has tried the scenes in the browser and
said to ship; a push to `master` deploys the site.
