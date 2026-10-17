import { describe, expect, it } from 'vitest';
import { bars, niceStep } from './bars';
import { Field, levelsOf, packPalette, quantize, sceneTone } from './field';
import { drawFrog, drawTowel, frogBox, sizeFor, type Frame, type FrogFace } from './frog';
import { pond, type Perch, type Setting } from './life';
import { SCENES, SCENE_NAMES, assignScenes, makeScene, type SceneName } from './scenes';
import { cave } from './scenes/cave';
import { onsen } from './scenes/onsen';
import { INK, INK_COLORS, LEVELS, PALETTES, PALETTE_NAMES, ramp } from './palette';

const render = (seed: string, t: number, name: SceneName = 'lake', W = 120, H = 60) => {
  const F = new Field(W, H);
  const scene = makeScene(name, W, H, { seed, k: 1.4, frogs: 2, flies: 4 });
  for (let fr = 0; fr <= t * 12; fr++) scene.render(fr / 12, F);
  return { F, scene };
};

describe('palettes', () => {
  it('pins ramps to their first and last anchors', () => {
    const r = ramp(['#000000', '#ff0000', '#ffffff'], 8);
    expect(r).toHaveLength(8);
    expect(r[0]).toBe('#000000');
    expect(r[7]).toBe('#ffffff');
  });

  it('builds every palette at the shared size, dark to light', () => {
    for (const name of PALETTE_NAMES) {
      const p = PALETTES[name];
      expect(p).toHaveLength(LEVELS);
      const lum = p.map((hex) => parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16));
      expect(lum[LEVELS - 1]).toBeGreaterThan(lum[0]);
    }
  });
});

describe('assignScenes', () => {
  it('gives a page of projects distinct scenes, the same way every time', () => {
    const names = ['toktally', 'kitsune', 'Alchemica', 'dungeon-generator', 'ModularJobs', 'guildpost'];
    const a = assignScenes(names);
    expect(new Set(a).size).toBe(Math.min(names.length, SCENE_NAMES.length));
    expect(assignScenes(names)).toEqual(a);
  });
});

describe('sceneTone', () => {
  it('lifts crushed shadows into mid levels', () => {
    expect(sceneTone(0.1)).toBeGreaterThan(0.1);
    expect(sceneTone(0.9)).toBeGreaterThan(0.85);
    expect(sceneTone(1)).toBeLessThanOrEqual(0.97);
  });
});

describe('quantize', () => {
  it('never dithers a value sitting exactly on a level', () => {
    const F = new Field(16, 16);
    F.fill(3 / (LEVELS - 1));
    expect(new Set(levelsOf(F, LEVELS))).toEqual(new Set([3]));
  });

  it('mixes the two neighbouring levels in between', () => {
    const F = new Field(16, 16);
    F.fill(2.5 / (LEVELS - 1));
    const counts = [0, 0, 0, 0];
    for (const l of levelsOf(F, LEVELS)) counts[l]++;
    expect(counts[2]).toBe(128);
    expect(counts[3]).toBe(128);
  });

  it('writes palette colours', () => {
    const F = new Field(2, 1);
    F.v.set([0, 1]);
    const pal = packPalette(PALETTES.night);
    const out = new Uint32Array(2);
    quantize(F, pal, out);
    expect(out[0]).toBe(pal[0]);
    expect(out[1]).toBe(pal[LEVELS - 1]);
  });

  it('shows sprite colours over the dither until something covers them', () => {
    const F = new Field(3, 1);
    F.v.set([0, 0, 0]);
    F.paint(0, 0, INK.skin);
    F.paint(1, 0, INK.eye);
    F.dot(1, 0, 1);
    const pal = packPalette(PALETTES.night), inks = packPalette(INK_COLORS);
    const out = new Uint32Array(3);
    quantize(F, pal, out, inks);
    expect(out[0]).toBe(inks[INK.skin]);
    expect(out[1]).toBe(pal[LEVELS - 1]);
    expect(out[2]).toBe(pal[0]);
  });
});

