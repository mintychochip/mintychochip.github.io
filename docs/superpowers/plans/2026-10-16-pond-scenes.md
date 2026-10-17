# Pond Scenes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the site six different pond scenes (night lake, beach at sunset, meadow by day, snowy onsen, waterfall and river, cave lake), all sharing one frog brain, and put a fixed scene on each of its 12 ponds.

**Architecture:** `src/lib/pond/night.ts` is split into a frog core (`life.ts`: frogs, perches, hops, swims, flies, ripples, pointer input, the meeting) and settings (`scenes/*.ts`: each paints its own sky, ground and weather and says where frogs can sit and swim). A registry (`scenes/index.ts`) names the scenes; `PondCanvas` takes `scene="…"`. The project cards' copied engine (`scene.ts`, `biome.ts`) is deleted.

**Tech Stack:** Svelte 5 (runes), TypeScript, Vite, Vitest, Bun for throwaway scripts. Canvas `ImageData` drawn from a tone field with 8×8 Bayer dither.

**Spec:** `docs/superpowers/specs/2026-10-16-pond-scenes-design.md`

## Global Constraints

- Each scene has one 8-step ramp (`LEVELS = 8`), dithered by `quantize`; small accents are `INK` sprite colours drawn as they are.
- Art pixels are `pixelScale()` CSS px (about 3); scenes run on the shared 12 FPS clock (`ticker.ts`) and honour `still` (reduced motion: frogs sit, no autonomous acts).
- Every scene implements the `Scene` interface: `render`, `poke`, `tap`, `look`, `react`, `meet`, `frogs`.
- A setting places at least `frogs + 2` perches, each big enough for a frog, kept out of `clear` boxes.
- Speed: every scene's hero-size frame (render plus `quantize`, 320×110) costs at most 1.5× the lake's.
- Repo rules: `Record`, not `Map`, for static tables; no tiny wrapper functions; no `ReturnType<typeof …>` contracts (use named types such as `PondHandle`, `Scene`); comments are plain sentences.
- Tests: Vitest; behavioural only. No tests of wiring, forwarding or source text.
- Pass scenes are matched by icon name only (`massage`, `dinner`, `boba`, `movie`, `crown`, `getaway`); the sealed pass titles never appear in code.
- Nothing is pushed: a push to `master` deploys the site, and the owner tries the scenes first.
- Commit messages: sentence case, ending with a period, like `Rebuild the anniversary vault as mail from the pond.`

## Commands

- Pond tests: `npx vitest run src/lib/pond`
- All tests: `npx vitest run`
- Types: `npx svelte-check --tsconfig ./tsconfig.json`
- Build: `npm run build`

## Files

| File | Responsibility |
|---|---|
| `src/lib/pond/life.ts` (new) | Frog core: `pond()`, `Scene`, `SceneOpts`, `Perch`, `SceneContext`, `Setting`, `scatter()` |
| `src/lib/pond/sky.ts` (new) | Shared painting: `ridge`, `scatterStars`/`drawStars`, `glitterRows`/`glitter`, `halo` |
| `src/lib/pond/scenes/lake.ts` (new) | The night lake setting (today's look) |
| `src/lib/pond/scenes/beach.ts`, `meadow.ts`, `onsen.ts`, `waterfall.ts`, `cave.ts` (new) | The five new settings |
| `src/lib/pond/scenes/index.ts` (new) | `SCENES`, `SceneName`, `SCENE_NAMES`, `makeScene`, `assignScenes` |
| `src/lib/secret/pass-scenes.ts` (new) | `passScenes(icons)`: a scene per vault pass by icon |
| `src/lib/pond/palette.ts` | `day` and `snow` ramps, accent `INK` slots; `assignPalettes` removed |
| `src/lib/pond/frog.ts` | `drawTowel` |
| `src/lib/pond/PondCanvas.svelte` | `scene` prop, optional `palette` override; `biome` removed |
| `src/lib/pond/pond.test.ts` | Scene contracts over every scene, scene-specific checks |
| `src/lib/secret/pass-scenes.test.ts` (new) | Pass icon matching |
| Consumers | `Hero`, `GitHubActivitySection`, `Footer`, `Projects`, `ProjectCard`, `LetterStage`, `LovePass`, `LovePasses`, `PondGoodbye` |
| Deleted | `src/lib/pond/night.ts`, `src/lib/pond/scene.ts`, `src/lib/pond/biome.ts` |

## Throwaway tools (never committed)

Two scripts in `/tmp` for looking at a scene and timing it while tuning. They import the repo by absolute path, so they work from any directory. Create them when Task 2 is done (they use the registry); delete them at the end of Task 9.

`/tmp/scene-png.ts`: renders a scene to a PNG at 3× size.

```ts
// Usage: bun /tmp/scene-png.ts <scene> <W> <H> <seconds> <out.png> [palette]
import { deflateSync } from 'node:zlib';
import { Field, packPalette, quantize } from '/home/jlo/dev/mintychochip.github.io/src/lib/pond/field';
import { INK_COLORS, PALETTES, type PaletteName } from '/home/jlo/dev/mintychochip.github.io/src/lib/pond/palette';
import { SCENES, makeScene, type SceneName } from '/home/jlo/dev/mintychochip.github.io/src/lib/pond/scenes';

const [name, w, h, secs, out, pal] = process.argv.slice(2) as [SceneName, string, string, string, string, PaletteName?];
const W = Number(w), H = Number(h), S = 3;
const F = new Field(W, H);
const scene = makeScene(name, W, H, { seed: 'preview', k: Math.min(2.6, Math.max(1.3, W / 123)), frogs: 2, flies: 6 });
for (let fr = 0; fr <= Number(secs) * 12; fr++) scene.render(fr / 12, F);
const px = new Uint32Array(W * H);
quantize(F, packPalette(PALETTES[pal ?? SCENES[name].palette]), px, packPalette(INK_COLORS));

const raw = Buffer.alloc((W * S * 4 + 1) * H * S);
let o = 0;
for (let y = 0; y < H * S; y++) {
  raw[o++] = 0;
  for (let x = 0; x < W * S; x++) {
    const c = px[Math.floor(y / S) * W + Math.floor(x / S)];
    raw[o++] = c & 255;
    raw[o++] = (c >> 8) & 255;
    raw[o++] = (c >> 16) & 255;
    raw[o++] = 255;
  }
}
const table = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (b: Buffer) => {
  let c = 0xffffffff;
  for (const x of b) c = table[(c ^ x) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type: string, data: Buffer) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const sum = Buffer.alloc(4);
  sum.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, sum]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W * S, 0);
ihdr.writeUInt32BE(H * S, 4);
ihdr[8] = 8;
ihdr[9] = 6;
await Bun.write(out, Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
]));
```

`/tmp/scene-speed.ts`: average frame cost per scene at hero size.

```ts
// Usage: bun /tmp/scene-speed.ts
import { Field, packPalette, quantize } from '/home/jlo/dev/mintychochip.github.io/src/lib/pond/field';
import { PALETTES } from '/home/jlo/dev/mintychochip.github.io/src/lib/pond/palette';
import { SCENES, SCENE_NAMES, makeScene } from '/home/jlo/dev/mintychochip.github.io/src/lib/pond/scenes';

const W = 320, H = 110, N = 240;
let lake = 0;
for (const name of SCENE_NAMES) {
  const F = new Field(W, H);
  const scene = makeScene(name, W, H, { seed: 'speed', k: 2.6, frogs: 2, flies: 8 });
  const pal = packPalette(PALETTES[SCENES[name].palette]), out = new Uint32Array(W * H);
  for (let fr = 0; fr < 24; fr++) { scene.render(fr / 12, F); quantize(F, pal, out); }
  const t0 = performance.now();
  for (let fr = 24; fr < 24 + N; fr++) { scene.render(fr / 12, F); quantize(F, pal, out); }
  const ms = (performance.now() - t0) / N;
  if (name === 'lake') lake = ms;
  console.log(name.padEnd(10), ms.toFixed(3), 'ms', lake ? `${(ms / lake).toFixed(2)}x lake` : '');
}
```

---

### Task 1: Frog core and the lake rebuilt on it

The lake's behaviour moves unchanged into `life.ts`; its look moves into `scenes/lake.ts`. Pads become perches. The random stream is consumed in a new order (the setting's layout first, then frogs and flies), so each seed lays its pads out differently from today; the composition and every behaviour stay the same.

**Files:**
- Create: `src/lib/pond/life.ts`, `src/lib/pond/sky.ts`, `src/lib/pond/scenes/lake.ts`
- Modify: `src/lib/pond/PondCanvas.svelte:34-99`, `src/lib/github/GitHubActivitySection.svelte:52-66`, `src/lib/components/Footer.svelte:11-15`, `src/lib/pond/pond.test.ts`
- Delete: `src/lib/pond/night.ts`

**Interfaces:**
- Consumes: `Field`, `TAU`, `clamp`, `hash`, `lerp`, `mul`, `rng`, `sceneTone`, `set` (`field.ts`); `drawFrog`, `frogBox`, `mouthAt`, `sizeFor`, `Frame`, `FrogFace`, `FrogKind` (`frog.ts`); `INK` (`palette.ts`).
- Produces:
  - `life.ts`: `interface SceneOpts { seed?; k?; frogs?; flies?; horizon?; clear?; still? }`, `interface Scene` (with `meet?(): void` until Task 2), `interface Perch { x; y; rx; ry; p; floats: boolean; ph }`, `interface SceneContext { W; H; k; r: () => number; y0; depthAt(y); inClear(xa, ya, xb, yb); frogAt(p): { w; h }; frogs: number; ripple(x, y, t, s?) }`, `interface Setting<P extends Perch = Perch> { perches: P[]; light: 1 | -1; backdrop: Float32Array; water?(x, y): boolean; back(F, t); drawPerch(F, perch: P, top, t); front(F, t); fly(F, x, y, on); taken?(perch: P) }`, `type SettingMaker<P extends Perch = Perch> = (c: SceneContext) => Setting<P>`, `scatter<P extends Perch>(c, want, next: () => P): P[]`, `pond<P extends Perch>(W, H, o: SceneOpts, make: SettingMaker<P>): Scene`.
  - `sky.ts`: `ridge(c, base, wave, hMin, hMax, step, spread = 0.26): Float32Array`, `interface Star`, `scatterStars(c, rows, free): Star[]`, `drawStars(F, stars, t)`, `glitterRows(rows, from, t)`, `glitter(x, y, t, depth, cx, R, row): number`, `halo(d, R, amp, reach = 2.6): number`.
  - `scenes/lake.ts`: `lake: SettingMaker<Pad>`.

- [ ] **Step 1: Point the pond tests at the core**

In `src/lib/pond/pond.test.ts`, replace the `nightPond` import (line 5) and every `nightPond(W, H, opts)` call with `pond(W, H, opts, lake)`:

```ts
import { pond } from './life';
import { lake } from './scenes/lake';
```

```ts
const render = (seed: string, t: number, W = 120, H = 60) => {
  const F = new Field(W, H);
  const scene = pond(W, H, { seed, k: 1.4, frogs: 2, flies: 4 }, lake);
  for (let fr = 0; fr <= t * 12; fr++) scene.render(fr / 12, F);
  return { F, scene };
};
```

The six other calls change the same way, for example `nightPond(W, H, { seed: 'long', k: 1.6, frogs: 3, flies: 6 })` becomes `pond(W, H, { seed: 'long', k: 1.6, frogs: 3, flies: 6 }, lake)`. Nothing they assert changes.

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/lib/pond`
Expected: FAIL, `Failed to resolve import "./life"`.

- [ ] **Step 3: Write the shared painting helpers**

Create `src/lib/pond/sky.ts`:

```ts
import { TAU, hash, type Field } from './field';
import type { SceneContext } from './life';

/**
 * A silhouette line per column, as the row its top reaches: a wavy base `base` units above the horizon (units are
 * art pixels per frog unit, `k`), with triangular spikes `hMin`..`hMax` units tall every `step` units, each about
 * `spread` times as wide as it is tall. Narrow spikes are pines, wide ones mountain peaks.
 */
export function ridge(c: SceneContext, base: number, wave: number, hMin: number, hMax: number, step: number, spread = 0.26): Float32Array {
  const { W, k, r, y0 } = c;
  const a = new Float32Array(W), ph = r() * 10;
  for (let x = 0; x < W; x++) a[x] = y0 - (base + wave * (Math.sin((x * 0.09) / k + ph) + 0.6 * Math.sin((x * 0.23) / k + ph * 2))) * k;
  for (let tx = -4 * k; tx < W + 4 * k; tx += (step + 4 * r()) * k) {
    const th = (hMin + (hMax - hMin) * r() * r()) * k, hw = th * (spread + 0.1 * r());
    for (let x = Math.max(0, Math.floor(tx - hw)); x <= Math.min(W - 1, Math.ceil(tx + hw)); x++) {
      const dx = Math.abs(x + 0.5 - tx) / hw;
      if (dx <= 1) a[x] = Math.min(a[x], y0 - base * k - th * (1 - dx));
    }
  }
  return a;
}

export interface Star {
  x: number;
  y: number;
  ph: number;
  sp: number;
}

/** Stars over the top `rows` rows, about one per 70 pixels, kept where `free` allows. */
export function scatterStars(c: SceneContext, rows: number, free: (x: number, y: number) => boolean): Star[] {
  const { W, r } = c;
  return Array.from({ length: Math.round((W * rows) / 70) }, () => ({
    x: Math.floor(r() * W), y: Math.floor(r() * rows * 0.8), ph: r() * TAU, sp: 0.8 + 2 * r(),
  })).filter((s) => free(s.x, s.y));
}

/** Twinkles the stars over whatever is already drawn there. */
export function drawStars(F: Field, stars: readonly Star[], t: number) {
  const { v, W } = F;
  for (const s of stars) {
    const i = s.y * W + s.x;
    v[i] = Math.max(v[i], 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph)));
  }
}

/** Per-row randomness for a light's glitter on water, from row `from` down, re-rolled three times a second. */
export function glitterRows(rows: Float32Array, from: number, t: number) {
  for (let y = from; y < rows.length; y++) rows[y] = hash(`${y}:${Math.floor(t * 3 + y * 0.37)}`) / 4294967296;
}

/**
 * How much a light of radius `R` over column `cx` brightens water at (x, y), where `depth` runs 0 at the horizon to
 * 1 at the near edge and `row` is that row's glitter from `glitterRows`.
 */
export function glitter(x: number, y: number, t: number, depth: number, cx: number, R: number, row: number): number {
  const gw = R * (0.35 + 1.1 * depth) * (0.35 + 0.9 * row);
  const mdx = Math.abs(x + 0.5 - (cx + (row - 0.5) * R * 0.6));
  if (mdx >= gw || Math.sin(y * 1.25 + t * 2.1 + Math.sin(x * 0.45 + t * 0.9) * 1.3) <= 0.3) return 0;
  return 0.72 * Math.pow(1 - mdx / gw, 1.2) * (1 - 0.5 * depth);
}

/** Glow `amp` at distance `d` from the centre of a disc of radius `R`, fading out over `reach` radii past its edge. */
export function halo(d: number, R: number, amp: number, reach = 2.6): number {
  if (d < R || d >= R * (1 + reach)) return 0;
  return amp * Math.pow(1 - (d - R) / (R * reach), 2.2);
}
```

- [ ] **Step 4: Write the frog core**

Create `src/lib/pond/life.ts`. Everything from `night.ts` that is alive moves here: the frog state machine, hops, dives, swims, climbs, tongue snaps, flies, ripples, splash drops, the meeting, pointer input and `frogs()`. Pads become perches, the core keeps who sits on each perch and its landing dip, and ripples only spread where the setting has water.

```ts
import { TAU, clamp, hash, lerp, mul, rng, sceneTone, type Field } from './field';
import { drawFrog as paintFrog, frogBox, mouthAt as frogMouth, sizeFor, type Frame, type FrogFace, type FrogKind } from './frog';
import { INK } from './palette';

/** Options every scene takes. */
export interface SceneOpts {
  seed?: string;
  /** Art pixels per frog unit; also scales perches, ripples and hops. */
  k?: number;
  frogs?: number;
  flies?: number;
  /** Horizon row as a fraction of the height. */
  horizon?: number;
  /** Boxes [left, top, right, bottom], as fractions of the frame, kept clear of perches and the frogs on them. */
  clear?: readonly (readonly [number, number, number, number])[];
  /** No autonomous actions: frogs sit and look around. */
  still?: boolean;
}

export interface Scene {
  render(t: number, F: Field): void;
  /** Ripple at a point on the water (pointer movement). */
  poke(x: number, y: number): void;
  /** Click: startle a frog, send one to a perch, or ripple the water. */
  tap(x: number, y: number): void;
  /** Pointer position frogs should watch. */
  look(x: number, y: number): void;
  /** Something nearby happened (the card was hovered): a frog does something. */
  react(): void;
  /**
   * The green frog goes to the pink one: she shuffles to one side of her perch, he hops onto the other side, they
   * turn to face each other, and both croak under a heart. Scenes without both frogs do nothing.
   */
  meet?(): void;
  /** Where each frog is and what it is doing, for tests and tools. */
  frogs(): { state: string; x: number; y: number; s: number; dir: number }[];
}

/** Somewhere a frog can sit. Settings place these and may add fields of their own for drawing them. */
export interface Perch {
  /** Middle of the top surface at rest, in art pixels. */
  x: number;
  y: number;
  /** Half-width and half-depth of the top surface. */
  rx: number;
  ry: number;
  /** Perspective scale where it stands (`depthAt`). */
  p: number;
  /** Floats on water: bobs, and dips and ripples when landed on. Rocks, stones and mushrooms stand still. */
  floats: boolean;
  /** Bob phase. */
  ph: number;
}

