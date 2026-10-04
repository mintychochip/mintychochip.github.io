import { Field, TAU, clamp, hash, lerp, mul, rng, sceneTone, set } from './field';
import { drawFrog as paintFrog, frogBox, mouthAt as frogMouth, sizeFor, type Frame, type FrogFace, type FrogKind } from './frog';
import { INK } from './palette';

export interface NightOpts {
  seed?: string;
  /** Art pixels per frog unit; also scales pads, ripples and hops. */
  k?: number;
  frogs?: number;
  flies?: number;
  pads?: number;
  /** Horizon row as a fraction of the height. */
  horizon?: number;
  reeds?: boolean;
  /** Draw the moon and its glint; light still comes from its side. */
  moon?: boolean;
  /** A box [left, top, right, bottom], as fractions of the frame, kept clear of pads and the frogs on them. */
  clear?: readonly [number, number, number, number];
  /** No autonomous actions: frogs sit and look around. */
  still?: boolean;
}

export interface Scene {
  render(t: number, F: Field): void;
  /** Ripple at a point on the water (pointer movement). */
  poke(x: number, y: number): void;
  /** Click: startle a frog, send one to a pad, or ripple the water. */
  tap(x: number, y: number): void;
  /** Pointer position frogs should watch. */
  look(x: number, y: number): void;
  /** Something nearby happened (the card was hovered): a frog does something. */
  react(): void;
  /** Where each frog is and what it is doing, for tests and tools. */
  frogs(): { state: string; x: number; y: number; s: number; dir: number }[];
}

interface Pad {
  x: number; y: number; rx: number; ry: number; p: number; ph: number;
  notch: 1 | -1; dip: number; dipA: number; lotus: boolean; frog: Frog | null;
}

interface Fly {
  cx: number; cy: number; ax: number; ay: number; fx: number; fy: number;
  ph: number; bf: number; gone: number; out: boolean;
}

interface Hop {
  x0: number; y0: number; s0: number; x1: number; y1: number; s1: number;
  t0: number; dur: number; h: number; to: number; dive: boolean; climb: boolean;
}

interface Tongue { fly: Fly; caught: boolean }

type State = 'sit' | 'croak' | 'snap' | 'turn' | 'crouch' | 'air' | 'land' | 'swim';

interface Frog {
  pad: number; dir: 1 | -1; sz: number; ph: number;
  kind: FrogKind;
  state: State; t0: number; next: number; blink: number; snapAt: number;
  /** When the next fingertip tapping starts, and when the frog was last startled. */
  fidget: number; startled: number;
  hop: Hop | null; tongue: Tongue | null;
  swim: { x: number; y: number; to: number; wake: number } | null;
  look: [number, number];
}

const CROUCH_T = 0.17, LAND_T = 0.17, SETTLE_T = 0.17;
const SNAP_WIND = 0.09, SNAP_OUT = 0.17, SNAP_BACK = 0.17, SNAP_GULP = 0.33;
const CROAK_T = 1.2, TURN_T = 0.25, FIDGET_T = 1.2, STARTLE_T = 0.9;
/** Frog scale per pad depth, in art pixels per unit of a frog about 9 units tall; `sizeFor` turns it into a drawing. */
const SIZE = 0.95;