describe('frog', () => {
  const SIZES = [0, 1, 2];
  const FRAMES: Frame[] = ['sit', 'breath', 'crouch', 'stretch'];
  const draw = (size: number, frame: Frame = 'sit', face: FrogFace = {}, mirror = false) => {
    const F = new Field(40, 30);
    drawFrog(F, size, frame, face, 20, 28, { mirror });
    return F;
  };
  const colours = (F: Field) => {
    const seen = new Map<number, number>();
    for (const c of F.ink) if (c) seen.set(c - 1, (seen.get(c - 1) ?? 0) + 1);
    return seen;
  };

  it('is green with an outline, white eyes and pupils in every size and frame', () => {
    for (const size of SIZES) for (const frame of FRAMES) {
      const seen = colours(draw(size, frame));
      expect(seen.get(INK.skin)).toBeGreaterThan(seen.get(INK.eye) ?? 0);
      expect(seen.get(INK.eye)).toBeGreaterThan(0);
      expect(seen.get(INK.line)).toBeGreaterThan(0);
      expect(seen.get(INK.blush)).toBeGreaterThan(0);
    }
  });

  it('shuts its eyes when it blinks and when it is happy', () => {
    for (const size of SIZES) {
      expect(colours(draw(size, 'sit', { eyes: 'shut' })).get(INK.eye) ?? 0).toBe(0);
      expect(colours(draw(size, 'sit', { eyes: 'happy' })).get(INK.eye) ?? 0).toBe(0);
    }
  });

  it('looks where it is told to', () => {
    for (const size of SIZES) {
      expect(draw(size, 'sit', { look: [-1, 0] }).ink).not.toEqual(draw(size, 'sit', { look: [1, 0] }).ink);
    }
    expect(draw(2, 'sit', { look: [0, -1] }).ink).not.toEqual(draw(2, 'sit', { look: [0, 1] }).ink);
  });

  it('draws the same frog facing the other way when mirrored', () => {
    for (const size of SIZES) {
      const a = draw(size, 'sit', { look: [1, 0], sac: 1 }), b = draw(size, 'sit', { look: [1, 0], sac: 1 }, true);
      const flipped = new Uint8Array(a.ink.length);
      const { w } = frogBox(size), left = Math.round(20 - w / 2);
      for (let y = 0; y < a.H; y++) for (let x = 0; x < a.W; x++) {
        const fx = 2 * left + w - 1 - x;
        if (fx >= 0 && fx < a.W) flipped[y * a.W + fx] = a.ink[y * a.W + x];
      }
      expect(b.ink).toEqual(flipped);
    }
  });

  it('puffs up its throat and pokes its tongue out', () => {
    for (const size of SIZES) {
      expect(draw(size, 'sit', { sac: 1 }).ink).not.toEqual(draw(size).ink);
      expect(colours(draw(size, 'sit', { blep: true })).get(INK.tongue)).toBeGreaterThan(0);
    }
  });

  it('gets bigger drawings at bigger scales', () => {
    expect([0.8, 1.5, 2.5].map(sizeFor)).toEqual([0, 1, 2]);
    const boxes = SIZES.map(frogBox);
    for (let i = 1; i < boxes.length; i++) {
      expect(boxes[i].w).toBeGreaterThan(boxes[i - 1].w);
      expect(boxes[i].h).toBeGreaterThan(boxes[i - 1].h);
    }
  });

  const inkCount = (F: Field) => F.ink.reduce((n, c) => n + (c ? 1 : 0), 0);

  it('breath and crouch drop rows from the sitting art', () => {
    for (const size of SIZES) {
      const sit = draw(size, 'sit');
      const breath = draw(size, 'breath');
      const crouch = draw(size, 'crouch');
      expect(inkCount(breath)).toBeLessThan(inkCount(sit));
      expect(inkCount(crouch)).toBeLessThan(inkCount(sit));
      expect(breath.ink).not.toEqual(sit.ink);
      expect(crouch.ink).not.toEqual(sit.ink);
      expect(crouch.ink).not.toEqual(breath.ink);
    }
  });

  it('draws with an empty face (reduced-motion still path)', () => {
    for (const frame of FRAMES) {
      expect(() => draw(1, frame, {})).not.toThrow();
      expect(inkCount(draw(1, frame, {}))).toBeGreaterThan(20);
    }
  });

  it('paints a pink body and bow for the girlfriend variant', () => {
    const F = new Field(40, 30);
    drawFrog(F, 1, 'sit', {}, 20, 28, { kind: 'pink' });
    const seen = colours(F);
    expect(seen.get(INK.pinkSkin)).toBeGreaterThan(0);
    expect(seen.get(INK.bow)).toBeGreaterThan(0);
    expect(seen.get(INK.skin) ?? 0).toBe(0);
  });

  it('does not paint the bow over eye whites', () => {
    const isBow = (slot: number) => slot === INK.bow || slot === INK.bowLight || slot === INK.bowKnot || slot === INK.bowFold;
    for (const size of SIZES) {
      const pink = new Field(48, 48);
      const green = new Field(48, 48);
      drawFrog(pink, size, 'sit', {}, 24, 40, { kind: 'pink' });
      drawFrog(green, size, 'sit', {}, 24, 40, { kind: 'green' });
      for (let i = 0; i < pink.ink.length; i++) {
        if (!pink.ink[i] || !isBow(pink.ink[i] - 1)) continue;
        expect(green.ink[i]).not.toBe(INK.eye + 1);
      }
    }
  });

  it('keeps the full bow on every frame (squash/stretch must not clip it)', () => {
    const isBow = (slot: number) => slot === INK.bow || slot === INK.bowLight || slot === INK.bowKnot || slot === INK.bowFold;
    const bowPixels = (size: number, frame: Frame) => {
      const F = new Field(48, 48);
      drawFrog(F, size, frame, {}, 24, 40, { kind: 'pink' });
      let n = 0;
      for (const c of F.ink) if (c && isBow(c - 1)) n++;
      return n;
    };
    for (const size of SIZES) {
      const sit = bowPixels(size, 'sit');
      expect(sit).toBeGreaterThan(size === 0 ? 6 : 15);
      for (const frame of FRAMES) {
        expect(bowPixels(size, frame)).toBe(sit);
      }
    }
  });

  it('draws the bow mirrored when the frog faces the other way', () => {
    const isBow = (slot: number) => slot === INK.bow || slot === INK.bowLight || slot === INK.bowKnot || slot === INK.bowFold;
    for (const size of SIZES) {
      const normal = new Field(48, 48);
      const mirrored = new Field(48, 48);
      drawFrog(normal, size, 'sit', {}, 24, 40, { kind: 'pink', mirror: false });
      drawFrog(mirrored, size, 'sit', {}, 24, 40, { kind: 'pink', mirror: true });
      let nNormal = 0, nMirrored = 0;
      for (const c of normal.ink) if (c && isBow(c - 1)) nNormal++;
      for (const c of mirrored.ink) if (c && isBow(c - 1)) nMirrored++;
      expect(nMirrored).toBe(nNormal);
    }
  });

  it('rests the towel above its head without covering the bow, whichever way it faces', () => {
    const bow = new Set<number>([INK.bow, INK.bowLight, INK.bowKnot, INK.bowFold]);
    for (const size of SIZES) for (const mirror of [false, true]) {
      const bare = new Field(48, 48), wrapped = new Field(48, 48);
      drawFrog(bare, size, 'sit', { eyes: 'happy' }, 24, 40, { kind: 'pink', mirror });
      drawFrog(wrapped, size, 'sit', { eyes: 'happy' }, 24, 40, { kind: 'pink', mirror });
      drawTowel(wrapped, size, 24, 40, mirror);
      let towel = 0;
      for (let i = 0; i < wrapped.ink.length; i++) {
        if (wrapped.ink[i] === INK.towel + 1 || wrapped.ink[i] === INK.towelStripe + 1) {
          towel++;
          expect(bare.ink[i]).toBe(0);
        }
        if (bare.ink[i] && bow.has(bare.ink[i] - 1)) expect(wrapped.ink[i]).toBe(bare.ink[i]);
      }
      expect(towel).toBeGreaterThan(0);
    }
  });
});

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
        // Some of the frog shows: a frog climbing out of deep water has its feet below the frame for a frame.
        expect(f.y - frogBox(sizeFor(f.s)).h).toBeLessThan(H);
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
    expect(F.ink.some((c) => c === INK.pinkSkin + 1)).toBe(true);
    expect(F.ink.some((c) => c === INK.bowKnot + 1)).toBe(true);
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

  it('keeps every swim and soak in the water, and has none where there is none', () => {
    let outside = 0;
    for (const seed of ['wet-a', 'wet-b']) {
      const W = 160, H = 70, F = new Field(W, H);
      const got: { setting?: Setting } = {};
      const scene = pond(W, H, { seed, k: 1.4, frogs: 2 }, (c): Setting => (got.setting = SCENES[name].make(c)));
      for (let fr = 0; fr < 12 * 60; fr++) {
        scene.render(fr / 12, F);
        for (const f of scene.frogs()) if ((f.state === 'swim' || f.state === 'soak') && !got.setting?.water?.(f.x, f.y)) outside++;
      }
    }
    expect(outside).toBe(0);
  });

  it('keeps every seated frog fully in a short strip, as on a phone footer', () => {
    // The sprite's top row is its rounded feet row less its height.
    let cut = 0;
    for (const seed of ['strip-a', 'strip-b']) {
      const W = 122, H = 22, F = new Field(W, H);
      const scene = makeScene(name, W, H, { seed, k: 1.1, frogs: 2, flies: 4, horizon: 0.3 });
      for (let fr = 0; fr < 12 * 40; fr++) {
        scene.render(fr / 12, F);
        for (const f of scene.frogs()) if (f.state !== 'air' && f.state !== 'swim' && f.state !== 'soak' && Math.round(f.y) - frogBox(sizeFor(f.s)).h < 0) cut++;
      }
    }
    expect(cut).toBe(0);
  });
});

