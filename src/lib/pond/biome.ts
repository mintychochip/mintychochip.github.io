import { hash } from './field';

/** Shades per palette. Scenes and charts address colours by level, 0 (darkest) to LEVELS - 1. */
export const LEVELS = 8;

/** Hand-picked key colours, dark to light; `ramp` fills in the shades between them. */
const ANCHORS = {
  night: ['#080c18', '#16264a', '#1f4a5e', '#2f7a66', '#8bbf73', '#f3eab5'],
  bamboo: ['#0a120c', '#1a3a28', '#2d6a3a', '#5f9a3e', '#a8cc5c', '#eef2c4'],
  oasis: ['#1a0f08', '#3d2814', '#6e4a2a', '#b07a4a', '#e5b06a', '#f8e8c8'],
  swamp: ['#0c1014', '#1a2830', '#2a4048', '#4a6870', '#7a9a9a', '#c8d8d8'],
} as const;

export type BiomeName = keyof typeof ANCHORS;
export const BIOME_NAMES = Object.keys(ANCHORS) as BiomeName[];

type Vec3 = [number, number, number];

function hexToRgb(hex: string): Vec3 {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toLinear(c: number) {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function fromLinear(c: number) {
  c = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(1, c)) * 255);
}

function toOklab(hex: string): Vec3 {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  ];
}

function fromOklab([L, a, b]: Vec3): string {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return `#${[r, g, bl].map(fromLinear).map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/** `n` colours spaced evenly by perceptual (OKLab) distance along the path through `anchors`. */
function ramp(anchors: readonly string[], n: number): string[] {
  const pts = anchors.map(toOklab);
  const segs = pts.length - 1;
  const total = pts.reduce((sum, p, i) => {
    if (i === 0) return 0;
    const q = pts[i - 1];
    return sum + Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  }, 0);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const target = (i / (n - 1)) * total;
    let acc = 0;
    for (let s = 0; s < segs; s++) {
      const a = pts[s], b = pts[s + 1];
      const d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      if (acc + d >= target) {
        const u = d === 0 ? 0 : (target - acc) / d;
        out.push(fromOklab([
          a[0] + (b[0] - a[0]) * u,
          a[1] + (b[1] - a[1]) * u,
          a[2] + (b[2] - a[2]) * u,
        ]));
        break;
      }
      acc += d;
    }
  }
  return out;
}

export const BIOME_PALETTES = Object.fromEntries(
  BIOME_NAMES.map((name) => [name, ramp(ANCHORS[name], LEVELS)]),
) as Record<BiomeName, string[]>;

/** The frog keeps its own colours in every pond; `skin` and `shade` are the greens of the profile picture. */
export const INK = {
  line: 1,
  deep: 2,
  shade: 3,
  skin: 4,
  light: 5,
  belly: 6,
  eye: 7,
  blush: 8,
  tongue: 9,
  pinkLine: 10,
  pinkDeep: 11,
  pinkShade: 12,
  pinkSkin: 13,
  pinkLight: 14,
  pinkBelly: 15,
} as const;

export const INK_COLORS = [
  '#00000000',
  '#1a1a2e',
  '#2d4a3e',
  '#3d6a4e',
  '#5f9a3e',
  '#8bbf73',
  '#c8e6a8',
  '#ffffff',
  '#ffb3c8',
  '#ff6b9d',
  '#2a1a2e',
  '#3d2a3e',
  '#4a3a4e',
  '#6a4a5e',
  '#8a5a6e',
  '#b8c8a8',
];

/**
 * Gives each name its own biome, stable per name where possible: a name keeps its
 * hashed biome unless an earlier name in the list already took it.
 */
export function assignBiomes(names: readonly string[], pool: readonly BiomeName[] = BIOME_NAMES): BiomeName[] {
  const used = new Set<BiomeName>();
  return names.map((name) => {
    const h = hash(name);
    for (let i = 0; i < pool.length; i++) {
      const b = pool[(h + i) % pool.length];
      if (!used.has(b)) {
        used.add(b);
        return b;
      }
    }
    return pool[h % pool.length];
  });
}

/** Scene configuration for a biome. */
export interface BiomeConfig {
  name: BiomeName;
  /** Background colour (level 0). */
  bg: string;
  /** Whether the scene has a moon. */
  moon: boolean;
  /** Whether the scene has stars. */
  stars: boolean;
  /** Vegetation type. */
  vegetation: 'pine' | 'bamboo' | 'palm' | 'bare';
  /** Whether the scene has reeds/cattails. */
  reeds: boolean;
  /** Water tint multiplier (0-1, higher = lighter). */
  waterTint: number;
  /** Fog density (0-1, higher = more fog). */
  fog: number;
}

export const BIOME_CONFIGS: Record<BiomeName, BiomeConfig> = {
  night: {
    name: 'night',
    bg: '#080c18',
    moon: true,
    stars: true,
    vegetation: 'pine',
    reeds: true,
    waterTint: 0.3,
    fog: 0,
  },
  bamboo: {
    name: 'bamboo',
    bg: '#0a120c',
    moon: false,
    stars: false,
    vegetation: 'bamboo',
    reeds: false,
    waterTint: 0.5,
    fog: 0.3,
  },
  oasis: {
    name: 'oasis',
    bg: '#1a0f08',
    moon: false,
    stars: false,
    vegetation: 'palm',
    reeds: false,
    waterTint: 0.7,
    fog: 0,
  },
  swamp: {
    name: 'swamp',
    bg: '#0c1014',
    moon: false,
    stars: false,
    vegetation: 'bare',
    reeds: true,
    waterTint: 0.4,
    fog: 0.6,
  },
};
