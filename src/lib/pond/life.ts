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