/** What a setting is given to build its world from. */
export interface SceneContext {
  W: number;
  H: number;
  /** Art pixels per frog unit. */
  k: number;
  /** The scene's seeded random stream: the setting draws its layout from it, then the frogs are placed. */
  r: () => number;
  /** Horizon row. */
  y0: number;
  /** Perspective scale at a row: 0.45 at the horizon, 1.2 at the bottom edge. */
  depthAt(y: number): number;
  /** Whether anything from xa..xb, ya..yb (art pixels) would show inside a clear box. */
  inClear(xa: number, ya: number, xb: number, yb: number): boolean;
  /** The sitting frog's size at perspective scale `p`, for making perches a frog fits on. */
  frogAt(p: number): { w: number; h: number };
  /** How many frogs will live here. */
  frogs: number;
  /** Sets off a ripple at (x, y) at time `t`, if that is water. Only while rendering, never while building. */
  ripple(x: number, y: number, t: number, s?: number): void;
}

/** A world for the frogs: what it looks like, where they can sit and where they can swim. */
export interface Setting<P extends Perch = Perch> {
  perches: P[];
  /** Side the light comes from, 1 right or -1 left; shadows fall the other way. */
  light: 1 | -1;
  /** Tones that never change, W×H, copied in at the start of every frame. */
  backdrop: Float32Array;
  /** Whether (x, y) is water a frog can dive into and swim through. Settings without water leave it out. */
  water?(x: number, y: number): boolean;
  /** Moving layer under the perches and frogs: water, waves, glints, twinkling stars. */
  back(F: Field, t: number): void;
  /** Draws a perch with its top surface at row `top` (bobbing and landing dips included). */
  drawPerch(F: Field, perch: P, top: number, t: number): void;
  /** Moving layer over the perches and frogs, under the flies: reeds, grass, snow, steam, mist. */
  front(F: Field, t: number): void;
  /** One fly at (x, y); `on` (0.1..1) is how lit it is right now. */
  fly(F: Field, x: number, y: number, on: number): void;
  /** A frog has just taken this perch. */
  taken?(perch: P): void;
}

export type SettingMaker<P extends Perch = Perch> = (c: SceneContext) => Setting<P>;

/**
 * Up to `want` perches from `next` (a new random one per call), apart from each other and, with a frog sitting on
 * them, out of the clear boxes. Sorted far to near.
 */
export function scatter<P extends Perch>(c: SceneContext, want: number, next: () => P): P[] {
  const out: P[] = [];
  for (let tries = 0; tries < 400 && out.length < want; tries++) {
    const P = next();
    if (c.inClear(P.x - P.rx, P.y - P.ry - c.frogAt(P.p).h, P.x + P.rx, P.y + P.ry)) continue;
    if (out.every((q) => Math.abs(q.x - P.x) > q.rx + P.rx + c.k || Math.abs(q.y - P.y) > (q.ry + P.ry) * 1.6)) out.push(P);
  }
  return out.sort((a, b) => a.y - b.y);
}

interface Fly {
  cx: number; cy: number; ax: number; ay: number; fx: number; fy: number;
  ph: number; bf: number; gone: number; out: boolean;
}

interface Hop {
  x0: number; y0: number; s0: number; x1: number; y1: number; s1: number;
  t0: number; dur: number; h: number; to: number; dive: boolean; climb: boolean;
  /** Where on the perch it lands, sideways from the middle. */
  shift: number;
}

interface Tongue { fly: Fly; caught: boolean }

type State = 'sit' | 'croak' | 'snap' | 'turn' | 'crouch' | 'air' | 'land' | 'swim';

interface Frog {
  /** The perch it sits on, or swims to. */
  perch: number;
  dir: 1 | -1; sz: number; ph: number;
  kind: FrogKind;
  state: State; t0: number; next: number; blink: number; snapAt: number;
  /** When the next fingertip tapping starts, and when the frog was last startled. */
  fidget: number; startled: number;
  hop: Hop | null; tongue: Tongue | null;
  swim: { x: number; y: number; to: number; wake: number } | null;
  look: [number, number];
  /** Sideways from the middle of its perch: off-centre only while it shares the perch with the other frog. */
  shift: number;
}

const CROUCH_T = 0.17, LAND_T = 0.17, SETTLE_T = 0.17;
const SNAP_WIND = 0.09, SNAP_OUT = 0.17, SNAP_BACK = 0.17, SNAP_GULP = 0.33;
const CROAK_T = 1.2, TURN_T = 0.25, FIDGET_T = 1.2, STARTLE_T = 0.9;
/** Frog scale per perch depth, in art pixels per unit of a frog about 9 units tall; `sizeFor` turns it into a drawing. */
const SIZE = 0.95;
/** The heart that rises between the frogs when they meet; h is its shine. */
const MEET_HEART = ['.xx.xx.', 'xhxxxxx', 'xxxxxxx', '.xxxxx.', '..xxx..', '...x...'];
/** Seconds the heart floats before it is gone. */
const MEET_HEART_T = 2.4;