describe('tied perches', () => {
  it('seats the two frogs on different perches even when the biggest tie', () => {
    const W = 120, H = 60, F = new Field(W, H);
    const scene = pond(W, H, { seed: 'tie', k: 1.4, frogs: 2 }, (c) => {
      const y = c.y0 + 10;
      const p = c.depthAt(y);
      const rx = 0.45 * c.frogAt(p).w + 1;
      const perches: Perch[] = [0.2, 0.5, 0.8].map((u) => ({ x: W * u, y, rx, ry: rx * 0.4, p, floats: false, ph: 0 }));
      return {
        perches, light: 1, backdrop: new Float32Array(W * H),
        back() {}, drawPerch() {}, front() {}, fly() {},
      };
    });
    scene.render(0, F);
    const [a, b] = scene.frogs();
    expect(a.x).not.toBe(b.x);
    expect(F.ink.some((cc) => cc === INK.skin + 1)).toBe(true);
    expect(F.ink.some((cc) => cc === INK.pinkSkin + 1)).toBe(true);
  });
});

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

  it('draws its flies where a frog can see them, over the snow and over the sky', () => {
    const W = 160, H = 70;
    const got: { setting?: Setting } = {};
    pond(W, H, { seed: 'fly', k: 1.4, frogs: 2 }, (c) => (got.setting = onsen(c)));
    for (const ground of [0.9, 0.15]) {
      const F = new Field(W, H);
      F.fill(ground);
      got.setting?.fly(F, 40, 30, 1);
      expect(Math.abs(F.get(40, 30) - ground)).toBeGreaterThan(0.3);
    }
  });
});

