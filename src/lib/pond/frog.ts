import type { Mark, Part } from './sprite';

// Side-view frog. Units are art pixels at scale 1; the origin is where the frog meets its pad.
// Part order is shared by every pose so poses can be blended part by part.
// Tones are fractions of an 8-level palette: 4/7 is the back, 6/7 the belly.
export const BODY = 0, HEAD = 1, THIGH = 2, SHIN = 3, ARM = 4, HAND = 5, EYE = 6;
/** Seam groups: a part outlines itself where it overlaps another group (the throat joins the body). */
export const GROUPS = [0, 0, 1, 2, 3, 3, 4, 0];

const BACK = 4 / 7, LIMB = 3.7 / 7, FOOT = 3.5 / 7, EYEBALL = 5.6 / 7;

export const SIT: Part[] = [
  [0.2, -2.3, 3.2, 2.0, -0.35, BACK, 0],
  [2.7, -3.45, 2.2, 1.5, -0.1, BACK, 0.1],
  [-1.7, -1.5, 2.5, 2.0, 0, LIMB, 0.3],
  [-0.6, -0.45, 2.3, 0.7, 0.08, FOOT, 0.6],
  [2.1, -0.85, 0.6, 1.3, 0.2, LIMB, 0.5],
  [2.7, -0.15, 0.95, 0.35, 0, FOOT, 0.6],
  [2.3, -4.85, 1.05, 1.05, 0, EYEBALL, 0.5],
];

export const CROUCH: Part[] = [
  [0.0, -1.85, 3.3, 1.7, -0.25, BACK, 0],
  [2.7, -2.85, 2.2, 1.4, 0.05, BACK, 0.1],
  [-1.9, -1.25, 2.6, 1.75, -0.05, LIMB, 0.3],
  [-0.7, -0.4, 2.4, 0.65, 0.05, FOOT, 0.6],
  [2.2, -0.6, 0.6, 1.0, 0.35, LIMB, 0.5],
  [2.8, -0.15, 0.95, 0.35, 0, FOOT, 0.6],
  [2.3, -4.2, 1.05, 1.0, 0, EYEBALL, 0.5],
];

export const LEAP: Part[] = [
  [0.0, -2.5, 3.7, 1.6, -0.05, BACK, 0],
  [3.1, -3.1, 2.1, 1.35, 0.05, BACK, 0.1],
  [-3.6, -2.0, 2.3, 0.95, 0.4, LIMB, 0.3],
  [-6.3, -1.0, 2.5, 0.5, 0.15, FOOT, 0.6],
  [3.4, -1.7, 0.5, 1.15, -0.7, LIMB, 0.5],
  [4.4, -1.0, 0.8, 0.3, 0.3, FOOT, 0.6],
  [2.7, -4.35, 1.0, 0.95, 0, EYEBALL, 0.5],
];

export const LAND: Part[] = [
  [0.0, -2.0, 3.4, 1.75, 0.08, BACK, 0],
  [2.8, -2.6, 2.1, 1.45, 0.12, BACK, 0.1],
  [-2.6, -1.6, 2.4, 1.3, 0.25, LIMB, 0.3],
  [-3.6, -0.5, 2.4, 0.6, 0.1, FOOT, 0.6],
  [3.0, -0.8, 0.55, 1.25, -0.15, LIMB, 0.5],
  [3.6, -0.15, 1.0, 0.35, 0, FOOT, 0.6],
  [2.4, -4.05, 1.05, 1.0, 0, EYEBALL, 0.5],
];

/** Marks ride on a parent part: [parent, ...Mark] with coordinates taken in the SIT pose. */
type Attached = [number, number, number, number, number, number, number, number?];

const BELLY: Attached = [BODY, 1.7, -1.3, 1.9, 0.85, -0.3, 6 / 7];
const SPOTS: Attached[] = [
  [BODY, -1.2, -3.2, 0.6, 0.4, -0.3, 3 / 7],
  [THIGH, -2.3, -1.9, 0.5, 0.4, 0, 2.8 / 7],
];
const MOUTH: Attached = [HEAD, 3.3, -2.9, 1.6, 0.22, -0.1, 1 / 7, 1];
const PUPIL: Attached = [EYE, 2.3, -4.85, 0.62, 0.4, 0, 0, 1];
const GLEAM: Attached = [EYE, 1.95, -5.3, 0.3, 0.3, 0, 1, 1];
const LID: Attached = [EYE, 2.3, -4.85, 1.12, 1.12, 0, BACK];
const HALF_LID: Attached = [EYE, 2.3, -5.35, 1.12, 0.62, 0, BACK];

export function mixPose(a: readonly Part[], b: readonly Part[], u: number): Part[] {
  if (u <= 0) return a.map((p) => [...p] as Part);
  if (u >= 1) return b.map((p) => [...p] as Part);
  return a.map((p, i) => p.map((v, j) => v + (b[i][j] - v) * u) as Part);
}

export interface FrogLook {
  /** Pupil offset toward what the frog is watching, each axis -1..1. */
  look?: [number, number];
  /** 0 open, 0.5 half shut, 1 shut. */
  lid?: number;
  /** Vocal sac size, 0 = none. */
  sac?: number;
  /** Throat flutter, 0..1. */
  throat?: number;
  /** Breathing, -1..1. */
  breath?: number;
}

/** Final parts and marks for one frame of a frog in `pose`. */
export function dress(pose: readonly Part[], o: FrogLook = {}): { parts: Part[]; marks: Mark[] } {
  const parts = pose.map((p) => [...p] as Part);
  if (o.breath) {
    parts[BODY][3] *= 1 + 0.045 * o.breath;
    parts[BODY][1] -= 0.06 * o.breath;
  }
  const head = parts[HEAD];
  const sac = o.sac ?? 0, throat = o.throat ?? 0;
  if (sac > 0.08) {
    parts.push([head[0] + 0.5, head[1] + 1.45, 1.75 * sac, 1.4 * sac, 0, 6.3 / 7, 0.9]);
  } else if (throat > 0) {
    parts.push([head[0] + 0.25, head[1] + 1.25, 0.9 + 0.25 * throat, 0.62 + 0.22 * throat, 0, 6 / 7, 0.35]);
  }
  const at = ([parent, lx, ly, rx, ry, la, tone, flat]: Attached): Mark => {
    const dx = parts[parent][0] - SIT[parent][0], dy = parts[parent][1] - SIT[parent][1];
    return [lx + dx, ly + dy, rx, ry, la, tone, flat];
  };
  const marks: Mark[] = [at(BELLY), ...SPOTS.map(at), at(MOUTH)];
  const lid = o.lid ?? 0;
  if (lid >= 0.75) {
    marks.push(at(LID));
  } else {
    const [lx, ly] = o.look ?? [0.5, 0];
    const p = at(PUPIL);
    p[0] += 0.42 * lx;
    p[1] += 0.32 * ly;
    marks.push(p, at(GLEAM));
    if (lid >= 0.3) marks.push(at(HALF_LID));
  }
  return { parts, marks };
}