/** Frogs living in a setting: sitting, hopping, swimming, snapping flies, answering the pointer, meeting. */
export function pond<P extends Perch>(W: number, H: number, o: SceneOpts, make: SettingMaker<P>): Scene {
  const k = o.k ?? 1;
  const r = rng(hash(String(o.seed ?? 'pond')));
  const y0 = Math.round(H * (o.horizon ?? 0.5));
  const depthAt = (y: number) => 0.45 + (0.75 * (y - y0)) / Math.max(1, H - y0);
  const inClear = (xa: number, ya: number, xb: number, yb: number) =>
    (o.clear ?? []).some(([cl, ct, cr, cb]) => xb > cl * W && xa < cr * W && yb > ct * H && ya < cb * H);

  const ripples: { x: number; y: number; t0: number; p: number; s: number }[] = [];
  const drops: { x: number; y: number; vx: number; vy: number; t0: number }[] = [];
  /** Rings only spread on water. */
  const ripple = (x: number, y: number, t: number, s = 1) => {
    if (ripples.length < 40 && setting.water?.(x, y)) ripples.push({ x, y, t0: t, p: depthAt(y), s });
  };

  const setting = make({
    W, H, k, r, y0, depthAt, inClear,
    frogAt: (p) => frogBox(sizeFor(k * p * SIZE)),
    frogs: o.frogs ?? 1,
    ripple,
  });
  const { perches, light } = setting;
  /** When each floating perch was last landed on and how hard, and who sits on each perch. */
  const dipAt = perches.map(() => -9);
  const dipBy = perches.map(() => 0);
  const holder: (Frog | null)[] = perches.map(() => null);
  /** A perch's top surface now: floating ones bob and dip, standing ones stay put. */
  const surface = (i: number, t: number) => {
    const P = perches[i];
    if (!P.floats) return P.y;
    const age = t - dipAt[i];
    const dip = age >= 0 && age < 1.6 ? dipBy[i] * Math.exp(-age * 4) * Math.cos(age * 13) : 0;
    return P.y + 0.35 * k * Math.sin(t * 1.1 + P.ph) + dip;
  };
  const fitsFrog = (P: Perch) => 2 * P.rx >= 0.9 * frogBox(sizeFor(k * P.p * SIZE)).w;

  const homes = perches.map((_, i) => i).filter((i) => fitsFrog(perches[i])).sort((a, b) => perches[b].rx - perches[a].rx);
  const count = o.frogs ?? 1;
  const chosen: number[] = [];
  if (count === 2 && homes.length >= 3) {
    const top3 = homes.slice(0, 3);
    const far = top3.reduce((min, i) => (perches[i].y < perches[min].y ? i : min), top3[0]);
    const near = top3.reduce((max, i) => (perches[i].y > perches[max].y ? i : max), top3[0]);
    chosen.push(near, far);
  } else {
    chosen.push(...homes.slice(0, count));
  }
  const farthest = chosen.length > 1 ? chosen.reduce((min, i) => (perches[i].y < perches[min].y ? i : min), chosen[0]) : -1;
  const frogs: Frog[] = chosen.map((i) => {
    const f: Frog = {
      perch: i, dir: r() < 0.5 ? 1 : -1, sz: 0.95 + 0.15 * r(), ph: r() * TAU,
      kind: i === farthest ? 'pink' : 'green',
      state: 'sit', t0: 0, next: 1 + r() * 3, blink: 1 + r() * 4, snapAt: 1 + r() * 2,
      fidget: 2 + r() * 5, startled: -9,
      hop: null, tongue: null, swim: null, look: [0.5, 0], shift: 0,
    };
    holder[i] = f;
    setting.taken?.(perches[i]);
    return f;
  });

  const flies: Fly[] = Array.from({ length: o.flies ?? Math.max(3, Math.round((W * H) / 700)) }, () => {
    const fl = { cx: 0, cy: 0, ax: 0, ay: 0, fx: 0, fy: 0, ph: 0, bf: 0, gone: 0, out: false };
    placeFly(fl);
    return fl;
  });
  function placeFly(fl: Fly) {
    fl.cx = r() * W;
    fl.cy = y0 * 0.35 + r() * (y0 * 0.65 + 0.35 * (H - y0));
    fl.ax = (3 + 6 * r()) * k; fl.ay = (2 + 4 * r()) * k;
    fl.fx = 0.3 + 0.5 * r(); fl.fy = 0.4 + 0.6 * r();
    fl.ph = r() * TAU; fl.bf = 1.5 + 2 * r();
  }
  const flyPos = (fl: Fly, t: number): [number, number] => [
    fl.cx + fl.ax * Math.sin(t * fl.fx + fl.ph) + 0.4 * fl.ax * Math.sin(t * fl.fx * 2.3 + fl.ph * 2),
    fl.cy + fl.ay * Math.sin(t * fl.fy + fl.ph * 1.7),
  ];

  let now = 0;
  let pointer: { x: number; y: number; t: number } | null = null;
  /** A meeting asked for by `meet()`: hopping over, turning to face each other, then the heart. */
  let meeting: { stage: 'go' | 'face' | 'love'; t: number; x: number; y: number } | null = null;

  const splash = (x: number, y: number, t: number, n: number, s: number) => {
    for (let j = 0; j < n; j++) {
      const a = -Math.PI / 2 + (r() - 0.5) * 2.2;
      const v = (10 + 14 * r()) * s;
      drops.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t0: t });
    }
  };

  const scale = (f: Frog, P: Perch) => k * P.p * SIZE * f.sz;
  const seat = (i: number, t: number): [number, number] => [perches[i].x, surface(i, t) - perches[i].ry * 0.15];
  const mouthAt = (x: number, y: number, s: number, dir: number) => frogMouth(sizeFor(s), 'sit', x, y, dir < 0);
  /** Where a frog swimming from column `fromX` climbs onto perch `P`: its edge on that side. */
  const approach = (P: Perch, fromX: number): [number, number] => [P.x - Math.sign(P.x - fromX || 1) * P.rx * 0.9, P.y + P.ry * 0.6];

  function frogXY(f: Frog, t: number): { x: number; y: number; s: number; ground: number } {
    if (f.swim) {
      const s = k * depthAt(f.swim.y) * SIZE * f.sz;
      return { x: f.swim.x, y: f.swim.y, s, ground: f.swim.y };
    }
    if (f.hop && (f.state === 'air' || f.state === 'land')) {
      const h = f.hop;
      if (f.state === 'land') {
        if (h.to >= 0) { const [x, y] = seat(h.to, t); return { x: x + f.shift, y, s: h.s1, ground: y }; }
        return { x: h.x1, y: h.y1, s: h.s1, ground: h.y1 };
      }
      const u = clamp((t - h.t0) / h.dur, 0, 1);
      let x1 = h.x1, y1 = h.y1;
      if (h.to >= 0) { [x1, y1] = seat(h.to, t); x1 += h.shift; }
      const gy = lerp(h.y0, y1, u);
      return { x: lerp(h.x0, x1, u), y: gy - h.h * 4 * u * (1 - u), s: lerp(h.s0, h.s1, u), ground: gy };
    }
    const [x, y] = seat(f.perch, t);
    return { x: x + f.shift, y, s: scale(f, perches[f.perch]), ground: y };
  }

  function freePerches(f: Frog, x: number, y: number, maxD: number) {
    return perches
      .map((P, i) => ({ P, i, d: Math.hypot(P.x - x, (P.y - y) * 1.6) }))
      .filter(({ P, i, d }) => i !== f.perch && !holder[i] && fitsFrog(P) && d < maxD && d > P.rx * 0.5);
  }

  /** The free perch a frog in the water at (x, y) swims to: the nearest it can climb onto from the water. */
  function landing(x: number, y: number) {
    let best = -1, bd = Infinity;
    perches.forEach((P, i) => {
      if (holder[i] || !fitsFrog(P)) return;
      const [ax, ay] = approach(P, x);
      const d = Math.hypot(P.x - x, P.y - y) + (setting.water?.(ax, ay) ? 0 : 1e6);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }

  /** The frog is leaving its perch, which stays taken if the other frog shares it. */
  function leave(f: Frog) {
    holder[f.perch] = frogs.find((o) => o !== f && o.perch === f.perch) ?? null;
  }

  function startHop(f: Frog, t: number, to: number, shift = 0) {
    const P0 = perches[f.perch], P1 = perches[to];
    const [sa, ya] = seat(f.perch, t), [sb, yb] = seat(to, t);
    const xa = sa + f.shift, xb = sb + shift;
    const dist = Math.hypot(xb - xa, yb - ya);
    leave(f);
    holder[to] ??= f;
    setting.taken?.(P1);
    if (Math.abs(xb - xa) > 2 * k) f.dir = xb > xa ? 1 : -1;
    f.hop = {
      x0: xa, y0: ya, s0: scale(f, P0), x1: xb, y1: yb, s1: scale(f, P1),
      t0: t + CROUCH_T, dur: clamp(0.36 + (0.11 * dist) / (10 * k), 0.4, 0.8),
      h: 5 * k * (P0.p + P1.p) * 0.5 + 0.16 * dist, to, dive: false, climb: false, shift,
    };
    f.state = 'crouch';
    f.t0 = t;
  }

  function startDive(f: Frog, t: number) {
    if (!setting.water) return false;
    const P0 = perches[f.perch];
    const [sx, ya] = seat(f.perch, t), xa = sx + f.shift;
    for (let tries = 0; tries < 12; tries++) {
      const dx = (12 + 22 * r()) * k * P0.p * (r() < 0.5 ? -1 : 1);
      const x = xa + dx, y = clamp(ya + (r() - 0.3) * 10 * k, y0 + 3 * k, H - 3 * k);
      if (x < 4 * k || x > W - 4 * k || !setting.water(x, y) || inClear(x - 4 * k, y - 3 * k, x + 4 * k, y + k)) continue;
      if (perches.some((P) => Math.abs(P.x - x) < P.rx + 2 * k && Math.abs(P.y - y) < P.ry + 3 * k)) continue;
      leave(f);
      f.dir = dx > 0 ? 1 : -1;
      const p = depthAt(y);
      f.hop = {
        x0: xa, y0: ya, s0: scale(f, P0), x1: x, y1: y, s1: k * p * SIZE * f.sz, t0: t + CROUCH_T,
        dur: clamp(0.36 + (0.11 * Math.abs(dx)) / (10 * k), 0.4, 0.75), h: 8 * k * P0.p + 0.2 * Math.abs(dx), to: -1, dive: true, climb: false, shift: 0,
      };
      f.state = 'crouch';
      f.t0 = t;
      return true;
    }
    return false;
  }

  function startClimb(f: Frog, t: number) {
    const sw = f.swim!;
    const P1 = perches[sw.to];
    const [xb, yb] = seat(sw.to, t);
    const s = k * depthAt(sw.y) * SIZE * f.sz, b = frogBox(sizeFor(s));
    f.dir = xb > sw.x ? 1 : -1;
    f.hop = { x0: sw.x, y0: sw.y + b.h - b.swim, s0: s, x1: xb, y1: yb, s1: scale(f, P1), t0: t, dur: 0.38, h: 3.5 * k * P1.p, to: sw.to, dive: false, climb: true, shift: 0 };
    f.swim = null;
    f.state = 'air';
    f.t0 = t;
    ripple(sw.x, sw.y, t, 0.7);
    splash(sw.x, sw.y, t, 3, k * 0.6);
  }

  function nearestFly(x: number, y: number, t: number, reach: number) {
    let best: Fly | null = null, bd = reach;
    for (const fl of flies) {
      if (fl.out || Math.sin(t * fl.bf + fl.ph) < 0.1) continue;
      const [fx, fy] = flyPos(fl, t);
      const d = Math.hypot(fx - x, fy - y);
      if (d < bd) { bd = d; best = fl; }
    }
    return best;
  }

  function act(f: Frog, t: number) {
    const { x, y } = frogXY(f, t);
    const roll = r();
    if (roll < 0.42) {
      const near = freePerches(f, x, y, 40 * k);
      if (near.length) {
        near.sort((a, b) => a.d - b.d);
        startHop(f, t, near[Math.floor(r() * Math.min(3, near.length))].i);
        return;
      }
    }
    if (roll >= 0.42 && roll < 0.52 && startDive(f, t)) return;
    if (roll < 0.74) { f.state = 'croak'; f.t0 = t; ripple(x, y, t, 0.6); return; }
    if (roll < 0.88) { f.state = 'turn'; f.t0 = t; return; }
    f.look = [r() * 2 - 1, r() - 0.7];
  }

  let last = 0;
  function update(t: number) {
    const dt = clamp(t - last, 0, 0.25);
    last = t;
    for (const f of frogs) {
      let guard = 0;
      while (guard++ < 6) {
        const age = t - f.t0;
        if (f.state === 'sit') {
          if (o.still) break;
          const { x, y, s } = frogXY(f, t);
          if (t >= f.snapAt) {
            const [mx, my] = mouthAt(x, y, s, f.dir);
            const fl = nearestFly(mx, my, t, 15 * s);
            if (fl) {
              const [fx] = flyPos(fl, t);
              if ((fx - x) * f.dir < 0) { f.state = 'turn'; f.t0 = t; f.snapAt = t + TURN_T; break; }
              f.state = 'snap'; f.t0 = t; f.tongue = { fly: fl, caught: false }; fl.out = true;
              f.snapAt = t + 4 + 5 * r();
              break;
            }
            f.snapAt = t + 0.25;
          }
          if (t >= f.next) { f.next = t + 2.4 + 4 * r(); act(f, t); }
          break;
        }
        if (f.state === 'croak' && age >= CROAK_T) { f.state = 'sit'; f.t0 = f.t0 + CROAK_T; continue; }
        if (f.state === 'turn') {
          if (age >= TURN_T) { f.dir = f.dir === 1 ? -1 : 1; f.state = 'sit'; f.t0 += TURN_T; continue; }
          break;
        }
        if (f.state === 'snap') {
          const tg = f.tongue!;
          if (!tg.caught && age >= SNAP_WIND + SNAP_OUT) tg.caught = true;
          if (age >= SNAP_WIND + SNAP_OUT + SNAP_BACK + SNAP_GULP) {
            tg.fly.gone = t + 2.5; f.tongue = null; f.state = 'sit'; f.t0 = t; continue;
          }
          break;
        }
        if (f.state === 'crouch' && age >= CROUCH_T) { f.state = 'air'; f.t0 += CROUCH_T; continue; }
        if (f.state === 'air') {
          const h = f.hop!;
          if (t >= h.t0 + h.dur) {
            const end = h.t0 + h.dur;
            if (h.dive) {
              ripple(h.x1, h.y1, end, 1.3);
              splash(h.x1, h.y1, end, 7, k * 0.8);
              const found = landing(h.x1, h.y1);
              const to = found >= 0 ? found : f.perch;
              holder[to] = f;
              f.perch = to;
              f.swim = { x: h.x1, y: h.y1, to, wake: end };
              f.hop = null;
              f.state = 'swim';
              f.t0 = end;
            } else {
              f.perch = h.to;
              f.shift = h.shift;
              if (perches[h.to].floats) {
                dipAt[h.to] = end;
                dipBy[h.to] = 0.9 * k * perches[h.to].p;
                ripple(h.x1, h.y1, end, 0.9);
              }
              f.state = 'land';
              f.t0 = end;
            }
            continue;
          }
          break;
        }
        if (f.state === 'land' && age >= LAND_T + SETTLE_T) { f.hop = null; f.state = 'sit'; f.t0 += LAND_T + SETTLE_T; f.next = Math.max(f.next, t + 1.2 + 2 * r()); continue; }
        if (f.state === 'swim') {
          const sw = f.swim!;
          const [ex, ey] = approach(perches[sw.to], sw.x);
          const dx = ex - sw.x, dy = ey - sw.y, d = Math.hypot(dx, dy);
          if (d < 1.5 * k) { startClimb(f, t); continue; }
          const sp = 9 * k * depthAt(sw.y) * dt;
          sw.x += (dx / d) * Math.min(d, sp);
          sw.y += (dy / d) * Math.min(d, sp);
          if (Math.abs(dx) > 0.5) f.dir = dx > 0 ? 1 : -1;
          if (t - sw.wake > 0.4) { sw.wake = t; ripple(sw.x, sw.y, t, 0.35); }
          break;
        }
        break;
      }
      if (t >= f.blink + 0.17) f.blink = t + 2 + 4 * r();
      if (t >= f.fidget + FIDGET_T) f.fidget = t + 4 + 7 * r();
    }
    if (meeting) updateMeeting(t);
    for (const fl of flies) if (fl.out && fl.gone > 0 && t >= fl.gone) { placeFly(fl); fl.out = false; fl.gone = 0; }
    for (let i = ripples.length - 1; i >= 0; i--) if (t - ripples[i].t0 > 2 || t < ripples[i].t0) ripples.splice(i, 1);
    for (let i = drops.length - 1; i >= 0; i--) if (t - drops[i].t0 > 0.6 || t < drops[i].t0) drops.splice(i, 1);
  }

  function updateMeeting(t: number) {
    const green = frogs.find((f) => f.kind === 'green');
    const pink = frogs.find((f) => f.kind === 'pink');
    if (!meeting || !green || !pink) return;
    const idle = green.state === 'sit' && pink.state === 'sit';
    if (meeting.stage === 'go' && idle && green.perch !== pink.perch) {
      // She shuffles to one side of her perch and he hops onto the other, so they sit on it together.
      const P = perches[pink.perch];
      const side = frogXY(green, t).x >= P.x ? 1 : -1;
      // Side by side with their outlines just touching, even on a perch too small for both: they squeeze onto it.
      const room = 0.46 * frogBox(sizeFor(scale(pink, P))).w;
      startHop(pink, t, pink.perch, -side * room);
      startHop(green, t, pink.perch, side * room);
    } else if (meeting.stage === 'go' && idle) {
      const toPink = frogXY(pink, t).x >= frogXY(green, t).x ? 1 : -1;
      if (green.dir !== toPink) { green.state = 'turn'; green.t0 = t; }
      if (pink.dir !== -toPink) { pink.state = 'turn'; pink.t0 = t; }
      meeting.stage = 'face';
    } else if (meeting.stage === 'face' && idle) {
      const a = frogXY(green, t), b = frogXY(pink, t);
      for (const f of [green, pink]) { f.state = 'croak'; f.t0 = t; }
      const heads = Math.min(a.y - frogBox(sizeFor(a.s)).h, b.y - frogBox(sizeFor(b.s)).h);
      meeting = { stage: 'love', t, x: (a.x + b.x) / 2, y: heads - 2 * k };
    } else if (meeting.stage === 'love' && t - meeting.t > MEET_HEART_T) {
      meeting = null;
    }
  }

  function drawFrog(F: Field, f: Frog, t: number) {
    const { x, y, s } = frogXY(f, t);
    const age = t - f.t0;
    let size = sizeFor(s);
    let frame: Frame = Math.sin(t * 2.2 + f.ph) > 0.3 ? 'breath' : 'sit';
    const face: FrogFace = { wide: t - f.startled < STARTLE_T };
    let lift = 0, clipY: number | undefined, dy = y;
    let mirror = f.dir < 0;

    switch (f.state) {
      case 'sit': {
        const u = t - f.fidget;
        if (u >= 0 && u < FIDGET_T) face.blep = true;
        break;
      }
      case 'croak': {
        const a = age % 0.6;
        face.sac = age < 1.1 && a > 0.05 && a < 0.5 ? Math.sin((Math.PI * (a - 0.05)) / 0.45) : 0;
        face.eyes = 'happy';
        frame = face.sac > 0.5 ? 'sit' : 'breath';
        break;
      }
      case 'turn': {
        const u = clamp(age / TURN_T, 0, 1);
        frame = u < 0.2 || u > 0.85 ? 'crouch' : 'sit';
        lift = Math.round((size + 1) * Math.sin(Math.PI * u));
        if (u >= 0.5) mirror = !mirror;
        break;
      }
      case 'snap': {
        if (age < SNAP_WIND) frame = 'crouch';
        else if (age >= SNAP_WIND + SNAP_OUT + SNAP_BACK) {
          const g = age - SNAP_WIND - SNAP_OUT - SNAP_BACK;
          face.eyes = 'happy';
          frame = g < 0.14 ? 'crouch' : 'sit';
          face.sac = g < 0.2 ? 0.5 * Math.sin((Math.PI * g) / 0.2) : 0;
        } else frame = 'sit';
        break;
      }
      case 'crouch':
        frame = 'crouch';
        break;
      case 'air': {
        const h = f.hop!;
        const u = clamp((t - h.t0) / h.dur, 0, 1);
        size = sizeFor(u < 0.5 ? h.s0 : h.s1);
        frame = h.climb || u < 0.75 ? 'stretch' : 'sit';
        const vy = (h.to >= 0 ? seat(h.to, t)[1] : h.y1) - h.y0 - h.h * 4 * (1 - 2 * u);
        face.look = [1, vy < 0 ? -1 : 1];
        if (h.climb && u < 0.45) {
          const b = frogBox(sizeFor(h.s0));
          clipY = Math.round(h.y0) - (b.h - b.swim);
        }
        if (h.dive && u > 0.85) clipY = Math.round(h.y1);
        break;
      }
      case 'land':
        frame = age < LAND_T ? 'crouch' : 'sit';
        break;
      case 'swim': {
        const b = frogBox(size);
        dy = y + b.h - b.swim;
        clipY = Math.round(y);
        frame = 'sit';
        break;
      }
    }
    const box = frogBox(size);

    if (f.state === 'sit' || f.state === 'croak' || f.state === 'snap' || f.state === 'land' || f.state === 'swim') {
      const eyeY = dy - lift - box.eye;
      const target = pointer && now - pointer.t < 1.5 ? [pointer.x, pointer.y] : null;
      const fl = target ? null : nearestFly(x, eyeY, t, 40 * s);
      const tg = target ?? (fl ? flyPos(fl, t) : null);
      if (f.tongue) {
        const [tx, ty] = flyPos(f.tongue.fly, t);
        face.look = [Math.sign(tx - x) * f.dir, clamp((ty - eyeY) / (6 * s), -1, 1)];
      } else if (tg) {
        const ex = tg[0] - x, ey = tg[1] - eyeY, d = Math.hypot(ex, ey) || 1;
        const want: [number, number] = [(ex / d) * f.dir, ey / d];
        f.look = [lerp(f.look[0], want[0], 0.35), lerp(f.look[1], want[1], 0.35)];
        face.look = f.look;
      } else {
        face.look = f.look;
      }
    }
    if (face.eyes === undefined && !f.tongue && t >= f.blink && t < f.blink + 0.17) face.eyes = 'shut';

    const shadowH = Math.max(1, box.h * 0.08);
    if (f.state !== 'air' && f.state !== 'swim') {
      F.ell(x - light * 0.06 * box.w, dy - 0.5, box.w * 0.46, shadowH, 0, mul(0.6), true);
    } else if (f.state === 'air' && f.hop) {
      const h = f.hop, u = clamp((t - h.t0) / h.dur, 0, 1);
      const gy = lerp(h.y0, h.to >= 0 ? seat(h.to, t)[1] : h.y1, u);
      F.ell(x, gy - 0.5, box.w * 0.4 * (1 - 0.4 * Math.sin(Math.PI * u)), shadowH, 0, mul(0.6), true);
    }
    paintFrog(F, size, frame, face, x, dy - lift, { mirror, clipY, kind: f.kind });
    if (f.state === 'swim') {
      const half = Math.max(2, Math.round(box.w * 0.35)), wy = Math.round(y);
      for (let j = -half; j <= half; j++) F.dot(x + j, wy, F.get(x + j, wy) > 0.3 ? 0.62 : 0.4);
    }

    if (f.state === 'snap' && f.tongue) {
      const tg = f.tongue;
      const [mx, my] = frogMouth(size, frame, x, dy - lift, mirror);
      const [tx, ty] = flyPos(tg.fly, t);
      const u = age < SNAP_WIND ? 0 : age < SNAP_WIND + SNAP_OUT ? (age - SNAP_WIND) / SNAP_OUT : age < SNAP_WIND + SNAP_OUT + SNAP_BACK ? 1 - (age - SNAP_WIND - SNAP_OUT) / SNAP_BACK : 0;
      if (!tg.caught) setting.fly(F, tx, ty, 1);
      if (u > 0) {
        const ex = mx + (tx - mx) * u, ey = my + (ty - my) * u;
        const n = Math.ceil(Math.hypot(ex - mx, ey - my)) + 1;
        for (let j = 0; j <= n; j++) {
          const px = mx + ((ex - mx) * j) / n, py = my + ((ey - my) * j) / n;
          F.paint(px, py, INK.tongue);
          if (size === 2) F.paint(px, py + 1, INK.tongue);
        }
        const R = [0.5, 1, 1.5][size];
        for (let qy = -R; qy <= R; qy++) for (let qx = -R; qx <= R; qx++) if (qx * qx + qy * qy <= R * R) F.paint(ex + qx, ey + qy, INK.tongue);
        if (tg.caught) F.dot(ex, ey, 1);
      }
    }
  }

  function render(t: number, F: Field) {
    now = t;
    update(t);
    const { v, ink } = F;
    ink.fill(0);
    v.set(setting.backdrop);
    setting.back(F, t);

    if (setting.water) {
      for (const rp of ripples) {
        const age = t - rp.t0, R = age * 7 * k * rp.p, m = R + 3 * k;
        const amp = 0.24 * rp.s * (1 - age / 2);
        const xa = Math.max(0, Math.floor(rp.x - m)), xb = Math.min(W - 1, Math.ceil(rp.x + m));
        const ya = Math.max(0, Math.floor(rp.y - m * 0.33)), yb = Math.min(H - 1, Math.ceil(rp.y + m * 0.33));
        for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
          const d = Math.hypot(x - rp.x, (y - rp.y) / 0.33) - R;
          if (d > -3 * k && d < 3 * k && setting.water(x, y)) {
            const i = y * W + x;
            v[i] = sceneTone(v[i] + amp * Math.exp(-(d * d) / (2 * k * k)), 0.8, 0.06, 0.98);
          }
        }
      }
    }

    const order: { y: number; draw: () => void }[] = [];
    perches.forEach((P, i) => order.push({ y: P.y, draw: () => setting.drawPerch(F, P, surface(i, t), t) }));
    for (const f of frogs) {
      const g = frogXY(f, t).ground;
      const seated = f.state !== 'air' && f.state !== 'swim';
      order.push({ y: (seated ? Math.max(g, perches[f.perch].y) : g) + 0.01, draw: () => drawFrog(F, f, t) });
    }
    order.sort((a, b) => a.y - b.y);
    for (const d of order) d.draw();

    if (meeting?.stage === 'love') {
      const age = t - meeting.t;
      // It floats up, then blinks out over its last half second.
      if (!(age > MEET_HEART_T - 0.5 && Math.floor(t * 12) % 2 === 0)) {
        const s = k >= 2 ? 2 : 1;
        const hx = Math.round(meeting.x - (7 * s) / 2);
        const hy = Math.round(meeting.y - 6 * s - age * 2 * k);
        MEET_HEART.forEach((row, j) => [...row].forEach((ch, i) => {
          if (ch === '.') return;
          for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) {
            F.paint(hx + i * s + dx, hy + j * s + dy, ch === 'h' ? INK.bowLight : INK.bow);
          }
        }));
      }
    }

    for (const dp of drops) {
      const a = t - dp.t0, y = dp.y + dp.vy * a + 40 * k * a * a;
      if (y < dp.y) F.dot(dp.x + dp.vx * a, y, 0.85);
    }

    setting.front(F, t);

    for (const fl of flies) {
      if (fl.out) continue;
      const on = Math.sin(t * fl.bf + fl.ph);
      if (on < 0.1) continue;
      const [x, y] = flyPos(fl, t);
      setting.fly(F, x, y, on);
    }
  }

  return {
    render,
    poke(x, y) { ripple(x, y, now, 0.6); },
    look(x, y) { pointer = { x, y, t: now }; },
    tap(x, y) {
      pointer = { x, y, t: now };
      let best: Frog | null = null, bd = Infinity, reach = 0;
      for (const f of frogs) {
        const p = frogXY(f, now), b = frogBox(sizeFor(p.s));
        const d = Math.hypot(p.x - x, p.y - b.h / 2 - y);
        if (d < bd) { bd = d; best = f; reach = 0.6 * Math.max(b.w, b.h); }
      }
      const idle = frogs.filter((f) => f.state === 'sit');
      if (best && best.state === 'sit') {
        const p = frogXY(best, now);
        if (bd < reach) {
          best.startled = now;
          const near = freePerches(best, p.x, p.y, 60 * k);
          if (near.length) { near.sort((a, b) => a.d - b.d); startHop(best, now, near[0].i); }
          else if (!startDive(best, now)) { best.state = 'croak'; best.t0 = now; }
          return;
        }
      }
      const hit = perches.findIndex((P, i) => Math.abs(P.x - x) < P.rx && Math.abs(surface(i, now) - y) < P.ry * 2.5);
      if (hit >= 0 && !holder[hit] && fitsFrog(perches[hit]) && idle.length) {
        const P = perches[hit];
        idle.sort((a, b) => Math.hypot(perches[a.perch].x - P.x, perches[a.perch].y - P.y) - Math.hypot(perches[b.perch].x - P.x, perches[b.perch].y - P.y));
        startHop(idle[0], now, hit);
        return;
      }
      ripple(x, y, now, 1);
      const f = idle[0];
      if (f) { f.state = 'croak'; f.t0 = now; }
    },
    meet() {
      const green = frogs.find((f) => f.kind === 'green');
      const pink = frogs.find((f) => f.kind === 'pink');
      if (!green || !pink || meeting) return;
      // Neither wanders off or snaps at flies until they have met.
      for (const f of [green, pink]) { f.next = now + 6; f.snapAt = now + 6; }
      meeting = { stage: 'go', t: now, x: 0, y: 0 };
    },
    react() {
      const idle = frogs.filter((f) => f.state === 'sit');
      const f = idle[Math.floor(r() * idle.length)];
      if (!f) return;
      const p = frogXY(f, now);
      const near = freePerches(f, p.x, p.y, 60 * k);
      if (near.length && r() < 0.7) { near.sort((a, b) => a.d - b.d); startHop(f, now, near[0].i); }
      else { f.state = 'croak'; f.t0 = now; ripple(p.x, p.y, now, 0.6); }
    },
    frogs() {
      return frogs.map((f) => {
        const p = frogXY(f, now);
        return { state: f.state, x: p.x, y: p.y, s: p.s, dir: f.dir };
      });
    },
  };
}
```

- [ ] **Step 5: Write the lake setting**

Create `src/lib/pond/scenes/lake.ts`. The sky, moon, tree lines and water are today's, drawn by the same arithmetic; pads keep their notch and lotus.

```ts
import { TAU, mul, sceneTone, set, type Field } from '../field';
import { scatter, type Perch, type SceneContext, type Setting } from '../life';
import { drawStars, glitter, glitterRows, halo, ridge, scatterStars } from '../sky';

interface Pad extends Perch {
  /** Side of the wedge cut into the pad. */
  notch: 1 | -1;
  /** A lotus flower blooms on it until a frog takes the pad. */
  lotus: boolean;
}

const CRATERS: readonly (readonly [number, number, number])[] = [[-0.35, -0.2, 0.28], [0.3, 0.25, 0.22], [0.05, 0.45, 0.15]];

