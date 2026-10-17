import { Field, TAU, hash } from '../field';
import { scatter, type Perch, type SceneContext, type Setting } from '../life';
import { glitter, glitterRows, halo } from '../sky';

interface Rock extends Perch {
  /** How far the rock reaches down below its top. */
  h: number;
}

/**
 * Beach at sunset: a low sun half-set on the sea with its glitter, long clouds lit from below, a headland, waves
 * washing up wet sand, rocks along the shore and gulls overhead.
 */
export function beach(c: SceneContext): Setting<Rock> {
  const { W, H, k, r, y0, depthAt, frogAt } = c;
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

  // The swimmable sea stays below the lowest the visible waterline (swell plus wash) ever reaches, so it is a
  // straight band: a frog swimming in a straight line from one wet point to another never crosses sand.
  const swimTop = shore - 3.4 * k;
  const water = (_x: number, y: number) => y > y0 + 1 && y < swimTop;

  // Every perch stands in the surf with its climbing approach in the water, so a swimming frog never leaves the sea
  // to reach one.
  const rocks = scatter(c, Math.max(c.frogs + 2, Math.round(W / (24 * k))), (): Rock => {
    const x = 6 * k + r() * Math.max(1, W - 12 * k);
    // Crowd toward the shore side of the swimmable band, each rock at its own depth, so the core never hands both
    // frogs the same perch on a tied seat height.
    const span = Math.max(0.5, swimTop - y0 - 1);
    const u = r();
    let y = swimTop - 0.5 - u * u * span;
    let p = depthAt(y);
    // Wide enough for a frog to sit on: the core seats a frog only where twice the half-width covers most of the
    // frog, and the surf rocks run small where the water is shallow. The extra roll keeps every width — and so
    // every seat height — distinct.
    const rx = Math.max((6 + 4 * r()) * k * p, 0.45 * frogAt(p).w + (0.5 + 0.5 * r()) * k);
    const ry = rx * 0.36;
    // Sink until a frog swimming up climbs onto wet rock.
    y = Math.min(y, swimTop - 0.3 - ry * 0.6);
    p = depthAt(y);
    return { x, y, rx, ry, p, floats: false, ph: r() * TAU, h: (1.6 + 1.4 * r()) * k * p };
  });

  const gulls = Array.from({ length: W > 90 ? 2 : 1 }, () => ({
    x: r() * W, y: y0 * (0.12 + 0.3 * r()), v: (1.5 + 2 * r()) * k * (r() < 0.5 ? -1 : 1), ph: r() * TAU,
  }));
  const rows = new Float32Array(H);

  return {
    perches: rocks,
    light,
    backdrop: B.v,
    water,
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
      const f = 0.5 + 0.5 * Math.sin(t * 1.7 + P.ph);
      F.ell(P.x, top + P.h, P.rx * (1.2 + 0.15 * f), P.ry * 1.1, 0, (old, q) => (q > 0.5 ? 0.9 : old), true);
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