describe('onsen with boxes to keep clear', () => {
  interface Case {
    name: string;
    W: number;
    H: number;
    frogs: number;
    clear: readonly (readonly [number, number, number, number])[];
  }
  // A love pass's ribbon, which shares its card with the onsen, and harsher boxes: a column down the middle and a title
  // over the sky.
  const ribbon: Case = { name: 'a ribbon', W: 120, H: 70, frogs: 2, clear: [[(120 - 36) / 120, 0, (120 - 25) / 120, 1]] };
  const cases: Case[] = [
    ribbon,
    { name: 'a column down the middle', W: 120, H: 70, frogs: 2, clear: [[0.35, 0, 0.65, 1]] },
    { name: 'a column down a card', W: 128, H: 86, frogs: 2, clear: [[0.35, 0, 0.65, 1]] },
    { name: 'a title over the sky', W: 120, H: 70, frogs: 2, clear: [[0.1, 0.05, 0.9, 0.55]] },
  ];
  const build = (c: Case, seed: string) => {
    const got: { setting?: Setting } = {};
    const scene = pond(c.W, c.H, { seed, k: 1.5, frogs: c.frogs, horizon: 0.42, clear: c.clear }, (ctx) => (got.setting = onsen(ctx)));
    return { scene, setting: got.setting! };
  };

  it.each(cases)('keeps frogs + 2 rocks to sit on with $name', (c) => {
    for (let i = 0; i < 40; i++) expect(build(c, `rocks-${i}`).setting.perches.length).toBeGreaterThanOrEqual(c.frogs + 2);
  });

  it.each(cases)('never lets a frog swim or soak outside the spring with $name', (c) => {
    let dry = 0;
    for (let i = 0; i < 6; i++) {
      const { scene, setting } = build(c, `swim-${i}`);
      const F = new Field(c.W, c.H);
      for (let fr = 0; fr < 12 * 60; fr++) {
        scene.render(fr / 12, F);
        for (const f of scene.frogs()) if ((f.state === 'swim' || f.state === 'soak') && !setting.water?.(f.x, f.y)) dry++;
      }
    }
    expect(dry).toBe(0);
  });

  it('still has its frogs soaking beside a ribbon', () => {
    let soaking = 0;
    for (let i = 0; i < 6; i++) {
      const { scene } = build(ribbon, `ribbon-${i}`);
      const F = new Field(ribbon.W, ribbon.H);
      for (let fr = 0; fr < 12 * 60; fr++) {
        scene.render(fr / 12, F);
        soaking += scene.frogs().filter((f) => f.state === 'soak').length;
      }
    }
    expect(soaking).toBeGreaterThan(0);
  });
});