/** The night lake: pines under the moon, lily pads with lotus flowers, reeds at the edges and fireflies. */
export function lake(c: SceneContext): Setting<Pad> {
  const { W, H, k, r, y0, depthAt } = c;
  const moon = { x: W * (0.2 + 0.6 * r()), y: y0 * (0.28 + 0.2 * r()), R: Math.max(3.5, Math.min(W, H) * 0.09) };
  const sx: 1 | -1 = moon.x >= W / 2 ? 1 : -1;
  const far = ridge(c, 3.5, 1.4, 3, 9, 2);
  const top = ridge(c, 1.5, 1, 3, 13, 2.5);

  // Sky, moon and tree lines never move, so they are drawn once.
  const backdrop = new Float32Array(W * H);
  for (let y = 0; y < y0; y++) {
    const g = y / Math.max(1, y0);
    for (let x = 0; x < W; x++) {
      let val = 0.08 + 0.36 * g ** 1.8 + 0.1 * Math.exp(-(y0 - y) / (6 * k));
      const dx = x + 0.5 - moon.x, dy = y + 0.5 - moon.y, d = Math.hypot(dx, dy);
      if (d < moon.R) {
        val = 0.86 + 0.14 * Math.sqrt(1 - (d / moon.R) ** 2);
        for (const [cx, cy, cr] of CRATERS) {
          const ex = x + 0.5 - (moon.x + cx * moon.R), ey = y + 0.5 - (moon.y + cy * moon.R);
          const e = Math.hypot(ex, ey) / (cr * moon.R);
          if (e < 1) val = e > 0.65 && ex * sx + ey > 0 ? 1 : val - 0.12;
        }
      } else {
        val += halo(d, moon.R, 0.24);
      }
      if (y >= far[x]) val = 0.22 + 0.08 * Math.exp(-Math.abs(x - moon.x) / (W * 0.35));
      if (y >= top[x]) val = 0.09;
      backdrop[y * W + x] = sceneTone(val, 0.78, 0.04, 0.98);
    }
  }
  const stars = scatterStars(c, y0, (x, y) => y < far[x] && Math.hypot(x - moon.x, y - moon.y) > moon.R * 2.56);

  const pads = scatter(c, Math.max(c.frogs + 2, Math.round(W / (22 * k))), () => {
    const y = y0 + 3 * k + r() * Math.max(1, H - y0 - 5 * k);
    const p = depthAt(y);
    const rx = (5.5 + 4.5 * r()) * k * p;
    const x = rx + r() * Math.max(1, W - 2 * rx);
    return { x, y, rx, ry: rx * 0.32, p, floats: true, ph: r() * TAU, notch: r() < 0.5 ? 1 : -1, lotus: r() < 0.3 };
  });

  const reeds: { x: number; h: number; ph: number; cat: boolean }[] = [];
  for (const side of [0, 1]) {
    const n = 1 + Math.floor(r() * 2);
    for (let j = 0; j < n; j++) {
      const x = side ? W - 2 - (j * 0.07 + r() * 0.05) * W : 2 + (j * 0.07 + r() * 0.05) * W;
      reeds.push({ x, h: (0.3 + 0.3 * r()) * H, ph: r() * TAU, cat: r() < 0.7 });
    }
  }

  const rows = new Float32Array(H);
  const notched = (P: Pad, u: number, w: number) => w > 0.1 && Math.abs(u - 0.25 * P.notch) < w * 0.35;

  return {
    perches: pads,
    light: sx,
    backdrop,
    water: (_x, y) => y >= y0,
    back(F, t) {
      drawStars(F, stars, t);
      glitterRows(rows, y0, t);
      const { v } = F;
      for (let y = y0; y < H; y++) {
        const dy = y - y0, depth = dy / Math.max(1, H - y0);
        const base = 0.06 + 0.34 * (1 - depth) ** 1.7 + 0.08 * Math.exp(-dy / (4 * k));
        const wob = Math.round(0.9 * k * Math.sin((y * 0.9) / k + t * 2.2));
        const ry = y0 - dy * 1.1;
        for (let x = 0; x < W; x++) {
          let val = base + 0.04 * Math.sin((y * 1.1) / k + t * 1.6 + Math.sin((x * 0.07) / k + t * 0.4) * 2) * depth;
          const rxx = x + wob < 0 ? 0 : x + wob >= W ? W - 1 : x + wob;
          if (ry >= top[rxx]) val *= 0.3;
          else if (ry >= far[rxx]) val *= 0.62;
          val += glitter(x, y, t, depth, moon.x, moon.R, rows[y]);
          v[y * W + x] = sceneTone(val, 0.8, 0.06, 0.96);
        }
      }
    },
    drawPerch(F, P, py) {
      F.ell(P.x, py + P.ry * 1.25, P.rx * 1.02, P.ry * 0.9, 0, mul(0.35));
      F.ell(P.x, py + P.ry * 0.3, P.rx, P.ry, 0, (old, _q, u, w) => (notched(P, u, w) ? old : 0.03));
      F.ell(P.x, py, P.rx, P.ry, 0, (old, q, u, w) => {
        if (notched(P, u, w)) return old;
        const lit = 0.5 + 0.5 * u * sx, d = Math.sqrt(q);
        if (d > 0.8 && w < 0.15) return 0.42 + 0.5 * lit;
        const a = Math.atan2(w, u);
        const vein = d > 0.18 && d < 0.78 && Math.abs(Math.sin(a * 3.5)) < 0.12 ? -0.1 : 0;
        return 0.24 + 0.36 * lit - 0.08 * w + vein;
      });
      if (P.lotus) {
        const lx = P.x - P.notch * P.rx * 0.35, ly = py - P.ry * 0.2, s = k * P.p;
        const petal = (ox: number, oy: number, rx: number, ry: number, a: number, lit: number) =>
          F.ell(lx + ox * s, ly + oy * s, rx * s, ry * s, a, (_o, q, u) => 0.62 + 0.36 * lit * (0.6 + 0.4 * u * sx) * (1 - 0.3 * q));
        petal(-1.3, -0.5, 1.2, 0.55, -0.35, 0.8);
        petal(1.3, -0.5, 1.2, 0.55, 0.35, 0.8);
        petal(-0.6, -1.0, 0.6, 1.2, -0.3, 1);
        petal(0.6, -1.0, 0.6, 1.2, 0.3, 1);
        petal(0, -1.2, 0.55, 1.3, 0, 1);
        F.ell(lx, ly - 0.2 * s, 0.6 * s, 0.4 * s, 0, set(0.7));
      }
    },
    taken(P) {
      P.lotus = false;
    },
    front(F, t) {
      const { v, ink } = F;
      const put = (x: number, y: number) => {
        if (x < 0 || x >= W || y < 0 || y >= H) return;
        const i = y * W + x;
        v[i] = v[i] > 0.3 || ink[i] ? 0.02 : 0.42;
        ink[i] = 0;
      };
      for (const rd of reeds) {
        const yTop = Math.floor(H - rd.h);
        const sway = (rel: number) => 1.4 * k * Math.sin(t * 0.8 + rd.ph) * (1 - rel) * (1 - rel);
        for (let y = yTop; y < H; y++) put(Math.round(rd.x + sway((y - yTop) / rd.h)), y);
        if (rd.cat) {
          F.ell(rd.x + sway(0) + 0.5, yTop + 2.5 * k, 0.9 * k + 0.3, 2.6 * k, 0,
            (old, q, u) => (old > 0.3 ? 0.02 : 0.16 + 0.4 * (0.5 + 0.5 * u * sx) * (1 - 0.5 * q)));
        }
      }
    },
    fly(F: Field, x: number, y: number, on: number) {
      F.ell(x, y, 3 * k, 3 * k, 0, (old, q) => old + 0.3 * (1 - Math.sqrt(q)) * on, true);
      F.ell(x, y, 0.75, 0.75, 0, set(1));
    },
  };
}
```

- [ ] **Step 6: Build ponds from the core**

In `src/lib/pond/PondCanvas.svelte`, replace the `night.ts` import and the `nightPond` call (the biome branch stays until Task 2):

```ts
  import { pond, type Scene, type SceneOpts as PondOpts } from './life';
  import { lake } from './scenes/lake';
```

```ts
  type SceneOpts = Omit<PondOpts, 'seed' | 'still'>;
```

```ts
    } else {
      scene = pond(W, H, { ...opts, seed, still }, lake);
    }
```

The lake-only options are gone, so drop them where they are passed. In `src/lib/github/GitHubActivitySection.svelte` the pond's `options` become:

```svelte
        options={{ k: 1.25, frogs: 2, flies: 5, horizon: 0.4 }}
```

and in `src/lib/components/Footer.svelte`:

```svelte
      options={{ k: 1.1, frogs: 2, flies: 4, horizon: 0.3 }}
```

(The footer strip shows a moon and reeds until Task 8 makes it the beach.)

- [ ] **Step 7: Delete `night.ts`**

```bash
git rm src/lib/pond/night.ts
```

- [ ] **Step 8: Run the tests and the type check**

Run: `npx vitest run src/lib/pond && npx svelte-check --tsconfig ./tsconfig.json`
Expected: all pond tests PASS; `svelte-check found 0 errors and 0 warnings`.

If a `meet` test seed now lays its pads out so the frogs cannot meet within 4 s, change nothing in the core: report the seed and the frogs' positions instead, because the meeting logic moved over unchanged.

- [ ] **Step 9: Look at the hero**

Run `npx vite --port 5199 --strictPort --host 127.0.0.1` (or use the running dev server) and open `http://127.0.0.1:5199/`. Expected: the hero, GitHub strip, project cards and vault ponds look as before (pines, moon, lily pads, lotus flowers, reeds, fireflies), frogs hop, swim and snap flies, and the console has no errors.

- [ ] **Step 10: Commit**

```bash
git add src/lib/pond/life.ts src/lib/pond/sky.ts src/lib/pond/scenes/lake.ts src/lib/pond/PondCanvas.svelte src/lib/pond/pond.test.ts src/lib/github/GitHubActivitySection.svelte src/lib/components/Footer.svelte
git commit -m "Split the pond into a frog core and the lake it lives in."
```


### Task 2: Scene names on every pond

A registry names the scenes (only `lake` so far), `PondCanvas` takes `scene`, the project cards pick scenes instead of biomes, and the copied engine goes. The pond tests become contracts every registered scene must pass; Tasks 3 to 7 only add registry entries for them to run against.

**Files:**
- Create: `src/lib/pond/scenes/index.ts`
- Modify: `src/lib/pond/life.ts` (`Scene.meet`), `src/lib/pond/palette.ts` (remove `assignPalettes`), `src/lib/pond/PondCanvas.svelte`, `src/lib/projects/Projects.svelte`, `src/lib/projects/ProjectCard.svelte`, `src/lib/pond/pond.test.ts`
- Delete: `src/lib/pond/scene.ts`, `src/lib/pond/biome.ts`

**Interfaces:**
- Consumes: `pond`, `Scene`, `SceneOpts`, `SettingMaker` (`life.ts`), `lake` (`scenes/lake.ts`), `PaletteName` (`palette.ts`), `hash` (`field.ts`).
- Produces (`scenes/index.ts`): `SCENES` (`{ [name]: { make: SettingMaker; palette: PaletteName } }`), `type SceneName`, `SCENE_NAMES: SceneName[]` (registry order), `makeScene(name: SceneName, W: number, H: number, o?: SceneOpts): Scene`, `assignScenes(names: readonly string[]): SceneName[]`. `PondCanvas` props: `seed`, `scene?: SceneName` (default `'lake'`), `palette?: PaletteName`, `options?`, `interactive?`. `Scene.meet(): void` is required.

- [ ] **Step 1: Write the scene contracts**

In `src/lib/pond/pond.test.ts`, replace the imports of `pond` and `lake` from Task 1 and the `assignPalettes` import with the registry, and the `render` helper with one that takes a scene name:

```ts
import { INK, INK_COLORS, LEVELS, PALETTES, PALETTE_NAMES, ramp } from './palette';
import { SCENE_NAMES, assignScenes, makeScene, type SceneName } from './scenes';

const render = (seed: string, t: number, name: SceneName = 'lake', W = 120, H = 60) => {
  const F = new Field(W, H);
  const scene = makeScene(name, W, H, { seed, k: 1.4, frogs: 2, flies: 4 });
  for (let fr = 0; fr <= t * 12; fr++) scene.render(fr / 12, F);
  return { F, scene };
};
```

Replace the palette-assignment test in `describe('palettes')` with a scenes one:

```ts
describe('scenes', () => {
  it('gives a page of projects distinct scenes, the same way every time', () => {
    const names = ['toktally', 'kitsune', 'Alchemica', 'dungeon-generator', 'ModularJobs', 'guildpost'];
    const a = assignScenes(names);
    expect(new Set(a).size).toBe(Math.min(names.length, SCENE_NAMES.length));
    expect(assignScenes(names)).toEqual(a);
  });
});
```

Replace the whole `describe('night pond', …)` block with contracts for every scene:

```ts
describe.each(SCENE_NAMES)('%s scene', (name) => {
  it('uses at least five palette levels', () => {
    const { F } = render('levels', 8, name);
    expect(new Set(levelsOf(F, LEVELS)).size).toBeGreaterThanOrEqual(5);
  });

  it('is deterministic for a seed', () => {
    const a = render('same', 6, name), b = render('same', 6, name);
    expect(a.F.v).toEqual(b.F.v);
    expect(a.F.ink).toEqual(b.F.ink);
    expect(render('other', 6, name).F.v).not.toEqual(a.F.v);
  });

  it('draws its frogs in their own colours', () => {
    const { F } = render('frogs', 2, name);
    const inks = new Set(F.ink);
    expect(inks.has(INK.skin + 1)).toBe(true);
    expect(inks.has(INK.eye + 1)).toBe(true);
    expect(inks.has(INK.pinkSkin + 1)).toBe(true);
    expect(inks.has(INK.bow + 1)).toBe(true);
  });

  it('keeps frogs in the frame and every value finite over a long run', () => {
    const W = 160, H = 70, F = new Field(W, H);
    const scene = makeScene(name, W, H, { seed: 'long', k: 1.6, frogs: 3, flies: 6 });
    const seen = new Set<string>();
    for (let fr = 0; fr < 12 * 120; fr++) {
      scene.render(fr / 12, F);
      for (const f of scene.frogs()) {
        seen.add(f.state);
        expect(f.x).toBeGreaterThan(-4);
        expect(f.x).toBeLessThan(W + 4);
        expect(f.y).toBeLessThan(H + 4);
      }
    }
    expect(F.v.every(Number.isFinite)).toBe(true);
    expect(seen.has('air')).toBe(true);
  });

  it('holds still when asked to', () => {
    const W = 100, H = 60, F = new Field(W, H);
    const scene = makeScene(name, W, H, { seed: 'still', still: true, frogs: 2 });
    for (let fr = 0; fr < 12 * 30; fr++) scene.render(fr / 12, F);
    expect(scene.frogs().every((f) => f.state === 'sit')).toBe(true);
  });

  it('renders frog ink on the first still frame without look or poke', () => {
    const W = 120, H = 60, F = new Field(W, H);
    const scene = makeScene(name, W, H, { seed: 'rm-first', still: true, frogs: 2, k: 1.4 });
    scene.render(0, F);
    expect(F.ink.some((c) => c === INK.skin + 1)).toBe(true);
    expect(F.ink.some((c) => c === INK.eye + 1)).toBe(true);
    expect(F.v.every(Number.isFinite)).toBe(true);
  });

  it('answers pokes, taps and reactions without breaking', () => {
    const W = 100, H = 60, F = new Field(W, H);
    const scene = makeScene(name, W, H, { seed: 'touch', frogs: 1 });
    for (let fr = 0; fr < 48; fr++) {
      if (fr === 5) scene.poke(50, 45);
      if (fr === 10) scene.tap(50, 45);
      if (fr === 20) scene.react();
      scene.look(fr, 30);
      scene.render(fr / 12, F);
    }
    expect(F.v.every(Number.isFinite)).toBe(true);
  });

  it('seats the two frogs side by side on one perch, face to face, when they meet', () => {
    for (const seed of ['meet-a', 'meet-b', 'meet-c']) {
      const W = 160, H = 70, F = new Field(W, H);
      const scene = makeScene(name, W, H, { seed, k: 1.4, frogs: 2, flies: 4 });
      let fr = 0;
      for (; fr < 12; fr++) scene.render(fr / 12, F);
      scene.meet();
      // One perch: the same seat height on it, facing each other, no more than a frog's width apart.
      const together = () => {
        const [a, b] = scene.frogs();
        return a.state === 'sit' && b.state === 'sit' && a.y === b.y && a.x !== b.x &&
          a.dir === Math.sign(b.x - a.x) && b.dir === Math.sign(a.x - b.x) &&
          Math.abs(a.x - b.x) <= frogBox(sizeFor(Math.max(a.s, b.s))).w;
      };
      let met = false;
      for (const end = fr + 12 * 15; fr < end && !met; fr++) {
        scene.render(fr / 12, F);
        met = together();
      }
      expect(met).toBe(true);
    }
  });

  it('keeps sitting frogs out of clear boxes', () => {
    const W = 160, H = 70, F = new Field(W, H);
    const scene = makeScene(name, W, H, { seed: 'clear', k: 1.4, frogs: 2, clear: [[0.35, 0, 0.65, 1]] });
    for (let fr = 0; fr < 12 * 30; fr++) {
      scene.render(fr / 12, F);
      for (const f of scene.frogs()) if (f.state === 'sit') expect(f.x < 0.35 * W || f.x > 0.65 * W).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/lib/pond`
Expected: FAIL, `Failed to resolve import "./scenes"`.

- [ ] **Step 3: Write the registry**

Create `src/lib/pond/scenes/index.ts`:

```ts
import { hash } from '../field';
import { pond, type Scene, type SceneOpts, type SettingMaker } from '../life';
import type { PaletteName } from '../palette';
import { lake } from './lake';

interface SceneEntry {
  make: SettingMaker;
  /** The palette it is painted in unless a pond asks for another. */
  palette: PaletteName;
}

/** Every scene a pond can show, in the order scenes are handed out. */
export const SCENES = {
  lake: { make: lake, palette: 'night' },
} satisfies Record<string, SceneEntry>;

export type SceneName = keyof typeof SCENES;
export const SCENE_NAMES = Object.keys(SCENES) as SceneName[];

/** A scene of the given kind, ready to render. */
export function makeScene(name: SceneName, W: number, H: number, o: SceneOpts = {}): Scene {
  const entry: SceneEntry = SCENES[name];
  return pond(W, H, o, entry.make);
}

/**
 * Gives each name its own scene, stable per name where possible: a name keeps its hashed scene unless an earlier
 * name in the list already took it. A page of six projects shows every scene once.
 */
export function assignScenes(names: readonly string[]): SceneName[] {
  const used = new Set<SceneName>();
  return names.map((name) => {
    const start = hash(name) % SCENE_NAMES.length;
    for (let j = 0; j < SCENE_NAMES.length; j++) {
      const s = SCENE_NAMES[(start + j) % SCENE_NAMES.length];
      if (!used.has(s) || used.size >= SCENE_NAMES.length) {
        used.add(s);
        return s;
      }
    }
    return SCENE_NAMES[start];
  });
}
```

In `src/lib/pond/life.ts`, every scene now has the meeting, so `meet` is required in `Scene`:

```ts
  meet(): void;
```

In `src/lib/pond/palette.ts`, delete `assignPalettes` (scenes are assigned now) and the `hash` import it used.

- [ ] **Step 4: Let `PondCanvas` take a scene**

In `src/lib/pond/PondCanvas.svelte`, replace the instance script's imports, props and scene construction (lines 34-111 after Task 1):

```ts
  import { onMount } from 'svelte';
  import { Field, packPalette, quantize } from './field';
  import type { Scene, SceneOpts } from './life';
  import { INK_COLORS, PALETTES, type PaletteName } from './palette';
  import { SCENES, makeScene, type SceneName } from './scenes';
  import { prefersReducedMotion, subscribe, type Clock } from './ticker';

  type Options = Omit<SceneOpts, 'seed' | 'still'>;
  const inks = packPalette(INK_COLORS);

  interface Props {
    seed: string;
    /** The world the frogs live in. */
    scene?: SceneName;
    /** Paints the scene in another palette; otherwise it has its own. */
    palette?: PaletteName;
    /** Scene options, or a function of the art size in pixels. */
    options?: Options | ((W: number, H: number) => Options);
    /** Pointer movement and clicks reach the scene. */
    interactive?: boolean;
  }

  let { seed, scene = 'lake', palette, options = {}, interactive = false }: Props = $props();

  let wrap: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let world: Scene | null = null;
  let field: Field | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let img: ImageData | null = null;
  let px: Uint32Array | null = null;
  let W = 0, H = 0;
  let clock: Clock | null = null;
  const still = prefersReducedMotion();
  const shades = $derived(PALETTES[palette ?? SCENES[scene].palette]);
  const colors = $derived(packPalette(shades));
  const bgColor = $derived(shades[0]);

  function draw(t: number) {
    if (!world || !field || !ctx || !img || !px) return;
    world.render(t, field);
    quantize(field, colors, px, inks);
    ctx.putImageData(img, 0, 0);
  }

  function build(cssW: number, cssH: number) {
    const S = pixelScale();
    const w = Math.max(8, Math.ceil(cssW / S)), h = Math.max(8, Math.ceil(cssH / S));
    if (w === W && h === H && world) return;
    W = w;
    H = h;
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = `${W * S}px`;
    canvas.style.height = `${H * S}px`;
    ctx = canvas.getContext('2d');
    if (!ctx) return;
    img = ctx.createImageData(W, H);
    px = new Uint32Array(img.data.buffer);
    field = new Field(W, H);
    const opts = typeof options === 'function' ? options(W, H) : options;
    world = makeScene(scene, W, H, { ...opts, seed, still });
    draw(clock?.time ?? 0);
  }

  /** The scene notices something nearby, such as its card being hovered. */
  export function react() {
    world?.react();
  }

  /** Bumpy goes to the pink frog and they share a heart; ponds without both frogs ignore it. */
  export function meet() {
    world?.meet();
  }
```

and in `onMove` and `onClick`, `scene` becomes `world`:

```ts
  function onMove(e: PointerEvent) {
    if (!world) return;
    const [x, y] = toArt(e);
    world.look(x, y);
    if (e.timeStamp - lastPoke > 160) {
      lastPoke = e.timeStamp;
      world.poke(x, y);
    }
  }

  function onClick(e: MouseEvent) {
    world?.tap(...toArt(e));
  }
```

- [ ] **Step 5: Give project cards scenes**

In `src/lib/projects/Projects.svelte`:

```ts
  import { assignScenes } from '../pond/scenes';
```

```ts
  const scenes = $derived(assignScenes(shown.map((p) => p.name)));
```

```svelte
      <ProjectCard project={p} scene={scenes[i]} />
```

In `src/lib/projects/ProjectCard.svelte` (this also replaces its `ReturnType<typeof PondCanvas>` with the named handle type):

```ts
  import PondCanvas, { type PondHandle } from '../pond/PondCanvas.svelte';
  import type { SceneName } from '../pond/scenes';
  import { metaParts, truncateWords, type Project } from './github';
  import LanguageIcon from '../components/LanguageIcon.svelte';

  let { project, scene }: { project: Project; scene: SceneName } = $props();
  let pond = $state<PondHandle>();
```

```svelte
    <PondCanvas bind:this={pond} seed={project.name} {scene} options={{ k: 1.5, frogs: 1, flies: 3, horizon: 0.42 }} />
```

- [ ] **Step 6: Delete the copied engine**

```bash
git rm src/lib/pond/scene.ts src/lib/pond/biome.ts
```

- [ ] **Step 7: Run the tests, the type check and the build**

