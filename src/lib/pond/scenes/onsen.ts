import { Field, TAU, clamp, hash, mul } from '../field';
import { approach, scatter, type Perch, type SceneContext, type Setting } from '../life';
import { INK } from '../palette';
import { drawStars, ridge, scatterStars } from '../sky';

interface Rock extends Perch {
  /** How far the rock reaches down below its snowy top. */
  h: number;
}

/** How much of the spring's rim ellipse the hot water fills: the snowy rim shows beyond it. */
const WATER = 0.82;

interface Spring {
  x: number;
  y: number;
  rx: number;
  ry: number;
}

/** A spring with the rocks round and in it, and how many of them a frog in the water can climb out onto. */
interface Layout {
  spring: Spring;
  rocks: Rock[];
  climbs: number;
}

/** Inside the spring's ellipse scaled by `s`. */
const inSpring = (sp: Spring, x: number, y: number, s: number) => ((x - sp.x) / (sp.rx * s)) ** 2 + ((y - sp.y) / (sp.ry * s)) ** 2 < 1;

/**
 * A snowy onsen at twilight: peaks under the first stars, a steaming hot spring ringed with snow-capped rocks, a
 * stone lantern glowing beside it and snow falling in front. Frogs slip in to soak. The spring settles where its
 * rocks fit between the clear boxes, so wherever they leave room the frogs have rocks to sit on and to climb out onto.
 */
export function onsen(c: SceneContext): Setting<Rock> {
  const { W, H, k, r, y0, depthAt, frogAt } = c;
  const far = ridge(c, 4, 1.2, 6, 12, 9, 0.85);
  const near = ridge(c, 1.5, 1, 4, 8, 8, 0.9);
  const baseRx = Math.min(W * 0.3, (H - y0) * 1.4), baseRy = Math.max(3 * k, (H - y0) * 0.26);
  const poolY = y0 + (H - y0) * 0.55, dflt = W * (0.38 + 0.24 * r());

  /** A snow-capped rock at (x, y), wide enough for a frog to sit on. */
  const rockAt = (x: number, y: number): Rock => {
    const p = depthAt(y);
    // The core seats a frog only where twice the half-width covers most of the frog, and rocks run small where the
    // spring is shallow.
    const rx = Math.max((3.8 + 2 * r()) * k * p, 0.45 * frogAt(p).w + 0.5 * k);
    return { x, y, rx, ry: rx * 0.42, p, floats: false, ph: r() * TAU, h: (1.6 + 1.2 * r()) * k * p };
  };
  /** A rock at angle `a` round a spring, `q` times as far out as its rim. */
  const around = (sp: Spring, a: number, q: number) => rockAt(sp.x + Math.cos(a) * sp.rx * q, sp.y + Math.sin(a) * sp.ry * q);
  /** Rocks stay wholly in the frame, so a spring squeezed in beside a clear box does not put them half out of it. */
  const inFrame = (R: Rock) => R.x - R.rx >= 0 && R.x + R.rx <= W;
  /** A frog in the water can climb out onto the rock from either side without leaving the water. */
  const climbable = (sp: Spring, R: Rock) => [R.x - 1, R.x + 1].every((from) => inSpring(sp, ...approach(R, from), WATER));
  /**
   * Rocks for a spring, each keeping out of the clear boxes. The ones frogs climb out onto come first, along the water's
   * far edge or, when that is boxed in, anywhere inside it, so that a swim to them never crosses snow. The rest ring the
   * rim, and where a clear box leaves the ring too few, boulders stand about the snow.
   */
  const furnish = (sp: Spring): Layout => {
    let tried = 0;
    const steps = scatter(c, Math.max(3, c.frogs), () => {
      const R = tried++ < 40 ? around(sp, -Math.PI / 2 + (r() - 0.5) * 1.4, WATER) : around(sp, r() * TAU, WATER * (0.45 + 0.55 * r()));
      return inFrame(R) && climbable(sp, R) ? R : undefined;
    });
    const ring = scatter(c, Math.max(c.frogs + 2, 7), () => {
      const R = around(sp, r() * TAU, 1.02);
      return inFrame(R) ? R : undefined;
    }, steps);
    const rocks = scatter(c, c.frogs + 2, () => {
      const R = rockAt(r() * W, y0 + 2 * k + r() * (H - y0 - 6 * k));
      return inFrame(R) && !inSpring(sp, R.x, R.y, 1.1) ? R : undefined;
    }, ring);
    return { spring: sp, rocks, climbs: steps.length };
  };
  /** What a layout lacks: frogs need a rock each to climb out onto, and two more rocks than frogs to sit on. */
  const shortfall = (L: Layout) => Math.max(0, c.frogs - L.climbs) * 100 + Math.max(0, c.frogs + 2 - L.rocks.length);
  // The usual spot first, then the nearest others, then smaller springs: the first spring whose rocks fit wins.
  const springs = [1, 0.75, 0.55].flatMap((s): Spring[] => {
    const rx = baseRx * s, ry = Math.max(2.5 * k, baseRy * s), lo = Math.min(rx * WATER, W / 2);
    return [dflt, ...Array.from({ length: 10 }, (_, i) => lo + ((W - 2 * lo) * (i + 0.5)) / 10)]
      .map((x) => clamp(x, lo, W - lo))
      .sort((a, b) => Math.abs(a - dflt) - Math.abs(b - dflt))
      .map((x) => ({ x, y: poolY, rx, ry }));
  });
  let layout = furnish(springs[0]);
  for (const sp of springs.slice(1)) {
    if (shortfall(layout) === 0) break;
    const next = furnish(sp);
    if (shortfall(next) < shortfall(layout)) layout = next;
  }
  const { spring: pool, rocks } = layout;
  const side: 1 | -1 = r() < 0.5 ? 1 : -1;
  const lamp = { x: clamp(pool.x + side * (pool.rx + 7 * k), 3 * k, W - 3 * k), y: pool.y - pool.ry * 0.2 };

  const B = new Field(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let val: number;
      if (y < y0) {
        val = 0.08 + 0.47 * (y / Math.max(1, y0)) ** 1.6;
        if (y >= far[x]) val = y - far[x] < 1.6 * k ? 0.78 : 0.32;
        if (y >= near[x]) val = y - near[x] < 1.5 * k ? 0.7 : 0.22;
      } else {
        val = 0.86 + 0.06 * (1 - (y - y0) / Math.max(1, H - y0)) - 0.04 * Math.sin((x * 0.05) / k + y * 0.2);
        if (inSpring(pool, x, y, 1.08) && !inSpring(pool, x, y, 0.92)) val = 0.3;
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
  // Every twentieth candidate star that no peak hides: a few at any size, never none.
  let seen = 0;
  const stars = scatterStars(c, y0, (x, y) => y < far[x] - 1 && seen++ % 20 === 0);
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
    water: (x, y) => inSpring(pool, x, y, WATER),
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