describe('cave', () => {
  it('lets its drips fall right across the cave, not just at one end', () => {
    const W = 400, H = 110, F = new Field(W, H);
    const rippleAt: number[] = [];
    const scene = pond(W, H, { seed: 'drips', k: 2.6, frogs: 2 }, (c) => cave({ ...c, ripple: (x) => rippleAt.push(x) }));
    for (let fr = 0; fr < 12 * 40; fr++) scene.render(fr / 12, F);
    expect(rippleAt.length).toBeGreaterThan(4);
    expect(Math.max(...rippleAt) - Math.min(...rippleAt)).toBeGreaterThan(W / 3);
  });
});

describe('bars', () => {
  it('picks round tick steps', () => {
    expect(niceStep(0.7)).toBe(1);
    expect(niceStep(130)).toBe(200);
    expect(niceStep(2.2e8)).toBe(2.5e8);
    expect(niceStep(4.1e8)).toBe(5e8);
  });

  it('draws stacks in exact series levels and reports ticks', () => {
    const top = LEVELS - 1;
    const L = bars(40, 30, [[1, 1], [2, 0], [0, 4]], { series: [3, 6], gap: 2 });
    const levels = levelsOf(L.F, LEVELS);
    const at = (x: number, y: number) => levels[y * 40 + x];
    expect(L.peak).toBe(2);
    expect(L.ticks.at(-1)!.value).toBeGreaterThanOrEqual(4);
    expect(at(L.bx(2) + 1, L.sy(4) + 1)).toBe(6);
    expect(at(L.bx(0) + 1, L.sy(0) - 1)).toBe(3);
    expect(L.F.v.every((v) => v >= 0 && v <= 1)).toBe(true);
    expect(top).toBe(7);
  });

  it('safely handles narrow widths with many bars without out-of-bounds corruption', () => {
    const rows = Array.from({ length: 90 }, () => [1, 2]);
    const L = bars(30, 20, rows, { series: [3, 6], gap: 1 });
    expect(L.F.v.every((v) => v >= 0 && v <= 1)).toBe(true);
    expect(Number.isFinite(L.bx(0))).toBe(true);
  });
});