Run: `npx vitest run && npx svelte-check --tsconfig ./tsconfig.json && npm run build`
Expected: every test PASSES (the `lake scene` contracts included); `svelte-check found 0 errors and 0 warnings`; the build succeeds. The other ponds still pass `palette` (`night`, `dusk`, the passes' palettes), which now repaints the lake; Task 8 names their scenes.

- [ ] **Step 8: Create the throwaway tools and look**

Create `/tmp/scene-png.ts` and `/tmp/scene-speed.ts` from "Throwaway tools" above, then run:

```bash
bun /tmp/scene-png.ts lake 400 110 6 /tmp/lake-hero.png && bun /tmp/scene-speed.ts
```

Expected: `/tmp/lake-hero.png` shows the night lake (pines, moon with its glint, pads, lotus flowers, reeds, frogs); the timing prints one `lake` line (about 1 ms or less).

- [ ] **Step 9: Commit**

```bash
git add -A src/lib/pond src/lib/projects
git commit -m "Name each pond's scene and drop the project cards' copy of the engine."
```


### Task 3: Beach at sunset

**Files:**
- Create: `src/lib/pond/scenes/beach.ts`
- Modify: `src/lib/pond/scenes/index.ts`
- Test: the scene contracts in `src/lib/pond/pond.test.ts` (they run for every registered scene)

**Interfaces:**
- Consumes: `Field`, `TAU`, `hash`, `mul` (`field.ts`); `scatter`, `Perch`, `SceneContext`, `Setting` (`life.ts`); `glitter`, `glitterRows`, `halo` (`sky.ts`).
- Produces: `beach: SettingMaker<Rock>`; registry entry `beach: { make: beach, palette: 'dusk' }`.

Tones are picked for the `dusk` ramp (`0` #120a19 near-black plum, `2` #642951 plum, `4` #bc5d5b rose, `5` #de8259 orange, `6` #efb07f peach, `7` #f8deb0 cream): the sky runs plum to orange, the sea is purple-plum, the sand glows orange, foam and the sun are peach to cream.

- [ ] **Step 1: Register the beach**

In `src/lib/pond/scenes/index.ts`, add the import and the entry after `lake`:

```ts
import { beach } from './beach';
```

```ts
export const SCENES = {
  lake: { make: lake, palette: 'night' },
  beach: { make: beach, palette: 'dusk' },
} satisfies Record<string, SceneEntry>;
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/lib/pond`
Expected: FAIL, `Failed to resolve import "./beach"`.

- [ ] **Step 3: Write the beach**

Create `src/lib/pond/scenes/beach.ts`:

```ts
import { Field, TAU, hash, mul } from '../field';
import { scatter, type Perch, type SceneContext, type Setting } from '../life';
import { glitter, glitterRows, halo } from '../sky';

interface Rock extends Perch {
  /** How far the rock reaches down below its top. */
  h: number;
  /** Stands in the surf, ringed with foam. */
  wet: boolean;
}

/**
 * Beach at sunset: a low sun half-set on the sea with its glitter, long clouds lit from below, a headland, waves
 * washing up wet sand, rocks along the shore and gulls overhead.
 */
export function beach(c: SceneContext): Setting<Rock> {
  const { W, H, k, r, y0, depthAt } = c;
  const sun = { x: W * (0.25 + 0.5 * r()), R: Math.max(3.5, Math.min(W, H) * 0.13) };
  const sunY = y0 - sun.R * 0.35;
  const light: 1 | -1 = sun.x >= W / 2 ? 1 : -1;
  // Where the sea meets the sand at rest; the water runs up and back from it.
  const shore = y0 + Math.max(4 * k, (H - y0) * 0.45);
  const ph = r() * TAU;
  const swell = (x: number) => (1.2 * Math.sin((x * 0.05) / k + ph) + 0.6 * Math.sin((x * 0.13) / k + ph * 2)) * k;
  const wetTo = shore + 3.5 * k;
  const bottom = Math.min(H, Math.ceil(wetTo + 3 * k));
  const headW = W * (0.18 + 0.12 * r());
  /** How high the headland stands above the horizon at column x, on the side away from the sun. */
  const headland = (x: number) => {
    const u = light < 0 ? (x - (W - headW)) / headW : (headW - x) / headW;
    return u <= 0 ? 0 : (1.5 + 3 * Math.sqrt(u)) * k;
  };
  const clouds = Array.from({ length: 2 + Math.floor(r() * 3) }, () => ({
    x: r() * W, y: y0 * (0.15 + 0.5 * r()), rx: W * (0.1 + 0.12 * r()), ry: (0.7 + 0.8 * r()) * k,
  }));

  const B = new Field(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let val: number;
      if (y < y0) {
        const d = Math.hypot(x + 0.5 - sun.x, y + 0.5 - sunY);
        val = d < sun.R ? 0.97 : 0.3 + 0.42 * (y / Math.max(1, y0)) ** 1.5 + halo(d, sun.R, 0.3, 3.5);
        for (const cl of clouds) {
          const u = (x - cl.x) / cl.rx, w = (y - cl.y) / cl.ry;
          if (u * u + w * w < 1) val = w > 0.15 ? 0.8 : 0.4;
        }
        if (y0 - y <= headland(x)) val = 0.14;
      } else {
        // Dry sand glowing orange, with dark grains here and there.
        val = 0.66 - 0.06 * ((y - y0) / Math.max(1, H - y0)) - (hash(`${x},${y}`) % 100 < 7 ? 0.14 : 0);
      }
      B.v[y * W + x] = val;
    }
  }

  const rocks = scatter(c, Math.max(c.frogs + 2, Math.round(W / (24 * k))), () => {
    const wet = r() < 0.55;
    const x = 6 * k + r() * Math.max(1, W - 12 * k);
    const y = wet ? shore + swell(x) - (2.5 + 2.5 * r()) * k : shore + 2 * k + r() * Math.max(1, H - shore - 4 * k);
    const p = depthAt(y);
    const rx = (4 + 3 * r()) * k * p;
    return { x, y, rx, ry: rx * 0.36, p, floats: false, ph: r() * TAU, h: (1.6 + 1.4 * r()) * k * p, wet };
  });

  const gulls = Array.from({ length: W > 90 ? 2 : 1 }, () => ({
    x: r() * W, y: y0 * (0.12 + 0.3 * r()), v: (1.5 + 2 * r()) * k * (r() < 0.5 ? -1 : 1), ph: r() * TAU,
  }));
  const rows = new Float32Array(H);

  return {
    perches: rocks,
    light,
    backdrop: B.v,
    water: (x, y) => y > y0 + 1 && y < shore + swell(x) - 0.5 * k,
    back(F, t) {
      glitterRows(rows, y0, t);
      const { v } = F;
      const wash = 1.6 * k * Math.sin(t * 0.55);
      // A wave line rolling in from 6k out to 2k from the water's edge, over and over.
      const roll = (t * 0.35) % 1;
      for (let y = y0; y < bottom; y++) {
        const depth = Math.min(1, (y - y0) / Math.max(1, shore - y0));
        for (let x = 0; x < W; x++) {
          const edge = shore + swell(x) + wash;
          let val: number;
          if (y < edge) {
            val = 0.22 + 0.16 * depth + 0.05 * Math.sin((y * 1.3) / k - t * 1.4 + Math.sin((x * 0.06) / k + t * 0.3) * 2);
            val += glitter(x, y, t, depth, sun.x, sun.R, rows[y]);
            if (Math.abs(y - (edge - (6 - 4 * roll) * k)) < 0.6 && Math.sin(x * 0.5 + t) > -0.3) val = 0.78;
            if (edge - y < 1.4 && Math.sin(x * 0.7 + t * 2) > -0.4) val = 0.92;
          } else if (y < wetTo + swell(x)) {
            val = 0.45 + 0.04 * Math.sin(x * 0.31 + y * 0.7);
          } else continue;
          v[y * W + x] = val;
        }
      }
    },
    drawPerch(F, P, top, t) {
      if (P.wet) {
        const f = 0.5 + 0.5 * Math.sin(t * 1.7 + P.ph);
        F.ell(P.x, top + P.h, P.rx * (1.2 + 0.15 * f), P.ry * 1.1, 0, (old, q) => (q > 0.5 ? 0.9 : old), true);
      } else {
        F.ell(P.x - light * P.rx * 0.3, top + P.h + 0.3 * k, P.rx * 1.1, P.ry * 0.8, 0, mul(0.6));
      }
      F.ell(P.x, top + P.h * 0.5, P.rx * 1.04, P.h * 0.6 + P.ry, 0, (_o, _q, u, w) => 0.1 + 0.16 * (0.5 + 0.5 * u * light) - 0.04 * w);
      F.ell(P.x, top, P.rx, P.ry, 0, (_o, q, u) => 0.24 + 0.32 * (0.5 + 0.5 * u * light) * (1 - 0.4 * q));
    },
    front(F, t) {
      const s = k >= 2 ? 2 : 1, span = W + 20 * k;
      for (const g of gulls) {
        const x = Math.round(((((g.x + g.v * t) % span) + span) % span) - 10 * k);
        const y = Math.round(g.y + 1.2 * k * Math.sin(t * 0.8 + g.ph));
        const up = Math.sin(t * 5 + g.ph) > 0;
        F.dot(x, y, 0.06);
        for (let i = 1; i <= 2 * s; i++) {
          const lift = up ? Math.ceil(i * 0.6) : i === 2 * s ? 1 : 0;
          F.dot(x - i, y - lift, 0.06);
          F.dot(x + i, y - lift, 0.06);
        }
      }
    },
    fly(F, x, y) {
      F.dot(x, y, 0.1);
    },
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/lib/pond`
Expected: PASS, including every `beach scene` contract.

- [ ] **Step 5: Look at it at three sizes**

```bash
bun /tmp/scene-png.ts beach 400 110 6 /tmp/beach-hero.png && bun /tmp/scene-png.ts beach 128 86 6 /tmp/beach-card.png && bun /tmp/scene-png.ts beach 400 30 6 /tmp/beach-strip.png
```

Open the three PNGs. Expected: a plum-to-orange sky with a cream sun half-sunk at the horizon and its glitter column on the sea, long clouds with lit undersides, a dark headland on the side away from the sun, foam at the water's edge and a wave line rolling in, orange sand with dark grains, dark rocks (foam rings on the ones in the surf), gulls, and both frogs on rocks. In the 30-row strip the sea, foam and rocks must still read. Tune tones or proportions in `beach.ts` until they do; the contracts must keep passing.

- [ ] **Step 6: Check the speed**

Run: `bun /tmp/scene-speed.ts`
Expected: `beach` at most `1.50x lake`. If it is slower, move per-pixel work that does not change per frame (the swell per column) into arrays computed once.

- [ ] **Step 7: Commit**

```bash
git add src/lib/pond/scenes/beach.ts src/lib/pond/scenes/index.ts
git commit -m "Add a beach at sunset scene."
```

### Task 4: Meadow by day

**Files:**
- Create: `src/lib/pond/scenes/meadow.ts`
- Modify: `src/lib/pond/palette.ts` (`day` ramp; `petalPink`, `petalYellow`, `petalWhite`, `capRed`, `capShade` inks), `src/lib/pond/scenes/index.ts`
- Test: `src/lib/pond/pond.test.ts`

**Interfaces:**
- Consumes: `Field`, `TAU`, `clamp`, `hash`, `mul` (`field.ts`); `scatter`, `Perch`, `SceneContext`, `Setting` (`life.ts`); `INK` (`palette.ts`); `halo` (`sky.ts`).
- Produces: `PALETTES.day`; `INK.petalPink` (19), `INK.petalYellow` (20), `INK.petalWhite` (21), `INK.capRed` (22), `INK.capShade` (23); `meadow: SettingMaker<Seat>`; registry entry `meadow: { make: meadow, palette: 'day' }`.

The `day` ramp comes out as `0` #10240f, `1` #24491d, `2` #40702c, `3` #63993c, `4` #94c064, `5` #bbe09d, `6` #b2dff3 (sky blue), `7` #ffffff. So the grass sits at 0.28-0.42, the hills at 0.45-0.72 (furthest palest), the sky at 0.86-0.95 (blue fading toward white at the horizon), and clouds and the sun at 1.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/pond/pond.test.ts`:

```ts
describe('meadow', () => {
  it('keeps its frogs out of the water: there is none', () => {
    const W = 160, H = 70, F = new Field(W, H);
    const scene = makeScene('meadow', W, H, { seed: 'dry', k: 1.4, frogs: 2 });
    for (let fr = 0; fr < 12 * 120; fr++) {
      scene.render(fr / 12, F);
      for (const f of scene.frogs()) expect(f.state).not.toBe('swim');
    }
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/lib/pond`
Expected: FAIL: `'meadow'` is not a `SceneName` (`makeScene` throws reading `make` of undefined).

- [ ] **Step 3: Add the ramp and the accents**

In `src/lib/pond/palette.ts`, add to `ANCHORS`:

```ts
  day: ['#10240f', '#2d5a24', '#6aa13f', '#bfe08a', '#a9dcf2', '#ffffff'],
```

and extend `INK` and `INK_COLORS` (append, keeping the frog slots where they are):

```ts
  bow: 15, bowLight: 16, bowKnot: 17, bowFold: 18,
  /** Scene accents: meadow flowers and butterflies, mushroom caps. */
  petalPink: 19, petalYellow: 20, petalWhite: 21, capRed: 22, capShade: 23,
} as const;
export const INK_COLORS = [
  '#0b1409', '#2b8a37', '#45c148', '#7be07e', '#b8f3a9', '#dff6c4', '#ffffff', '#ff9fb4', '#ef7a93',
  '#2a0f1a', '#9e3d6b', '#d65a8f', '#f48cb8', '#ffc4da', '#ffe8f3', '#ff4d94', '#ffc0dc', '#8f1248', '#d42a72',
  '#ff8fbf', '#ffd94a', '#fbfbf4', '#d8453b', '#94292a',
];
```

- [ ] **Step 4: Write the meadow**

Create `src/lib/pond/scenes/meadow.ts`:

```ts
import { Field, TAU, clamp, hash, mul } from '../field';
import { scatter, type Perch, type SceneContext, type Setting } from '../life';
import { INK } from '../palette';
import { halo } from '../sky';

interface Seat extends Perch {
  mushroom: boolean;
  /** How far the stone, or the mushroom's stem, reaches down to the grass. */
  h: number;
}

/** Cloud puffs as [dx, dy, radius], in units of the cloud's size. */
const PUFFS: readonly (readonly [number, number, number])[] = [[-1.1, 0.25, 0.75], [0, -0.25, 1], [1, 0.15, 0.85], [0.45, 0.45, 0.7], [-0.45, 0.45, 0.7]];

/**
 * A meadow by day: rolling hills fading into a blue sky with puffy clouds, one round tree, tall grass and
 * wildflowers, mossy stones and spotted mushrooms to sit on, and butterflies. There is no water.
 */
export function meadow(c: SceneContext): Setting<Seat> {
  const { W, H, k, r, y0, depthAt } = c;
  const sun = { x: W * (0.15 + 0.7 * r()), y: y0 * (0.18 + 0.14 * r()), R: Math.max(3, Math.min(W, H) * 0.08) };
  const light: 1 | -1 = sun.x >= W / 2 ? 1 : -1;
  // Three rolling hills, palest furthest away.
  const hills = [
    { base: 6.5, amp: 2.2, f: 0.035, tone: 0.72 },
    { base: 4, amp: 1.8, f: 0.05, tone: 0.58 },
    { base: 1.5, amp: 1.4, f: 0.07, tone: 0.45 },
  ].map(({ base, amp, f, tone }) => {
    const ph = r() * TAU;
    const top = Float32Array.from({ length: W }, (_, x) => y0 - (base + amp * (Math.sin((x * f) / k + ph) + 0.5 * Math.sin((x * f * 2.3) / k + ph * 1.7))) * k);
    return { top, tone };
  });
  const tx = Math.round(W * (0.15 + 0.7 * r()));
  const ty = hills[0].top[clamp(tx, 0, W - 1)];

  const B = new Field(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let val: number;
      if (y < y0) {
        const d = Math.hypot(x + 0.5 - sun.x, y + 0.5 - sun.y);
        val = d < sun.R ? 1 : Math.min(0.97, 0.86 + 0.09 * (y / Math.max(1, y0)) + halo(d, sun.R, 0.1, 2));
        for (const hl of hills) if (y >= hl.top[x]) val = hl.tone - 0.03 * Math.min(1, (y - hl.top[x]) / (4 * k));
      } else {
        const depth = (y - y0) / Math.max(1, H - y0);
        val = 0.42 - 0.14 * depth + 0.03 * Math.sin(x * 1.7 + y * 0.9) + (hash(`${x},${y}`) % 100 < 8 ? 0.06 : 0);
      }
      B.v[y * W + x] = val;
    }
  }
  // One round tree on the far hill.
  B.line(tx, ty, tx, ty - 3 * k, 0.3);
  B.ell(tx, ty - 3.6 * k, 2.4 * k, 2 * k, 0, (_o, q, u, w) => 0.42 + 0.12 * (0.5 + 0.5 * u * light) - 0.06 * w - 0.04 * q);

  const PETALS = [INK.petalPink, INK.petalYellow, INK.petalWhite];
  const flowers = Array.from({ length: Math.min(80, Math.round((W * (H - y0)) / 90)) }, () => ({
    x: Math.floor(r() * W), y: Math.floor(y0 + 2 * k + r() * Math.max(1, H - y0 - 3 * k)), ink: PETALS[Math.floor(r() * PETALS.length)],
  }));
  const seats = scatter(c, Math.max(c.frogs + 2, Math.round(W / (20 * k))), () => {
    const ground = y0 + 4 * k + r() * Math.max(1, H - y0 - 7 * k);
    const p = depthAt(ground);
    const mushroom = r() < 0.3;
    const rx = (4.5 + (mushroom ? 2 : 3.5) * r()) * k * p;
    const x = rx + r() * Math.max(1, W - 2 * rx);
    const h = (mushroom ? 3 + 2 * r() : 1.5 + 1.5 * r()) * k * p;
    return { x, y: ground - h, rx, ry: rx * (mushroom ? 0.32 : 0.4), p, floats: false, ph: r() * TAU, mushroom, h };
  });
  const clouds = Array.from({ length: 2 + Math.floor(r() * 3) }, () => ({
    x: r() * W, y: y0 * (0.15 + 0.4 * r()), s: (2.2 + 1.8 * r()) * k, v: (0.4 + 0.6 * r()) * k,
  }));
  const flutter = Array.from({ length: W > 90 ? 3 : 2 }, () => ({
    cx: r() * W, cy: y0 * (0.6 + 0.6 * r()), ax: (8 + 14 * r()) * k, ay: (2 + 3 * r()) * k,
    fx: 0.25 + 0.3 * r(), fy: 0.5 + 0.6 * r(), ph: r() * TAU, ink: r() < 0.5 ? INK.petalYellow : INK.petalPink,
  }));
  const blades = Array.from({ length: Math.ceil(W / 2) }, (_, i) => ({ x: i * 2 + (r() < 0.5 ? 0 : 1), h: (1.5 + 2.5 * r()) * k, ph: r() * TAU }));

  /** A mushroom cap: red, a darker rim, white spots, domed under the seat at `top`. */
  function cap(F: Field, P: Seat, top: number) {
    const cx = P.x, cy = top + P.ry * 0.4, ax = P.rx * 1.1, ay = P.ry * 1.6;
    for (let y = Math.floor(cy - ay); y <= Math.ceil(cy + ay); y++) {
      for (let x = Math.floor(cx - ax); x <= Math.ceil(cx + ax); x++) {
        const u = (x + 0.5 - cx) / ax, w = (y + 0.5 - cy) / ay;
        if (u * u + w * w > 1) continue;
        const spot = w < 0.2 && (Math.round(x - cx) * 3 + Math.round(y - cy) * 5 + Math.round(P.ph * 7)) % 7 === 0;
        F.paint(x, y, w > 0.45 ? INK.capShade : spot ? INK.eye : INK.capRed);
      }
    }
  }

  return {
    perches: seats,
    light,
    backdrop: B.v,
    back(F, t) {
      for (const cl of clouds) {
        const span = W + 6 * cl.s;
        const x = ((((cl.x + cl.v * t) % span) + span) % span) - 3 * cl.s;
        for (const [dx, dy, rr] of PUFFS) F.ell(x + dx * cl.s, cl.y + dy * cl.s, rr * cl.s, rr * cl.s * 0.8, 0, (_o, _q, _u, w) => 1 - 0.07 * Math.max(0, w));
      }
      for (const fl of flowers) F.paint(fl.x, fl.y, fl.ink);
    },
    drawPerch(F, P, top) {
      F.ell(P.x - light * P.rx * 0.25, top + P.h + 0.4 * k, P.rx * 1.1, Math.max(1, P.ry * 0.7), 0, mul(0.65));
      if (P.mushroom) {
        F.ell(P.x, top + P.h * 0.55, Math.max(1, P.rx * 0.26), P.h * 0.55, 0, (_o, _q, u) => 0.82 + 0.1 * u * light);
        cap(F, P, top);
      } else {
        F.ell(P.x, top + P.h * 0.5, P.rx * 1.02, P.h * 0.6 + P.ry * 0.9, 0, (_o, _q, u, w) => 0.3 + 0.18 * (0.5 + 0.5 * u * light) - 0.06 * w);
        F.ell(P.x, top, P.rx, P.ry, 0, (_o, q, u) => 0.44 + 0.2 * (0.5 + 0.5 * u * light) - 0.08 * q);
      }
    },
    front(F, t) {
      for (const b of blades) {
        const sway = 0.8 * k * Math.sin(t * 1.1 + b.ph + b.x * 0.05);
        for (let j = 0; j < b.h; j++) {
          const rel = j / b.h;
          F.dot(b.x + sway * rel * rel, H - 1 - j, rel > 0.7 ? 0.3 : 0.14);
        }
      }
      const wing = k >= 2 ? 2 : 1;
      for (const b of flutter) {
        const x = Math.round(b.cx + b.ax * Math.sin(t * b.fx + b.ph)), y = Math.round(b.cy + b.ay * Math.sin(t * b.fy + b.ph * 2));
        const up = Math.sin(t * 9 + b.ph) > 0 ? 1 : 0;
        F.paint(x, y, INK.line);
        for (let i = 1; i <= wing; i++) {
          F.paint(x - i, y - up, b.ink);
          F.paint(x + i, y - up, b.ink);
        }
      }
    },
    fly(F, x, y) {
      F.dot(x, y, 0.12);
    },
  };
}
```

- [ ] **Step 5: Register the meadow**

```ts
import { meadow } from './meadow';
```

```ts
  beach: { make: beach, palette: 'dusk' },
  meadow: { make: meadow, palette: 'day' },
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/lib/pond`
Expected: PASS: the `meadow scene` contracts, the dry-meadow test, and `builds every palette at the shared size, dark to light` with `day` in it.

- [ ] **Step 7: Look at it**

```bash
bun /tmp/scene-png.ts meadow 400 110 6 /tmp/meadow-hero.png && bun /tmp/scene-png.ts meadow 128 86 6 /tmp/meadow-card.png
```

Expected: sky blue fading paler toward the horizon with a white sun and puffy white clouds, three hills (palest furthest), one round tree on the far hill, green grass with pink, yellow and white flower dots, mossy stones and red white-spotted mushrooms with the frogs on them, dark grass blades along the bottom, and two or three butterflies. No pine line, no water. Tune `meadow.ts` until it reads; the tests must keep passing.

- [ ] **Step 8: Check the speed**

Run: `bun /tmp/scene-speed.ts`
Expected: `meadow` at most `1.50x lake`.

- [ ] **Step 9: Commit**

```bash
git add src/lib/pond/scenes/meadow.ts src/lib/pond/scenes/index.ts src/lib/pond/palette.ts src/lib/pond/pond.test.ts
git commit -m "Add a meadow by day scene."
```

### Task 5: Snowy onsen, and frogs that soak

**Files:**
- Create: `src/lib/pond/scenes/onsen.ts`
- Modify: `src/lib/pond/life.ts` (soaking), `src/lib/pond/frog.ts` (`drawTowel`), `src/lib/pond/palette.ts` (`snow` ramp; `towel`, `towelStripe`, `lantern`, `flame` inks), `src/lib/pond/scenes/index.ts`
- Test: `src/lib/pond/pond.test.ts`

**Interfaces:**
- Consumes: `place`, `SIZES` (inside `frog.ts`); `scatter`, `Perch`, `SceneContext`, `Setting` (`life.ts`); `drawStars`, `ridge`, `scatterStars` (`sky.ts`); `INK` (`palette.ts`).
- Produces: `Setting.soak?: boolean`; frog state `'soak'` (reported by `frogs()`); `drawTowel(F: Field, size: number, x: number, y: number): void` in `frog.ts`; `PALETTES.snow`; `INK.towel` (24), `INK.towelStripe` (25), `INK.lantern` (26), `INK.flame` (27); `onsen: SettingMaker<Rock>`; registry entry `onsen: { make: onsen, palette: 'snow' }`.

The `snow` ramp comes out as `0` #0d1026, `1` #222954, `2` #3d467f, `3` #5d68a4, `4` #838bc3, `5` #abb1db, `6` #d4d7ef, `7` #ffffff: the sky runs night blue to lavender (0.08-0.55), rock is 0.16-0.32, the spring's water periwinkle (0.4-0.57), snow 0.82-0.98.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/pond/pond.test.ts`:

```ts
describe('onsen', () => {
  it('lets frogs slip into the spring for a soak, towels on, within a minute', () => {
    const W = 160, H = 70, F = new Field(W, H);
    const scene = makeScene('onsen', W, H, { seed: 'soak', k: 1.4, frogs: 2 });
    let towel = false;
    for (let fr = 0; fr < 12 * 60 && !towel; fr++) {
      scene.render(fr / 12, F);
      towel = scene.frogs().some((f) => f.state === 'soak') && F.ink.some((c) => c === INK.towel + 1);
    }
    expect(towel).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/lib/pond`
Expected: FAIL: `'onsen'` is not a `SceneName`, and `INK.towel` does not exist.

- [ ] **Step 3: Add the ramp and the accents**

In `src/lib/pond/palette.ts`, add to `ANCHORS`:

```ts
  snow: ['#0d1026', '#262d5c', '#4a5594', '#8a92c9', '#c9cdeb', '#ffffff'],
```

and append to `INK` and `INK_COLORS`:

```ts
  petalPink: 19, petalYellow: 20, petalWhite: 21, capRed: 22, capShade: 23,
  /** The onsen: the frogs' folded towels, the lantern's glow and its flicker. */
  towel: 24, towelStripe: 25, lantern: 26, flame: 27,
} as const;
```

```ts
  '#ff8fbf', '#ffd94a', '#fbfbf4', '#d8453b', '#94292a',
  '#f6efe2', '#8cbcd8', '#ffb347', '#fff1b8',
];
```

- [ ] **Step 4: Draw a towel**

In `src/lib/pond/frog.ts`, after `drawFrog`:

```ts
/** A folded towel on the head of a frog drawn with its feet at (x, y), for a soak in a hot spring. */
export function drawTowel(F: Field, size: number, x: number, y: number) {
  const S = SIZES[size].frames.sit;
  const [left, top] = place(S, x, y);
  const w = [4, 6, 8][size], h = size === 0 ? 1 : 2;
  const x0 = left + Math.floor((S.w - w) / 2);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) F.paint(x0 + i, top - h + j, j === h - 1 && h > 1 ? INK.towelStripe : INK.towel);
  }
}
```

- [ ] **Step 5: Teach the core to soak**

In `src/lib/pond/life.ts`:

1. Import the towel: `import { drawFrog as paintFrog, drawTowel, frogBox, mouthAt as frogMouth, sizeFor, type Frame, type FrogFace, type FrogKind } from './frog';`
2. In `Setting`, after `water?`:

```ts
  /** Frogs that slip into the water stay a while to soak, eyes shut, a towel on their heads. */
  soak?: boolean;
```

3. `type State = 'sit' | 'croak' | 'snap' | 'turn' | 'crouch' | 'air' | 'land' | 'swim' | 'soak';`
4. In `act`, a hot spring tempts a frog in three times as often. Replace the dive, croak and turn lines:

```ts
    // A hot spring tempts a frog in three times as often.
    const [diveTo, croakTo, turnTo] = setting.soak ? [0.72, 0.86, 0.94] : [0.52, 0.74, 0.88];
    if (roll >= 0.42 && roll < diveTo && startDive(f, t)) return;
    if (roll < croakTo) { f.state = 'croak'; f.t0 = t; ripple(x, y, t, 0.6); return; }
    if (roll < turnTo) { f.state = 'turn'; f.t0 = t; return; }
```

5. In `update`, the dive landing (the `if (h.dive) { … }` branch) becomes:

```ts
            if (h.dive) {
              ripple(h.x1, h.y1, end, 1.3);
              splash(h.x1, h.y1, end, 7, k * 0.8);
              f.hop = null;
              f.t0 = end;
              if (setting.soak) {
                // In for a soak: it takes no perch until it climbs out.
                f.perch = -1;
                f.swim = { x: h.x1, y: h.y1, to: -1, wake: end };
                f.state = 'soak';
                f.next = end + 6 + 6 * r();
              } else {
                const found = landing(h.x1, h.y1);
                const to = found >= 0 ? found : f.perch;
                holder[to] = f;
                f.perch = to;
                f.swim = { x: h.x1, y: h.y1, to, wake: end };
                f.state = 'swim';
              }
            }
```

6. In `update`, before the `swim` branch:

```ts
        if (f.state === 'soak') {
          const sw = f.swim!;
          if (t - sw.wake > 1.6) { sw.wake = t; ripple(sw.x, sw.y, t, 0.25); }
          if (t < f.next) break;
          const to = landing(sw.x, sw.y);
          if (to < 0) { f.next = t + 3; break; }
          holder[to] = f;
          f.perch = to;
          setting.taken?.(perches[to]);
          sw.to = to;
          f.state = 'swim';
          f.t0 = t;
          continue;
        }
```

7. In `drawFrog`, soaking frogs sit low in the water like swimmers, eyes happily shut:

```ts
      case 'swim':
      case 'soak': {
        const b = frogBox(size);
        dy = y + b.h - b.swim;
        clipY = Math.round(y);
        frame = 'sit';
        if (f.state === 'soak') face.eyes = 'happy';
        break;
      }
```

and the shadow, waterline and towel:

```ts
    if (f.state !== 'air' && f.state !== 'swim' && f.state !== 'soak') {
```

```ts
    if (f.state === 'swim' || f.state === 'soak') {
      const half = Math.max(2, Math.round(box.w * 0.35)), wy = Math.round(y);
      for (let j = -half; j <= half; j++) F.dot(x + j, wy, F.get(x + j, wy) > 0.3 ? 0.62 : 0.4);
    }
    if (f.state === 'soak') drawTowel(F, size, x, dy);
```

8. In `render`, a soaking frog sorts by where it floats:

```ts
      const seated = f.state !== 'air' && f.state !== 'swim' && f.state !== 'soak';
```

A soaking frog has no perch (`perch` is -1) until it climbs out, so nothing reads `perches[f.perch]` for it: `act`, `tap`, `react` and the meeting only touch sitting frogs, and `meet()` cuts a soak short (it sets `next` to six seconds on).

- [ ] **Step 6: Write the onsen**

Create `src/lib/pond/scenes/onsen.ts`:

```ts
import { Field, TAU, clamp, hash, mul } from '../field';
import { scatter, type Perch, type SceneContext, type Setting } from '../life';
import { INK } from '../palette';
import { drawStars, ridge, scatterStars } from '../sky';

interface Rock extends Perch {
  /** How far the rock reaches down below its snowy top. */
  h: number;
}

/**
 * A snowy onsen at twilight: peaks under the first stars, a steaming hot spring ringed with snow-capped rocks, a
 * stone lantern glowing beside it and snow falling in front. Frogs slip in to soak.
 */
export function onsen(c: SceneContext): Setting<Rock> {
  const { W, H, k, r, y0, depthAt } = c;
  const far = ridge(c, 4, 1.2, 8, 16, 7, 0.95);
  const near = ridge(c, 1.5, 1, 5, 11, 6, 1);
  const pool = { x: W * (0.38 + 0.24 * r()), y: y0 + (H - y0) * 0.55, rx: Math.min(W * 0.3, (H - y0) * 1.4), ry: Math.max(3 * k, (H - y0) * 0.26) };
  /** Inside the spring's ellipse scaled by `s`. */
  const inPool = (x: number, y: number, s: number) => ((x - pool.x) / (pool.rx * s)) ** 2 + ((y - pool.y) / (pool.ry * s)) ** 2 < 1;
  const side: 1 | -1 = r() < 0.5 ? 1 : -1;
  const lamp = { x: clamp(pool.x + side * (pool.rx + 7 * k), 3 * k, W - 3 * k), y: pool.y - pool.ry * 0.2 };

  const B = new Field(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let val: number;
      if (y < y0) {
        val = 0.08 + 0.47 * (y / Math.max(1, y0)) ** 1.6;
        if (y >= far[x]) val = y - far[x] < 2.2 * k ? 0.78 : 0.32;
        if (y >= near[x]) val = y - near[x] < 2 * k ? 0.7 : 0.22;
      } else {
        val = 0.86 + 0.06 * (1 - (y - y0) / Math.max(1, H - y0)) - 0.04 * Math.sin((x * 0.05) / k + y * 0.2);
        if (inPool(x, y, 1.08) && !inPool(x, y, 0.92)) val = 0.3;
      }
      B.v[y * W + x] = val;
    }
  }
  // A stone lantern on the snow: its shadow and warm glow, post, light box, and a roof with snow on it.
  B.ell(lamp.x, lamp.y + 0.3 * k, 2.2 * k, 0.8 * k, 0, mul(0.85));
  B.ell(lamp.x, lamp.y - 5 * k, 6 * k, 5 * k, 0, (old, q) => old + 0.1 * (1 - q), true);
  for (let y = Math.round(lamp.y - 4 * k); y < lamp.y; y++) for (let x = Math.round(lamp.x - 0.6 * k); x <= lamp.x + 0.6 * k; x++) B.dot(x, y, 0.36);
  for (let y = Math.round(lamp.y - 6.2 * k); y < lamp.y - 4 * k; y++) for (let x = Math.round(lamp.x - 1.2 * k); x <= lamp.x + 1.2 * k; x++) B.dot(x, y, 0.42);
  for (let x = Math.round(lamp.x - 2 * k); x <= lamp.x + 2 * k; x++) {
    B.dot(x, lamp.y - 6.6 * k, 0.24);
    B.dot(x, lamp.y - 7.2 * k, 0.92);
  }
  const pane = { x0: Math.round(lamp.x - 0.6 * k), x1: Math.round(lamp.x + 0.6 * k), y0: Math.round(lamp.y - 5.8 * k), y1: Math.round(lamp.y - 4.4 * k) };
  const stars = scatterStars(c, y0, (x, y) => y < far[x] - 1);

  const rocks = scatter(c, Math.max(c.frogs + 2, 7), () => {
    const a = r() * TAU;
    const y = pool.y + Math.sin(a) * pool.ry * 1.02;
    const p = depthAt(y);
    const rx = (3.8 + 2 * r()) * k * p;
    return { x: pool.x + Math.cos(a) * pool.rx * 1.02, y, rx, ry: rx * 0.42, p, floats: false, ph: r() * TAU, h: (1.6 + 1.2 * r()) * k * p };
  });
  const wisps = Array.from({ length: clamp(Math.round(pool.rx / (3 * k)), 4, 12) }, () => ({
    x: pool.x + (r() * 2 - 1) * pool.rx * 0.7, ph: r(), drift: (r() * 2 - 1) * 3 * k,
  }));
  const flakes = Array.from({ length: Math.min(110, Math.round((W * H) / 80)) }, () => ({
    x: r() * W, y: r() * H, v: (3 + 4 * r()) * k, ph: r() * TAU, drift: (r() * 2 - 1) * 0.8 * k,
  }));

  return {
    perches: rocks,
    light: side,
    backdrop: B.v,
    soak: true,
    water: (x, y) => inPool(x, y, 0.82),
    back(F, t) {
      drawStars(F, stars, t);
      const { v } = F;
      const xa = Math.max(0, Math.floor(pool.x - pool.rx)), xb = Math.min(W - 1, Math.ceil(pool.x + pool.rx));
      const ya = Math.max(0, Math.floor(pool.y - pool.ry)), yb = Math.min(H - 1, Math.ceil(pool.y + pool.ry));
      for (let y = ya; y <= yb; y++) {
        for (let x = xa; x <= xb; x++) {
          const q = ((x + 0.5 - pool.x) / (pool.rx * 0.92)) ** 2 + ((y + 0.5 - pool.y) / (pool.ry * 0.92)) ** 2;
          if (q < 1) v[y * W + x] = 0.4 + 0.12 * (1 - q) + 0.05 * Math.sin(x * 0.4 + t * 1.2 + Math.sin(y * 0.9 + t) * 1.5);
        }
      }
      const flame = hash(`${Math.floor(t * 6)}`) % 3 === 0 ? INK.flame : INK.lantern;
      for (let y = pane.y0; y <= pane.y1; y++) for (let x = pane.x0; x <= pane.x1; x++) F.paint(x, y, flame);
    },
    drawPerch(F, P, top) {
      F.ell(P.x, top + P.h * 0.5, P.rx * 1.05, P.h * 0.6 + P.ry, 0, (_o, _q, u, w) => 0.16 + 0.14 * (0.5 + 0.5 * u * side) - 0.04 * w);
      F.ell(P.x, top, P.rx * 0.95, P.ry, 0, (_o, q, u) => 0.86 + 0.1 * (0.5 + 0.5 * u * side) - 0.06 * q);
    },
    front(F, t) {
      for (const w of wisps) {
        const age = (t * 0.22 + w.ph) % 1;
        const x = w.x + Math.sin(age * 5 + w.ph * 9) * 1.8 * k + age * w.drift;
        const y = pool.y - age * (pool.ry + 10 * k);
        const R = (1.2 + 2.2 * age) * k;
        F.ell(x, y, R, R * 0.8, 0, (old, q) => old + 0.2 * (1 - age) * (1 - q), true);
      }
      for (const f of flakes) {
        const x = (((f.x + t * f.drift + Math.sin(t * 0.9 + f.ph) * 1.5 * k) % W) + W) % W;
        F.dot(x, (f.y + t * f.v) % H, 0.98);
      }
    },
    fly(F, x, y) {
      F.dot(x, y, 0.95);
    },
  };
}
```

- [ ] **Step 7: Register the onsen**

```ts
import { onsen } from './onsen';
```

```ts
  meadow: { make: meadow, palette: 'day' },
  onsen: { make: onsen, palette: 'snow' },
```

- [ ] **Step 8: Run the tests**

Run: `npx vitest run src/lib/pond`
Expected: PASS: the `onsen scene` contracts (the meeting included: `meet()` cuts a soak short), the soak test, and every earlier scene unchanged.

If the soak test fails because dives from the rim rocks keep missing the spring, widen the spring (`pool.rx` up to `(H - y0) * 1.6`, `pool.ry` up to `(H - y0) * 0.3`) before touching the core.

- [ ] **Step 9: Look at it**

```bash
bun /tmp/scene-png.ts onsen 400 110 8 /tmp/onsen-hero.png && bun /tmp/scene-png.ts onsen 128 86 8 /tmp/onsen-card.png
```

Expected: a night-blue to lavender sky with a few stars, two ranges of peaks with snow along their tops, a white snowfield, a periwinkle spring ringed with dark rocks under snow caps, steam curling up from it, a stone lantern with a warm flickering window, falling snow, and frogs on the rim rocks. Run it again at 20 s and 40 s (`… onsen 400 110 20 …`) to catch a frog soaking with its towel on. Tune `onsen.ts` until it reads.

- [ ] **Step 10: Check the speed**

Run: `bun /tmp/scene-speed.ts`
Expected: `onsen` at most `1.50x lake`.

- [ ] **Step 11: Commit**

```bash
git add src/lib/pond/scenes/onsen.ts src/lib/pond/scenes/index.ts src/lib/pond/life.ts src/lib/pond/frog.ts src/lib/pond/palette.ts src/lib/pond/pond.test.ts
git commit -m "Add a snowy onsen where the frogs soak with towels on."
```


### Task 6: Waterfall and river

**Files:**
- Create: `src/lib/pond/scenes/waterfall.ts`
- Modify: `src/lib/pond/scenes/index.ts`
- Test: the scene contracts in `src/lib/pond/pond.test.ts`

**Interfaces:**
- Consumes: `Field`, `TAU`, `clamp`, `hash` (`field.ts`); `scatter`, `Perch`, `SceneContext`, `Setting` (`life.ts`).
- Produces: `waterfall: SettingMaker<Stone>`; registry entry `waterfall: { make: waterfall, palette: 'moss' }`.

Tones are for the `moss` ramp (`0` #091109, `1` #14301a, `2` #21522a, `3` #387536, `4` #5d983e, `5` #8fba51, `6` #bfd980, `7` #eef2c4): rock 0.16-0.36, trees 0.28-0.44, the river 0.46-0.68, white water and the misty sky 0.8-0.96.

- [ ] **Step 1: Register the waterfall**

```ts
import { waterfall } from './waterfall';
```

```ts
  onsen: { make: onsen, palette: 'snow' },
  waterfall: { make: waterfall, palette: 'moss' },
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/lib/pond`
Expected: FAIL, `Failed to resolve import "./waterfall"`.

- [ ] **Step 3: Write the waterfall**

Create `src/lib/pond/scenes/waterfall.ts`:

```ts
import { Field, TAU, clamp, hash } from '../field';
import { scatter, type Perch, type SceneContext, type Setting } from '../life';

interface Stone extends Perch {
  /** How far the stone reaches down into the river. */
  h: number;
}

/**
 * A waterfall and river: mossy cliffs with leafy trees on top, the fall pouring into mist towards one end, and a
 * river running across with stepping stones.
 */
export function waterfall(c: SceneContext): Setting<Stone> {
  const { W, H, k, r, y0, depthAt } = c;
  const light: 1 | -1 = -1;
  const fx = W * (r() < 0.5 ? 0.18 + 0.12 * r() : 0.7 + 0.12 * r());
  const fw = Math.max(2.5 * k, W * 0.05);
  const riverEnd = Math.round(y0 + (H - y0) * 0.72);
  /** The river runs away from the fall. */
  const flow = fx < W / 2 ? 1 : -1;
  const ph = r() * TAU;
  // The cliff top: ragged, dipping where the water pours over.
  const cliff = Float32Array.from({ length: W }, (_, x) =>
    y0 * 0.22 + (Math.sin((x * 0.11) / k + ph) + 0.5 * Math.sin((x * 0.31) / k + ph * 3)) * 0.8 * k +
    Math.max(0, 1 - Math.abs(x - fx) / (fw * 2.2)) * 1.5 * k);
  const col = Float32Array.from({ length: W }, () => r() * TAU);

  const B = new Field(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let val: number;
      if (y < cliff[x]) val = 0.88 - 0.06 * (y / Math.max(1, cliff[x]));
      else if (y < y0) {
        // Layered rock, moss in its ledges.
        const strata = Math.sin((y * 0.9) / k + Math.sin((x * 0.12) / k) * 2);
        val = strata > 0.55 ? 0.36 : 0.16 + 0.05 * strata;
      } else if (y < riverEnd) val = 0.5;
      else val = 0.3 - 0.08 * ((y - riverEnd) / Math.max(1, H - riverEnd)) + (hash(`${x},${y}`) % 100 < 10 ? 0.07 : 0);
      B.v[y * W + x] = val;
    }
  }
  // Leafy trees along the cliff top, none over the fall.
  for (let tx = r() * 4 * k; tx < W; tx += (5 + 5 * r()) * k) {
    if (Math.abs(tx - fx) < fw * 2.5) continue;
    const R = (2.2 + 1.8 * r()) * k, cy = cliff[Math.min(W - 1, Math.round(tx))] - R * 0.6;
    B.ell(tx, cy, R, R * 0.85, 0, (_o, q, u, w) => 0.28 + 0.16 * (0.5 + 0.5 * u * light) - 0.08 * w - 0.04 * q);
  }

  const stones = scatter(c, Math.max(c.frogs + 2, Math.round(W / (18 * k))), () => {
    const y = y0 + 2 * k + r() * Math.max(1, riverEnd - y0 - 4 * k);
    const p = depthAt(y);
    const rx = (3.5 + 1.8 * r()) * k * p;
    let x = rx + r() * Math.max(1, W - 2 * rx);
    // Not right under the fall.
    for (let n = 0; n < 8 && Math.abs(x - fx) < fw + rx; n++) x = rx + r() * Math.max(1, W - 2 * rx);
    return { x, y, rx, ry: rx * 0.42, p, floats: false, ph: r() * TAU, h: (1 + r()) * k * p };
  });
  const tufts = Array.from({ length: Math.ceil(W / (4 * k)) }, () => ({ x: r() * W, h: (1.2 + 2 * r()) * k, ph: r() * TAU }));

  return {
    perches: stones,
    light,
    backdrop: B.v,
    water: (_x, y) => y > y0 + 0.5 * k && y < riverEnd - 0.5 * k,
    back(F, t) {
      const { v } = F;
      // The fall: bright streaks pouring down.
      const top = Math.floor(Math.min(cliff[clamp(Math.round(fx), 0, W - 1)], y0));
      for (let y = top; y < y0; y++) {
        for (let x = Math.max(0, Math.floor(fx - fw)); x <= Math.min(W - 1, Math.ceil(fx + fw)); x++) {
          const e = Math.abs(x + 0.5 - fx) / fw;
          if (e <= 1) v[y * W + x] = 0.8 + 0.16 * Math.sin((y * 0.8) / k - t * 10 + col[x]) - 0.25 * e * e;
        }
      }
      // The river: streaks running away from the fall, white water where it lands.
      for (let y = y0; y < riverEnd; y++) {
        const depth = (y - y0) / Math.max(1, riverEnd - y0);
        for (let x = 0; x < W; x++) {
          let val = 0.46 + 0.12 * depth + 0.1 * Math.sin((x * 0.25 * flow) / k - t * 3 + y * 1.7 + Math.sin(x * 0.05) * 2);
          const d = Math.hypot((x + 0.5 - fx) / (fw * 1.8), (y - y0) / (2.5 * k));
          if (d < 1) val += 0.4 * (1 - d) * (0.8 + 0.2 * Math.sin(t * 7 + x));
          v[y * W + x] = val;
        }
      }
    },
    drawPerch(F, P, top, t) {
      const f = 0.5 + 0.5 * Math.sin(t * 3 + P.ph);
      // Foam piling up on the side the water comes from.
      F.ell(P.x - flow * P.rx * 0.5, top + P.h + 0.3 * k, P.rx * (0.9 + 0.2 * f), P.ry * 0.8, 0, (old, q) => (q > 0.45 ? 0.9 : old), true);
      F.ell(P.x, top + P.h * 0.5, P.rx * 1.04, P.h * 0.6 + P.ry, 0, (_o, _q, u, w) => 0.14 + 0.14 * (0.5 + 0.5 * u * light) - 0.04 * w);
      F.ell(P.x, top, P.rx, P.ry, 0, (_o, q, u) => 0.34 + 0.2 * (0.5 + 0.5 * u * light) - 0.08 * q);
    },
    front(F, t) {
      for (let i = 0; i < 3; i++) {
        const a = (t * 0.3 + i / 3) % 1;
        const R = (2.5 + 3 * a) * k;
        F.ell(fx + (i - 1) * fw * 0.9, y0 - a * 4 * k, R, R * 0.7, 0, (old, q) => old + 0.24 * (1 - a) * (1 - q), true);
      }
      for (const tf of tufts) {
        const sway = 0.6 * k * Math.sin(t * 1.3 + tf.ph);
        for (let j = 0; j < tf.h; j++) F.dot(tf.x + sway * (j / tf.h) ** 2, H - 1 - j, 0.1);
      }
    },
    fly(F, x, y) {
      F.dot(x, y, 0.08);
    },
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/lib/pond`
Expected: PASS, including every `waterfall scene` contract.

- [ ] **Step 5: Look at it at three sizes**

```bash
bun /tmp/scene-png.ts waterfall 400 110 6 /tmp/fall-hero.png && bun /tmp/scene-png.ts waterfall 128 86 6 /tmp/fall-card.png && bun /tmp/scene-png.ts waterfall 400 50 6 /tmp/fall-strip.png
```

Expected: a pale misty sky over dark layered cliffs with moss ledges and round trees on top, a cream fall pouring down toward one end with mist puffing at its foot, a green river with streaks running away from the fall, stepping stones with foam on their upstream side and frogs on them, and a darker bank with grass tufts. The 50-row strip (the GitHub section's shape) must still show the fall and the river. Tune `waterfall.ts` until it reads.

- [ ] **Step 6: Check the speed**

Run: `bun /tmp/scene-speed.ts`
Expected: `waterfall` at most `1.50x lake`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/pond/scenes/waterfall.ts src/lib/pond/scenes/index.ts
git commit -m "Add a waterfall and river scene."
```

### Task 7: Cave lake

**Files:**
- Create: `src/lib/pond/scenes/cave.ts`
- Modify: `src/lib/pond/palette.ts` (`crystal` ink), `src/lib/pond/scenes/index.ts`
- Test: the scene contracts in `src/lib/pond/pond.test.ts`

**Interfaces:**
- Consumes: `Field`, `TAU`, `clamp`, `hash`, `set` (`field.ts`); `scatter`, `Perch`, `SceneContext` (its `ripple`), `Setting` (`life.ts`); `INK` (`palette.ts`); `glitter`, `glitterRows` (`sky.ts`).
- Produces: `INK.crystal` (28); `cave: SettingMaker<Shelf>`; registry entry `cave: { make: cave, palette: 'potion' }`.

Tones are for the `potion` ramp (`0` #0c0918, `1` #231849, `2` #412f77, `3` #634aa2, `4` #876bc7, `5` #ad8fe3, `6` #cdb7f2, `7` #eee0ff): rock and water near black (0.03-0.19), glow around the crystals violet, crystals and mushroom caps lilac to white (0.8-1).

- [ ] **Step 1: Register the cave**

```ts
import { cave } from './cave';
```

```ts
  waterfall: { make: waterfall, palette: 'moss' },
  cave: { make: cave, palette: 'potion' },
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/lib/pond`
Expected: FAIL, `Failed to resolve import "./cave"`.

- [ ] **Step 3: Add the crystal glint**

In `src/lib/pond/palette.ts`:

```ts
  towel: 24, towelStripe: 25, lantern: 26, flame: 27,
  /** The cave: a spark caught in a crystal. */
  crystal: 28,
} as const;
```

```ts
  '#f6efe2', '#8cbcd8', '#ffb347', '#fff1b8',
  '#bff8ff',
];
```

- [ ] **Step 4: Write the cave**

Create `src/lib/pond/scenes/cave.ts`:

```ts
import { Field, TAU, clamp, hash, set } from '../field';
import { scatter, type Perch, type SceneContext, type Setting } from '../life';
import { INK } from '../palette';
import { glitter, glitterRows } from '../sky';

interface Shelf extends Perch {
  mushroom: boolean;
  /** How far the rock, or the mushroom's stalk, reaches down into the water. */
  h: number;
}

/**
 * A cave lake: stalactites overhead, crystal clusters glowing and mirrored in black water, drips that ring the
 * water, glowing mushroom caps and flat rocks to sit on, and drifting glow motes.
 */
export function cave(c: SceneContext): Setting<Shelf> {
  const { W, H, k, r, y0, depthAt } = c;
  // A ragged ceiling with stalactites hanging from it.
  const ph = r() * TAU;
  const ceil = Float32Array.from({ length: W }, (_, x) => (1.5 + Math.sin((x * 0.08) / k + ph) + 0.5 * Math.sin((x * 0.21) / k + ph * 2)) * k);
  const tips: { x: number; y: number }[] = [];
  for (let tx = r() * 3 * k; tx < W; tx += (3 + 4 * r()) * k) {
    const len = Math.min(y0 * 0.55, (2 + ((y0 * 0.45) / k) * r() * r()) * k), hw = 0.6 + len * 0.15;
    for (let x = Math.max(0, Math.floor(tx - hw)); x <= Math.min(W - 1, Math.ceil(tx + hw)); x++) {
      const dx = Math.abs(x + 0.5 - tx) / hw;
      if (dx <= 1) ceil[x] = Math.max(ceil[x], 1.5 * k + len * (1 - dx));
    }
    if (len > 4 * k) tips.push({ x: Math.round(tx), y: 1.5 * k + len });
  }
  const n = clamp(Math.round(W / (40 * k)), 2, 4);
  const crystals = Array.from({ length: n }, (_, i) => ({
    x: W * ((i + 0.25 + 0.5 * r()) / n), y: y0 - r() * 3 * k, R: (2.5 + 2 * r()) * k, ph: r() * TAU,
    shards: Array.from({ length: 3 + Math.floor(r() * 3) }, () => ({
      dx: (r() * 2 - 1) * 2 * k, len: (2.5 + 3.5 * r()) * k, w: (0.7 + 0.6 * r()) * k, a: (r() * 2 - 1) * 0.45,
    })),
  }));
  const light: 1 | -1 = crystals[0].x >= W / 2 ? 1 : -1;

  const B = new Field(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let val: number;
      if (y < ceil[x]) val = 0.03;
      else if (y < y0) {
        const grain = Math.sin((x * 0.21) / k + Math.sin((y * 0.17) / k) * 2) * Math.sin((y * 0.31) / k + x * 0.05);
        val = y - ceil[x] < 0.8 ? 0.16 : 0.08 + 0.05 * grain + 0.06 * (y / y0);
      } else val = 0.05;
      for (const cr of crystals) val += 0.2 * Math.max(0, 1 - Math.hypot(x - cr.x, y - cr.y) / (cr.R * 3)) ** 2;
      B.v[y * W + x] = val;
    }
  }
  for (const cr of crystals) {
    for (const s of cr.shards) B.ell(cr.x + s.dx, cr.y - s.len * 0.5, s.w, s.len * 0.5, s.a, (_o, q, u) => 0.84 + 0.14 * (1 - q) + 0.04 * u * light);
  }

  /** Drops fall from the longest stalactites, gravity in art pixels a second squared. */
  const G = 60 * k;
  const drips = tips.slice(0, 4).map((tp) => ({ ...tp, land: y0 + (1 + 4 * r()) * k, period: 2.5 + 2.5 * r(), off: r() * 5, last: 0 }));
  const shelves = scatter(c, Math.max(c.frogs + 2, Math.round(W / (22 * k))), () => {
    const foot = y0 + 3 * k + r() * Math.max(1, H - y0 - 5 * k);
    const p = depthAt(foot);
    const mushroom = r() < 0.45;
    const rx = (4 + 3 * r()) * k * p;
    const x = rx + r() * Math.max(1, W - 2 * rx);
    const h = (mushroom ? 2.5 + 2 * r() : 1 + r()) * k * p;
    return { x, y: foot - h, rx, ry: rx * (mushroom ? 0.3 : 0.4), p, floats: false, ph: r() * TAU, mushroom, h };
  });
  const rows = new Float32Array(H);

  return {
    perches: shelves,
    light,
    backdrop: B.v,
    water: (_x, y) => y > y0 + 1,
    back(F, t) {
      glitterRows(rows, y0, t);
      const { v } = F;
      for (let y = y0; y < H; y++) {
        const depth = (y - y0) / Math.max(1, H - y0);
        for (let x = 0; x < W; x++) {
          let val = 0.04 + 0.04 * (1 - depth) + 0.02 * Math.sin((y * 1.1) / k + t * 1.2 + Math.sin((x * 0.07) / k + t * 0.3) * 2);
          for (const cr of crystals) val += 0.8 * glitter(x, y, t, depth, cr.x, cr.R, rows[y]);
          v[y * W + x] = val;
        }
      }
      // Crystals pulse; now and then one catches a spark.
      for (const cr of crystals) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 1.3 + cr.ph);
        F.ell(cr.x, cr.y - cr.R, cr.R * 2.6, cr.R * 2.2, 0, (old, q) => old + 0.12 * pulse * (1 - q), true);
        const s = cr.shards[0];
        if (hash(`${cr.ph}:${Math.floor(t * 3)}`) % 4 === 0) F.paint(cr.x + s.dx, cr.y - s.len * 0.7, INK.crystal);
      }
      for (const d of drips) {
        const fall = Math.sqrt((2 * (d.land - d.y)) / G);
        const phase = (t + d.off) % d.period;
        if (phase < fall) F.dot(d.x, d.y + 0.5 * G * phase * phase, 0.75);
        if (d.last < fall && phase >= fall) c.ripple(d.x, d.land, t, 0.6);
        d.last = phase;
      }
    },
    drawPerch(F, P, top, t) {
      if (P.mushroom) {
        F.ell(P.x, top + P.h * 0.55, Math.max(1, P.rx * 0.22), P.h * 0.55, 0, (_o, _q, u) => 0.42 + 0.1 * u * light);
        const glow = 0.86 + 0.08 * Math.sin(t * 1.7 + P.ph);
        F.ell(P.x, top + P.ry * 0.3, P.rx * 1.9, P.ry * 2.6, 0, (old, q) => old + 0.14 * (1 - q), true);
        F.ell(P.x, top + P.ry * 0.3, P.rx * 1.05, P.ry * 1.5, 0, (_o, q, _u, w) => (w > 0.4 ? 0.55 : glow - 0.1 * q));
      } else {
        F.ell(P.x, top + P.h * 0.5, P.rx * 1.04, P.h * 0.6 + P.ry, 0, (_o, _q, u, w) => 0.06 + 0.06 * (0.5 + 0.5 * u * light) - 0.02 * w);
        F.ell(P.x, top, P.rx, P.ry, 0, (_o, q, u) => 0.14 + 0.22 * Math.max(0, u * light) * (1 - q));
      }
    },
    front() {},
    fly(F, x, y, on) {
      F.ell(x, y, 2 * k, 2 * k, 0, (old, q) => old + 0.25 * (1 - Math.sqrt(q)) * on, true);
      F.ell(x, y, 0.75, 0.75, 0, set(0.95));
    },
  };
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/lib/pond`
Expected: PASS, including every `cave scene` contract and the `assignScenes` test, now with six distinct scenes for six names.

- [ ] **Step 6: Look at it**

```bash
bun /tmp/scene-png.ts cave 400 110 6 /tmp/cave-hero.png && bun /tmp/scene-png.ts cave 128 86 6 /tmp/cave-card.png
```

Expected: a near-black cave with a ragged ceiling and stalactites, two to four clusters of lilac-white crystals glowing violet into the rock and shimmering in the black water, drips falling and ringing the water, glowing mushroom caps and dark flat rocks with the frogs on them, and glow motes. Tune `cave.ts` until it reads.

- [ ] **Step 7: Check the speed**

Run: `bun /tmp/scene-speed.ts`
Expected: `cave` at most `1.50x lake` (the crystal reflections are the cost; `glitter` returns before its sine for pixels outside a reflection's width).

- [ ] **Step 8: Commit**

```bash
git add src/lib/pond/scenes/cave.ts src/lib/pond/scenes/index.ts src/lib/pond/palette.ts
git commit -m "Add a cave lake scene."
```

### Task 8: A scene on every pond

**Files:**
- Create: `src/lib/secret/pass-scenes.ts`, `src/lib/secret/pass-scenes.test.ts`
- Modify: `src/lib/components/Hero.svelte:21`, `src/lib/github/GitHubActivitySection.svelte:52-56`, `src/lib/components/Footer.svelte:11-15`, `src/lib/secret/LetterStage.svelte:196`, `src/lib/secret/PondGoodbye.svelte` (its `PondCanvas`), `src/lib/secret/LovePass.svelte`, `src/lib/secret/LovePasses.svelte`

**Interfaces:**
- Consumes: `SCENE_NAMES`, `SceneName` (`scenes/index.ts`).
- Produces: `passScenes(icons: readonly string[]): SceneName[]`; `LovePass` takes `scene: SceneName` instead of `palette: PaletteName`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/secret/pass-scenes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { passScenes } from './pass-scenes';

describe('passScenes', () => {
  it('matches each gift to its scene by icon', () => {
    expect(passScenes(['massage', 'dinner', 'boba', 'movie', 'crown', 'getaway'])).toEqual(['onsen', 'waterfall', 'lake', 'cave', 'meadow', 'beach']);
  });

  it('gives an unknown icon the first scene not yet on the page', () => {
    expect(passScenes(['massage', 'kite', 'boba'])).toEqual(['onsen', 'beach', 'lake']);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/lib/secret/pass-scenes.test.ts`
