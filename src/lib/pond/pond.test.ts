import { describe, expect, it } from 'vitest';
import { bars, niceStep } from './bars';
import { Field, levelsOf, packPalette, quantize } from './field';
import { drawFrog, frogBox, sizeFor, type Frame, type FrogFace } from './frog';
import { nightPond } from './night';
import { INK, INK_COLORS, LEVELS, PALETTES, PALETTE_NAMES, assignPalettes, ramp } from './palette';

const render = (seed: string, t: number, W = 120, H = 60) => {
  const F = new Field(W, H);
  const scene = nightPond(W, H, { seed, k: 1.4, frogs: 2, flies: 4 });
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

  it('gives a page of names distinct palettes, the same way every time', () => {
    const names = ['toktally', 'kitsune', 'Alchemica', 'dungeon-generator', 'ModularJobs', 'guildpost'];
    const a = assignPalettes(names);
    expect(new Set(a).size).toBe(names.length);
    expect(assignPalettes(names)).toEqual(a);
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
});

describe('night pond', () => {
  it('is deterministic for a seed', () => {
    const a = render('same', 6), b = render('same', 6);
    expect(a.F.v).toEqual(b.F.v);
    expect(a.F.ink).toEqual(b.F.ink);
    expect(render('other', 6).F.v).not.toEqual(a.F.v);
  });

  it('draws its frogs in their own colours', () => {
    const { F } = render('frogs', 2);
    const inks = new Set(F.ink);
    expect(inks.has(INK.skin + 1)).toBe(true);
    expect(inks.has(INK.eye + 1)).toBe(true);
  });

  it('keeps frogs in the frame and every value finite over a long run', () => {
    const W = 160, H = 70, F = new Field(W, H);
    const scene = nightPond(W, H, { seed: 'long', k: 1.6, frogs: 3, flies: 6 });
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
    const scene = nightPond(W, H, { seed: 'still', still: true, frogs: 2 });
    for (let fr = 0; fr < 12 * 30; fr++) scene.render(fr / 12, F);
    expect(scene.frogs().every((f) => f.state === 'sit')).toBe(true);
  });

  it('renders frog ink on the first still frame without look or poke', () => {
    const W = 120, H = 60, F = new Field(W, H);
    const scene = nightPond(W, H, { seed: 'rm-first', still: true, frogs: 2, k: 1.4 });
    scene.render(0, F);
    expect(F.ink.some((c) => c === INK.skin + 1)).toBe(true);
    expect(F.ink.some((c) => c === INK.eye + 1)).toBe(true);
    expect(F.v.every(Number.isFinite)).toBe(true);
  });

  it('answers pokes, taps and reactions without breaking', () => {
    const W = 100, H = 60, F = new Field(W, H);
    const scene = nightPond(W, H, { seed: 'touch', frogs: 1 });
    for (let fr = 0; fr < 48; fr++) {
      if (fr === 5) scene.poke(50, 45);
      if (fr === 10) scene.tap(50, 45);
      if (fr === 20) scene.react();
      scene.look(fr, 30);
      scene.render(fr / 12, F);
    }
    expect(F.v.every(Number.isFinite)).toBe(true);
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
});
