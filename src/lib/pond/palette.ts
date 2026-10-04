import { hash } from './field';

/** Shades per palette. Scenes and charts address colours by level, 0 (darkest) to LEVELS - 1. */
export const LEVELS = 8;

/** Hand-picked key colours, dark to light; `ramp` fills in the shades between them. */
const ANCHORS = {
  night: ['#080c18', '#16264a', '#1f4a5e', '#2f7a66', '#8bbf73', '#f3eab5'],
  moss: ['#091109', '#173a20', '#2c6a33', '#5f9a3e', '#a8cc5c', '#eef2c4'],
  dusk: ['#120a19', '#33173d', '#6e2c55', '#b04f5a', '#e58a58', '#f8deb0'],
  ember: ['#0e0907', '#2e1810', '#5c311b', '#91552a', '#cc8d3e', '#f3dea2'],
  potion: ['#0c0918', '#231848', '#45327e', '#7559b8', '#ab8ce2', '#eee0ff'],
  mist: ['#081014', '#15303a', '#2a5764', '#4f8c96', '#90c1c6', '#e9f4ef'],
} as const;

export type PaletteName = keyof typeof ANCHORS;
export const PALETTE_NAMES = Object.keys(ANCHORS) as PaletteName[];

type Vec3 = [number, number, number];

function hexToRgb(hex: string): Vec3 {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toLinear(c: number) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function fromLinear(c: number) {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, v)) * 255);
}

function toOklab(hex: string): Vec3 {
  const [r, g, b] = hexToRgb(hex).map(toLinear) as Vec3;
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function fromOklab([L, a, b]: Vec3): string {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(fromLinear);
  return '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('');
}

/** `n` colours spaced evenly by perceptual (OKLab) distance along the path through `anchors`. */
export function ramp(anchors: readonly string[], n: number): string[] {
  const pts = anchors.map(toOklab);
  const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1], p[2] - pts[i][2]));
  const total = seg.reduce((a, b) => a + b, 0);
  const out: string[] = [];
  for (let k = 0; k < n; k++) {
    let d = (total * k) / Math.max(1, n - 1);
    let i = 0;
    while (i < seg.length - 1 && d > seg[i]) d -= seg[i++];
    const u = seg[i] > 0 ? Math.min(1, d / seg[i]) : 0;
    const a = pts[i], b = pts[i + 1];
    out.push(fromOklab([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]));
  }
  out[0] = anchors[0];
  out[n - 1] = anchors[anchors.length - 1];
  return out;
}

export const PALETTES = Object.fromEntries(
  PALETTE_NAMES.map((name) => [name, ramp(ANCHORS[name], LEVELS)]),
) as Record<PaletteName, string[]>;

/** The frog keeps its own colours in every pond; `skin` and `shade` are the greens of the profile picture. */
export const INK = {
  line: 0, deep: 1, shade: 2, skin: 3, light: 4, belly: 5, eye: 6, blush: 7, tongue: 8,
  /** Pink girlfriend: body tones and bow (drawn on top of the head). */
  pinkLine: 9, pinkDeep: 10, pinkShade: 11, pinkSkin: 12, pinkLight: 13, pinkBelly: 14, bow: 15, bowKnot: 16,
} as const;
export const INK_COLORS = [
  '#0b1409', '#2b8a37', '#45c148', '#7be07e', '#b8f3a9', '#dff6c4', '#ffffff', '#ff9fb4', '#ef7a93',
  '#2a0f1a', '#9e3d6b', '#d65a8f', '#f48cb8', '#ffc4da', '#ffe8f3', '#ff3d8a', '#c41e6a',
];

/**
 * Gives each name its own palette, stable per name where possible: a name keeps its hashed
 * palette unless an earlier name in the list already took it.
 */
export function assignPalettes(names: readonly string[], pool: readonly PaletteName[] = PALETTE_NAMES): PaletteName[] {
  const used = new Set<PaletteName>();
  return names.map((name) => {
    const start = hash(name) % pool.length;
    for (let j = 0; j < pool.length; j++) {
      const p = pool[(start + j) % pool.length];
      if (!used.has(p) || used.size >= pool.length) {
        used.add(p);
        return p;
      }
    }
    return pool[start];
  });
}