Expected: FAIL, `Failed to resolve import "./pass-scenes"`.

- [ ] **Step 3: Write the matching**

Create `src/lib/secret/pass-scenes.ts`:

```ts
import { SCENE_NAMES, type SceneName } from '../pond/scenes';

/** Each pass's pond suits its gift. Matched by icon: the titles are sealed, the icons are not. */
const BY_ICON: Record<string, SceneName> = {
  massage: 'onsen',
  dinner: 'waterfall',
  boba: 'lake',
  movie: 'cave',
  crown: 'meadow',
  getaway: 'beach',
};

/** The scene for each pass, in order: its icon's match, or else the first scene not yet used on the page. */
export function passScenes(icons: readonly string[]): SceneName[] {
  const used = new Set<SceneName>(icons.map((icon) => BY_ICON[icon]).filter((s) => s !== undefined));
  return icons.map((icon) => {
    const known = BY_ICON[icon];
    if (known) return known;
    const next = SCENE_NAMES.find((s) => !used.has(s)) ?? SCENE_NAMES[0];
    used.add(next);
    return next;
  });
}
```

- [ ] **Step 4: Run it**

Run: `npx vitest run src/lib/secret/pass-scenes.test.ts`
Expected: PASS.

- [ ] **Step 5: Name every pond's scene**