export function nightPond(W: number, H: number, o: NightOpts = {}): Scene {
  const k = o.k ?? 1;
  const r = rng(hash(String(o.seed ?? 'night')));
  const y0 = Math.round(H * (o.horizon ?? 0.5));
  const depthAt = (y: number) => 0.45 + (0.75 * (y - y0)) / Math.max(1, H - y0);

  const moon = { x: W * (0.2 + 0.6 * r()), y: y0 * (0.28 + 0.2 * r()), R: o.moon === false ? 0 : Math.max(3.5, Math.min(W, H) * 0.09) };
  const sx = moon.x >= W / 2 ? 1 : -1;
  const craters: [number, number, number][] = [[-0.35, -0.2, 0.28], [0.3, 0.25, 0.22], [0.05, 0.45, 0.15]];

  function ridge(base: number, wave: number, hMin: number, hMax: number, step: number) {
    const a = new Float32Array(W), ph = r() * 10;
    for (let x = 0; x < W; x++) a[x] = y0 - (base + wave * (Math.sin((x * 0.09) / k + ph) + 0.6 * Math.sin((x * 0.23) / k + ph * 2))) * k;
    for (let tx = -4 * k; tx < W + 4 * k; tx += (step + 4 * r()) * k) {
      const th = (hMin + (hMax - hMin) * r() * r()) * k, hw = th * (0.26 + 0.1 * r());
      for (let x = Math.max(0, Math.floor(tx - hw)); x <= Math.min(W - 1, Math.ceil(tx + hw)); x++) {
        const dx = Math.abs(x + 0.5 - tx) / hw;
        if (dx <= 1) a[x] = Math.min(a[x], y0 - base * k - th * (1 - dx));
      }
    }
    return a;
  }
  const far = ridge(3.5, 1.4, 3, 9, 2);
  const top = ridge(1.5, 1, 3, 13, 2.5);

  // Sky, moon and tree lines never move, so they are drawn once.
  const sky = new Float32Array(W * Math.max(0, y0));
  const halo = moon.R * 2.6;
  for (let y = 0; y < y0; y++) {
    const g = y / Math.max(1, y0);
    for (let x = 0; x < W; x++) {
      let val = 0.08 + 0.36 * g ** 1.8 + 0.1 * Math.exp(-(y0 - y) / (6 * k));
      const dx = x + 0.5 - moon.x, dy = y + 0.5 - moon.y, d = Math.hypot(dx, dy);
      if (d < moon.R) {
        val = 0.86 + 0.14 * Math.sqrt(1 - (d / moon.R) ** 2);
        for (const [cx, cy, cr] of craters) {
          const ex = x + 0.5 - (moon.x + cx * moon.R), ey = y + 0.5 - (moon.y + cy * moon.R);
          const e = Math.hypot(ex, ey) / (cr * moon.R);
          if (e < 1) val = e > 0.65 && ex * sx + ey > 0 ? 1 : val - 0.12;
        }
      } else if (d < moon.R + halo) {
        val += 0.24 * Math.pow(1 - (d - moon.R) / halo, 2.2);
      }
      if (y >= far[x]) val = 0.22 + 0.08 * Math.exp(-Math.abs(x - moon.x) / (W * 0.35));
      if (y >= top[x]) val = 0.09;
      sky[y * W + x] = sceneTone(val, 0.78, 0.04, 0.98);
    }
  }
  const stars = Array.from({ length: Math.round((W * y0) / 70) }, () => ({
    x: Math.floor(r() * W), y: Math.floor(r() * y0 * 0.8), ph: r() * TAU, sp: 0.8 + 2 * r(),
  })).filter((s) => s.y < far[s.x] && Math.hypot(s.x - moon.x, s.y - moon.y) > moon.R + halo * 0.6);

  const [cl, ct, cr, cb] = o.clear ?? [0, 0, 0, 0];
  /** Whether anything from x0..x1, y0..y1 (art pixels) would show inside the clear box. */
  const inClear = (xa: number, ya: number, xb: number, yb: number) => xb > cl * W && xa < cr * W && yb > ct * H && ya < cb * H;

  const pads: Pad[] = [];
  const want = o.pads ?? Math.max(2, Math.round(W / (22 * k)));
  for (let tries = 0; tries < 400 && pads.length < want; tries++) {
    const y = y0 + 3 * k + r() * Math.max(1, H - y0 - 5 * k);
    const p = depthAt(y);
    const rx = (5.5 + 4.5 * r()) * k * p, ry = rx * 0.32;
    const x = rx + r() * Math.max(1, W - 2 * rx);
    if (inClear(x - rx, y - ry - frogBox(sizeFor(k * p * SIZE)).h, x + rx, y + ry)) continue;
    if (pads.every((q) => Math.abs(q.x - x) > q.rx + rx + k || Math.abs(q.y - y) > (q.ry + ry) * 1.6)) {
      pads.push({ x, y, rx, ry, p, ph: r() * TAU, notch: r() < 0.5 ? 1 : -1, dip: -9, dipA: 0, lotus: false, frog: null });
    }
  }
  pads.sort((a, b) => a.y - b.y);
  const padY = (P: Pad, t: number) => {
    const age = t - P.dip;
    const dip = age >= 0 && age < 1.6 ? P.dipA * Math.exp(-age * 4) * Math.cos(age * 13) : 0;
    return P.y + 0.35 * k * Math.sin(t * 1.1 + P.ph) + dip;
  };
  const fitsFrog = (P: Pad) => 2 * P.rx >= 0.9 * frogBox(sizeFor(k * P.p * SIZE)).w;

  const homes = pads.map((_, i) => i).filter((i) => fitsFrog(pads[i])).sort((a, b) => pads[b].rx - pads[a].rx);
  const frogs: Frog[] = homes.slice(0, o.frogs ?? 1).map((pi, i) => {
    const f: Frog = {
      pad: pi, dir: r() < 0.5 ? 1 : -1, sz: 0.95 + 0.15 * r(), ph: r() * TAU,
      kind: i === 1 ? 'pink' : 'green',
      state: 'sit', t0: 0, next: 1 + r() * 3, blink: 1 + r() * 4, snapAt: 1 + r() * 2,
      fidget: 2 + r() * 5, startled: -9,
      hop: null, tongue: null, swim: null, look: [0.5, 0],
    };
    pads[pi].frog = f;
    return f;
  });
  for (const P of pads) if (!P.frog && r() < 0.3) P.lotus = true;

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

  const reeds: { x: number; h: number; ph: number; cat: boolean }[] = [];
  if (o.reeds !== false) {
    for (const side of [0, 1]) {
      const n = 1 + Math.floor(r() * 2);
      for (let j = 0; j < n; j++) {
        const x = side ? W - 2 - (j * 0.07 + r() * 0.05) * W : 2 + (j * 0.07 + r() * 0.05) * W;
        reeds.push({ x, h: (0.3 + 0.3 * r()) * H, ph: r() * TAU, cat: r() < 0.7 });
      }
    }
  }

  const ripples: { x: number; y: number; t0: number; p: number; s: number }[] = [];
  const drops: { x: number; y: number; vx: number; vy: number; t0: number }[] = [];
  let now = 0;
  let pointer: { x: number; y: number; t: number } | null = null;

  const ripple = (x: number, y: number, t: number, s = 1) => {
    if (y >= y0 && ripples.length < 40) ripples.push({ x, y, t0: t, p: depthAt(y), s });
  };
  const splash = (x: number, y: number, t: number, n: number, s: number) => {
    for (let j = 0; j < n; j++) {
      const a = -Math.PI / 2 + (r() - 0.5) * 2.2;
      const v = (10 + 14 * r()) * s;
      drops.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t0: t });
    }
  };

  const scale = (f: Frog, P: Pad) => k * P.p * SIZE * f.sz;
  const seat = (P: Pad, t: number): [number, number] => [P.x, padY(P, t) - P.ry * 0.15];
  const mouthAt = (x: number, y: number, s: number, dir: number) => frogMouth(sizeFor(s), 'sit', x, y, dir < 0);

  function frogXY(f: Frog, t: number): { x: number; y: number; s: number; ground: number } {
    if (f.swim) {
      const s = k * depthAt(f.swim.y) * SIZE * f.sz;
      return { x: f.swim.x, y: f.swim.y, s, ground: f.swim.y };
    }
    if (f.hop && (f.state === 'air' || f.state === 'land')) {
      const h = f.hop;
      if (f.state === 'land') {
        if (h.to >= 0) { const [x, y] = seat(pads[h.to], t); return { x, y, s: h.s1, ground: y }; }
        return { x: h.x1, y: h.y1, s: h.s1, ground: h.y1 };
      }
      const u = clamp((t - h.t0) / h.dur, 0, 1);
      let x1 = h.x1, y1 = h.y1;
      if (h.to >= 0) [x1, y1] = seat(pads[h.to], t);
      const gy = lerp(h.y0, y1, u);
      return { x: lerp(h.x0, x1, u), y: gy - h.h * 4 * u * (1 - u), s: lerp(h.s0, h.s1, u), ground: gy };
    }
    const P = pads[f.pad];
    const [x, y] = seat(P, t);
    return { x, y, s: scale(f, P), ground: y };
  }

  function freePads(f: Frog, x: number, y: number, maxD: number) {
    return pads
      .map((P, i) => ({ P, i, d: Math.hypot(P.x - x, (P.y - y) * 1.6) }))
      .filter(({ P, i, d }) => i !== f.pad && !P.frog && fitsFrog(P) && d < maxD && d > P.rx * 0.5);
  }

  function startHop(f: Frog, t: number, to: number) {
    const P0 = pads[f.pad], P1 = pads[to];
    const [xa, ya] = seat(P0, t), [xb, yb] = seat(P1, t);
    const dist = Math.hypot(xb - xa, yb - ya);
    P0.frog = null;
    P1.frog = f;
    P1.lotus = false;
    if (Math.abs(xb - xa) > 2 * k) f.dir = xb > xa ? 1 : -1;
    f.hop = {
      x0: xa, y0: ya, s0: scale(f, P0), x1: xb, y1: yb, s1: scale(f, P1),
      t0: t + CROUCH_T, dur: clamp(0.36 + (0.11 * dist) / (10 * k), 0.4, 0.8),
      h: 5 * k * (P0.p + P1.p) * 0.5 + 0.16 * dist, to, dive: false, climb: false,
    };
    f.state = 'crouch';
    f.t0 = t;
  }

  function startDive(f: Frog, t: number) {
    const P0 = pads[f.pad];
    const [xa, ya] = seat(P0, t);
    for (let tries = 0; tries < 12; tries++) {
      const dx = (12 + 22 * r()) * k * P0.p * (r() < 0.5 ? -1 : 1);
      const x = xa + dx, y = clamp(ya + (r() - 0.3) * 10 * k, y0 + 3 * k, H - 3 * k);
      if (x < 4 * k || x > W - 4 * k || inClear(x - 4 * k, y - 3 * k, x + 4 * k, y + k)) continue;
      if (pads.some((P) => Math.abs(P.x - x) < P.rx + 2 * k && Math.abs(P.y - y) < P.ry + 3 * k)) continue;
      P0.frog = null;
      f.dir = dx > 0 ? 1 : -1;
      const p = depthAt(y);
      f.hop = {
        x0: xa, y0: ya, s0: scale(f, P0), x1: x, y1: y, s1: k * p * SIZE * f.sz, t0: t + CROUCH_T,
        dur: clamp(0.36 + (0.11 * Math.abs(dx)) / (10 * k), 0.4, 0.75), h: 8 * k * P0.p + 0.2 * Math.abs(dx), to: -1, dive: true, climb: false,
      };
      f.state = 'crouch';
      f.t0 = t;
      return true;
    }
    return false;
  }

  function startClimb(f: Frog, t: number) {
    const sw = f.swim!;
    const P1 = pads[sw.to];
    const [xb, yb] = seat(P1, t);
    const s = k * depthAt(sw.y) * SIZE * f.sz, b = frogBox(sizeFor(s));
    f.dir = xb > sw.x ? 1 : -1;
    f.hop = { x0: sw.x, y0: sw.y + b.h - b.swim, s0: s, x1: xb, y1: yb, s1: scale(f, P1), t0: t, dur: 0.38, h: 3.5 * k * P1.p, to: sw.to, dive: false, climb: true };
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
      const near = freePads(f, x, y, 40 * k);
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
              const target = pads.map((P, i) => ({ P, i })).filter(({ P }) => !P.frog && fitsFrog(P))
                .sort((a, b) => Math.hypot(a.P.x - h.x1, a.P.y - h.y1) - Math.hypot(b.P.x - h.x1, b.P.y - h.y1))[0];
              const to = target ? target.i : f.pad;
              pads[to].frog = f;
              f.pad = to;
              f.swim = { x: h.x1, y: h.y1, to, wake: end };
              f.hop = null;
              f.state = 'swim';
              f.t0 = end;
            } else {
              f.pad = h.to;
              const P = pads[h.to];
              P.dip = end; P.dipA = 0.9 * k * P.p;
              ripple(h.x1, h.y1, end, 0.9);
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
          const P = pads[sw.to];
          const ex = P.x - Math.sign(P.x - sw.x || 1) * P.rx * 0.9, ey = P.y + P.ry * 0.6;
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
    for (const fl of flies) if (fl.out && fl.gone > 0 && t >= fl.gone) { placeFly(fl); fl.out = false; fl.gone = 0; }
    for (let i = ripples.length - 1; i >= 0; i--) if (t - ripples[i].t0 > 2 || t < ripples[i].t0) ripples.splice(i, 1);
    for (let i = drops.length - 1; i >= 0; i--) if (t - drops[i].t0 > 0.6 || t < drops[i].t0) drops.splice(i, 1);
  }

  const glint = new Float32Array(H);
  const notched = (P: Pad, u: number, w: number) => w > 0.1 && Math.abs(u - 0.25 * P.notch) < w * 0.35;

  function drawPad(F: Field, P: Pad, t: number) {
    const py = padY(P, t);
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
        const vy = (h.to >= 0 ? seat(pads[h.to], t)[1] : h.y1) - h.y0 - h.h * 4 * (1 - 2 * u);
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
      F.ell(x - sx * 0.06 * box.w, dy - 0.5, box.w * 0.46, shadowH, 0, mul(0.6), true);
    } else if (f.state === 'air' && f.hop) {
      const h = f.hop, u = clamp((t - h.t0) / h.dur, 0, 1);
      const gy = lerp(h.y0, h.to >= 0 ? seat(pads[h.to], t)[1] : h.y1, u);
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
      if (!tg.caught) glow(F, tx, ty, 1);
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
    v.set(sky.subarray(0, Math.min(sky.length, v.length)));
    for (const s of stars) {
      const i = s.y * W + s.x;
      v[i] = Math.max(v[i], 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph)));
    }
    for (let y = y0; y < H; y++) glint[y] = hash(`${y}:${Math.floor(t * 3 + y * 0.37)}`) / 4294967296;
    for (let y = y0; y < H; y++) {
      const dy = y - y0, depth = dy / Math.max(1, H - y0);
      const base = 0.06 + 0.34 * (1 - depth) ** 1.7 + 0.08 * Math.exp(-dy / (4 * k));
      const wob = Math.round(0.9 * k * Math.sin((y * 0.9) / k + t * 2.2));
      const ry = y0 - dy * 1.1;
      const row = glint[y];
      const gw = moon.R * (0.35 + 1.1 * depth) * (0.35 + 0.9 * row);
      const gx = moon.x + (row - 0.5) * moon.R * 0.6;
      for (let x = 0; x < W; x++) {
        let val = base + 0.04 * Math.sin((y * 1.1) / k + t * 1.6 + Math.sin((x * 0.07) / k + t * 0.4) * 2) * depth;
        const rxx = x + wob < 0 ? 0 : x + wob >= W ? W - 1 : x + wob;
        if (ry >= top[rxx]) val *= 0.3;
        else if (ry >= far[rxx]) val *= 0.62;
        const mdx = Math.abs(x + 0.5 - gx);
        if (mdx < gw && Math.sin(y * 1.25 + t * 2.1 + Math.sin(x * 0.45 + t * 0.9) * 1.3) > 0.3) {
          val += 0.72 * Math.pow(1 - mdx / gw, 1.2) * (1 - 0.5 * depth);
        }
        v[y * W + x] = sceneTone(val, 0.8, 0.06, 0.96);
      }
    }
    for (const rp of ripples) {
      const age = t - rp.t0, R = age * 7 * k * rp.p, m = R + 3 * k;
      const amp = 0.24 * rp.s * (1 - age / 2);
      const xa = Math.max(0, Math.floor(rp.x - m)), xb = Math.min(W - 1, Math.ceil(rp.x + m));
      const ya = Math.max(y0, Math.floor(rp.y - m * 0.33)), yb = Math.min(H - 1, Math.ceil(rp.y + m * 0.33));
      for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
        const d = Math.hypot(x - rp.x, (y - rp.y) / 0.33) - R;
        if (d > -3 * k && d < 3 * k) {
          const i = y * W + x;
          v[i] = sceneTone(v[i] + amp * Math.exp(-(d * d) / (2 * k * k)), 0.8, 0.06, 0.98);
        }
      }
    }

    const order: { y: number; draw: () => void }[] = [];
    for (const P of pads) order.push({ y: P.y, draw: () => drawPad(F, P, t) });
    for (const f of frogs) {
      const g = frogXY(f, t).ground;
      const onPad = f.state !== 'air' && f.state !== 'swim';
      order.push({ y: (onPad ? Math.max(g, pads[f.pad].y) : g) + 0.01, draw: () => drawFrog(F, f, t) });
    }
    order.sort((a, b) => a.y - b.y);
    for (const d of order) d.draw();

    for (const dp of drops) {
      const a = t - dp.t0, y = dp.y + dp.vy * a + 40 * k * a * a;
      if (y < dp.y) F.dot(dp.x + dp.vx * a, y, 0.85);
    }

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

    for (const fl of flies) {
      if (fl.out) continue;
      const on = Math.sin(t * fl.bf + fl.ph);
      if (on < 0.1) continue;
      const [x, y] = flyPos(fl, t);
      glow(F, x, y, on);
    }
  }

  function glow(F: Field, x: number, y: number, on: number) {
    F.ell(x, y, 3 * k, 3 * k, 0, (old, q) => old + 0.3 * (1 - Math.sqrt(q)) * on, true);
    F.ell(x, y, 0.75, 0.75, 0, set(1));
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
          const near = freePads(best, p.x, p.y, 60 * k);
          if (near.length) { near.sort((a, b) => a.d - b.d); startHop(best, now, near[0].i); }
          else if (!startDive(best, now)) { best.state = 'croak'; best.t0 = now; }
          return;
        }
      }
      const padHit = pads.findIndex((P) => Math.abs(P.x - x) < P.rx && Math.abs(padY(P, now) - y) < P.ry * 2.5);
      if (padHit >= 0 && !pads[padHit].frog && fitsFrog(pads[padHit]) && idle.length) {
        const P = pads[padHit];
        idle.sort((a, b) => Math.hypot(pads[a.pad].x - P.x, pads[a.pad].y - P.y) - Math.hypot(pads[b.pad].x - P.x, pads[b.pad].y - P.y));
        startHop(idle[0], now, padHit);
        return;
      }
      ripple(x, y, now, 1);
      const f = idle[0];
      if (f) { f.state = 'croak'; f.t0 = now; }
    },
    react() {
      const idle = frogs.filter((f) => f.state === 'sit');
      const f = idle[Math.floor(r() * idle.length)];
      if (!f) return;
      const p = frogXY(f, now);
      const near = freePads(f, p.x, p.y, 60 * k);
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