`src/lib/components/Hero.svelte`:

```svelte
      <PondCanvas seed="mintychochip-dusk" scene="lake" options={pond} interactive />
```

`src/lib/github/GitHubActivitySection.svelte`, in the pond's props, `palette="night"` becomes:

```svelte
        scene="waterfall"
```

`src/lib/components/Footer.svelte`, `palette="night"` becomes:

```svelte
      scene="beach"
```

`src/lib/secret/LetterStage.svelte` (the dusk lake stays exactly as it is):

```svelte
      <PondCanvas seed="anniversary-dusk" scene="lake" palette="dusk" options={pondOptions} interactive />
```

`src/lib/secret/PondGoodbye.svelte`, in its `PondCanvas`, `palette="night"` becomes:

```svelte
        scene="lake"
```

`src/lib/secret/LovePass.svelte`: the `palette` prop becomes `scene`. Replace `import type { PaletteName } from '../pond/palette';` with `import type { SceneName } from '../pond/scenes';`, `palette,` with `scene,` in the destructured props, `palette: PaletteName;` with `scene: SceneName;`, and in its pond `{palette}` with `{scene}`:

```svelte
      <PondCanvas bind:this={pond} seed={title} {scene} options={pondOptions} />
```

`src/lib/secret/LovePasses.svelte`: replace the `PaletteName` import and `PASS_PALETTES` with the matching:

```ts
  import LovePass from './LovePass.svelte';
  import { passScenes } from './pass-scenes';
  import type { VaultCoupon } from './vault-types';
```

```ts
  /** Each pass gets a pond that suits its gift. */
  const scenes = $derived(passScenes(passes.map((p) => p.icon)));
```

```svelte
        scene={scenes[i]}
```

(in place of `palette={PASS_PALETTES[i % PASS_PALETTES.length]}`).

- [ ] **Step 6: Run everything**

Run: `npx vitest run && npx svelte-check --tsconfig ./tsconfig.json && npm run build`
Expected: every test PASSES, `svelte-check found 0 errors and 0 warnings`, the build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/lib/secret/pass-scenes.ts src/lib/secret/pass-scenes.test.ts src/lib/components/Hero.svelte src/lib/github/GitHubActivitySection.svelte src/lib/components/Footer.svelte src/lib/secret/LetterStage.svelte src/lib/secret/PondGoodbye.svelte src/lib/secret/LovePass.svelte src/lib/secret/LovePasses.svelte
git commit -m "Give every pond on the site its own scene."
```

### Task 9: Speed, browser check and hand-off

**Files:** none committed; the throwaway tools are deleted.

- [ ] **Step 1: Time every scene**

Run: `bun /tmp/scene-speed.ts`
Expected: six lines, every scene at most `1.50x lake`. Fix any that is not before going on.

- [ ] **Step 2: Run the full checks**

Run: `npx svelte-check --tsconfig ./tsconfig.json && npx vitest run && npm run build`
Expected: 0 errors and 0 warnings, every test passing, a clean build.

- [ ] **Step 3: Check the site at desktop size**

With the dev server on `http://127.0.0.1:5199/`, in a headless browser tab at 1440×900:

- Hero: the night lake, as before.
- GitHub activity: the waterfall and river across the strip, the fall towards one end; hovering the heatmap makes a frog react.
- Projects, page 1: six cards, six different scenes; another page shows each of its projects with the same scene every time.
- Footer: the beach in the thin strip.
- Vault (`sessionStorage.setItem('<door grant key>', 'x')` on the page, then `#secret` and reload; skip the loader, open the letter, finish it): the dusk lake behind the envelope, the six passes as onsen, waterfall, lake, cave, meadow and beach, and the goodnight lake where the pond's button seats both frogs on one lily pad under a heart.
- The console has no errors or warnings from the ponds.

- [ ] **Step 4: Check it at phone size and with reduced motion**

Repeat Step 3 at 390×844 with a device pixel ratio of 2, then once with `prefers-reduced-motion: reduce` emulated: every pond shows a still picture with its frogs sitting, and nothing animates.

- [ ] **Step 5: Open it for the owner**

Open `http://127.0.0.1:5199/` in a visible browser window for the owner.

- [ ] **Step 6: Clean up**

```bash
rm -f /tmp/scene-png.ts /tmp/scene-speed.ts /tmp/*-hero.png /tmp/*-card.png /tmp/*-strip.png
```

The README's line about the site ("I have a night pond, …") stays true: the hero keeps the night lake. Nothing is pushed until the owner says to ship.

