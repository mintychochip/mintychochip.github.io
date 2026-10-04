import type { Field } from './field';
import { INK } from './palette';
import { toon, type Band, type Light, type Shape, type Stroke } from './toon';

// The frog from the profile picture: chubby, seen three-quarter on, eyes perched on top, hands up in
// front of its chest. Sprite units, y down; the origin is where it sits on its pad, and it faces +x.

/** Every pose names the same parts, so any two poses blend part by part. */
export interface Pose {
  /** Ellipses: x, y, rx, ry, angle. */
  belly: number[];
  head: number[];
  /** Near eye x, y, then far eye x, y. */
  eyes: number[];
  /** Shoulder, elbow, wrist. */
  nearArm: number[];
  /** Shoulder, wrist. */
  farArm: number[];
  /** Hip, ankle. */
  nearLeg: number[];
  farLeg: number[];
  /** Near x, y, angle, then far x, y, angle. Fingers and toes fan out along the angle. */
  hands: number[];
  feet: number[];
}

export const SIT: Pose = {
  belly: [0.0, -3.2, 4.0, 3.2, 0],
  head: [0.6, -6.5, 3.6, 2.0, -0.05],
  eyes: [2.6, -7.95, -2.4, -8.15],
  nearArm: [3.5, -4.8, 3.9, -3.0, 2.3, -3.7],
  farArm: [-3.6, -4.2, -2.6, -4.2],
  nearLeg: [3.1, -1.5, 3.7, -0.55],
  farLeg: [-3.0, -0.9, -4.3, -0.85],
  hands: [1.6, -3.9, Math.PI, -1.95, -4.15, 0],
  feet: [4.25, -0.45, 0.15, -4.85, -1.15, -2.6],
};

/** Gathered to jump: low and wide, hands on the pad. */
export const CROUCH: Pose = {
  belly: [0.0, -2.3, 4.5, 2.35, 0],
  head: [0.9, -5.15, 3.75, 1.85, 0.02],
  eyes: [3.0, -6.65, -2.0, -6.8],
  nearArm: [3.5, -3.6, 4.6, -2.1, 4.6, -0.7],
  farArm: [-3.4, -3.2, -2.9, -0.9],
  nearLeg: [3.1, -1.2, 3.9, -0.45],
  farLeg: [-3.2, -0.7, -4.8, -0.7],
  hands: [5.1, -0.45, 0.2, -2.9, -0.45, 2.9],
  feet: [4.4, -0.4, 0.1, -5.35, -1.0, -2.65],
};

/** In the air: stretched out, hands reaching ahead, legs trailing. */
export const LEAP: Pose = {
  belly: [-0.9, -3.4, 4.3, 2.2, -0.1],
  head: [2.2, -4.8, 3.05, 1.8, -0.1],
  eyes: [3.35, -6.25, 0.5, -6.5],
  nearArm: [2.4, -2.6, 4.3, -2.1, 5.6, -1.7],
  farArm: [1.3, -3.0, 5.0, -2.6],
  nearLeg: [-3.0, -2.6, -6.8, -1.9],
  farLeg: [-3.5, -3.7, -6.7, -3.6],
  hands: [6.1, -1.55, 0.25, 5.5, -2.5, 0.15],
  feet: [-7.3, -1.8, 3.2, -7.2, -3.6, -3.05],
};

/** Touching down hands first, legs still behind. */
export const LAND: Pose = {
  belly: [-0.4, -2.45, 4.4, 2.4, 0.05],
  head: [1.9, -4.85, 3.25, 1.8, 0.08],
  eyes: [3.2, -6.3, -0.3, -6.55],
  nearArm: [2.4, -2.9, 4.0, -1.8, 4.5, -0.7],
  farArm: [0.6, -3.3, 2.5, -0.85],
  nearLeg: [-2.7, -1.8, -5.3, -1.0],
  farLeg: [-3.1, -2.6, -5.5, -2.2],
  hands: [4.9, -0.45, 0.2, 2.9, -0.45, 0.3],
  feet: [-5.9, -0.9, 3.2, -6.1, -2.1, -3.1],
};

export function mixPose(a: Pose, b: Pose, u: number): Pose {
  const out = {} as Pose;
  for (const key of Object.keys(a) as (keyof Pose)[]) out[key] = a[key].map((v, i) => v + (b[key][i] - v) * u);
  return out;
}

/** A point on the head, given in the sitting head's frame, so it follows the head through every pose. */
function onHead(head: readonly number[], u: number, v: number): [number, number] {
  const [x, y, rx, ry, a] = head;
  const U = (u * rx) / SIT.head[2], V = (v * ry) / SIT.head[3];
  return [x + U * Math.cos(a) - V * Math.sin(a), y + U * Math.sin(a) + V * Math.cos(a)];
}

/** The smirk: from under the far eye, dipping across the face, curling up below the near eye. */
const MOUTH: readonly [number, number][] = [[-2.8, 0.5], [-1.4, 1.0], [0.2, 1.0], [1.4, 0.6], [1.9, 0.2]];

/** Where the tongue leaves the mouth, in sprite units. */
export const mouthOf = (pose: Pose) => onHead(pose.head, 1.9, 0.3);

export interface FrogLook {
  /** Where the pupils point, -1..1 on each axis, +x being the way the frog faces. */
  look?: readonly [number, number];
  /** 1 shuts the eyes. */
  lid?: number;
  /** Throat sac size, 0..1. */
  sac?: number;
  /** Breathing, -1..1. */
  breath?: number;
  /** Fingertips drawn together, 0..1. */
  tap?: number;
  /** Round, startled pupils instead of the usual unimpressed dashes. */
  wide?: boolean;
}

export interface FrogDraw {
  ang?: number;
  sx?: number;
  mirror?: boolean;
  clipY?: number;
}

/** From this scale up, hands and feet get webbed fingers; below it, mitts with fingertip bumps. */
const FINE = 3.2;
/** Below this scale the fingertip bumps go too, as they would only flicker. */
const TIPS = 2.2;
/** Below this scale only the eyes keep contour lines. */
const LINED = 3.2;

const SKIN: Band = [INK.web, INK.skin, INK.light];
/** Hands held up in front catch more light than the body behind them. */
const PAW: Band = [INK.skin, INK.light, INK.light];
const WEB: Band = [INK.deep, INK.web, INK.web];
const EYE: Band = [INK.eyeShade, INK.eye, INK.eye];
const SAC: Band = [INK.skin, INK.light, INK.eye];

const BODY = 0, NEAR_ARM = 1, FAR_ARM = 2, NEAR_LEG = 3, FAR_LEG = 4, NEAR_EYE = 5, FAR_EYE = 6, THROAT = 7;

/** A hand or foot at (x, y) with three fingers fanned out along angle `a`. */
function paw(out: Shape[], x: number, y: number, a: number, group: number, z: number, len: number, s: number, band = SKIN) {
  const c = Math.cos(a), sn = Math.sin(a);
  if (s >= FINE) {
    out.push({ ell: [x + 0.5 * len * c, y + 0.5 * len * sn, 0.55 * len, 0.62 * len, a], band: WEB, group, z });
    out.push({ ell: [x - 0.05 * c, y - 0.05 * sn, 0.42, 0.42, 0], band: SKIN, group, z: z + 0.05 });
    for (const d of [-0.62, 0, 0.62]) {
      out.push({ cap: [x, y, x + len * Math.cos(a + d), y + len * Math.sin(a + d), 0.18, 0.32], band: SKIN, group, z: z + 0.1 });
    }
    return;
  }
  out.push({ ell: [x + 0.3 * len * c, y + 0.3 * len * sn, 0.7 * len, 0.55 * len, a], band, group, z });
  if (s < TIPS) return;
  out.push({ ell: [x + 0.75 * len * c, y + 0.75 * len * sn, 0.35, 0.35, 0], band: WEB, group, z: z + 0.05 });
  for (const d of [-0.68, 0, 0.68]) {
    out.push({ ell: [x + len * Math.cos(a + d), y + len * Math.sin(a + d), 0.34, 0.34, 0], band, group, z: z + 0.1 });
  }
}

/** Draws the frog with its feet at (cx, cy), `s` art pixels per sprite unit. */
export function drawFrog(F: Field, pose: Pose, o: FrogLook, cx: number, cy: number, s: number, L: Light, d: FrogDraw = {}) {
  const br = o.breath ?? 0, tap = o.tap ?? 0, sac = o.sac ?? 0;
  const shut = (o.lid ?? 0) >= 0.75;
  const [bx, by, brx, bry, ba] = pose.belly;
  const [nex, ney, fex, fey] = pose.eyes;
  const na = pose.nearArm, fa = pose.farArm, h = pose.hands, ft = pose.feet;
  const eye = shut ? SKIN : EYE;

  const shapes: Shape[] = [];
  shapes.push({ cap: [...pose.farLeg, 0.75, 0.45], band: SKIN, group: FAR_LEG });
  paw(shapes, ft[3], ft[4], ft[5], FAR_LEG, 0.1, 1.1, s);
  shapes.push({ ell: [fex, fey, 0.88, 0.88, 0], band: eye, group: FAR_EYE, z: 0.2, keep: true });
  shapes.push({ ell: [bx, by - 0.08 * br, brx * (1 + 0.015 * br), bry * (1 + 0.035 * br), ba], band: SKIN, group: BODY });
  shapes.push({ ell: pose.head, band: SKIN, group: BODY, z: 0.4 });
  shapes.push({ cap: [fa[0], fa[1], fa[2] + 0.4 * tap, fa[3], 1.0, 0.55], band: SKIN, group: FAR_ARM, z: 0.6 });
  paw(shapes, h[3] + 0.45 * tap, h[4], h[5], FAR_ARM, 0.8, 1.05, s, PAW);
  shapes.push({ cap: [...pose.nearLeg, 0.9, 0.5], band: SKIN, group: NEAR_LEG, z: 0.6 });
  paw(shapes, ft[0], ft[1], ft[2], NEAR_LEG, 0.8, 1.15, s);
  shapes.push({ cap: [na[0], na[1], na[2], na[3], 0.75, 0.6], band: SKIN, group: NEAR_ARM, z: 0.9 });
  shapes.push({ cap: [na[2], na[3], na[4] - 0.5 * tap, na[5], 0.6, 0.5], band: SKIN, group: NEAR_ARM, z: 1.0 });
  paw(shapes, h[0] - 0.55 * tap, h[1], h[2], NEAR_ARM, 1.1, 1.1, s, PAW);
  shapes.push({ ell: [nex, ney, 1.55, 1.25, 0], band: eye, group: NEAR_EYE, z: 1.2, outer: true, keep: true });
  if (sac > 0.08) {
    const [qx, qy] = onHead(pose.head, 0.9, 1.55);
    shapes.push({ ell: [qx, qy + 0.3 * sac, 1.9 * sac, 1.45 * sac, 0], band: SAC, group: THROAT, z: 1.5, keep: true });
  }

  const strokes: Stroke[] = [{ pts: MOUTH.flatMap(([u, v]) => onHead(pose.head, u, v)), color: INK.line, on: BODY }];
  const [lx, ly] = o.look ?? [0.5, 0];
  if (shut) {
    strokes.push({ pts: [nex - 1.1, ney + 0.15, nex + 1.1, ney + 0.15], color: INK.line, on: NEAR_EYE });
    strokes.push({ pts: [fex - 0.8, fey + 0.15, fex + 0.7, fey + 0.15], color: INK.line, on: FAR_EYE });
  } else if (o.wide) {
    strokes.push({ pts: [nex + 0.4 * lx, ney + 0.3 * ly], color: INK.line, bold: s >= 1.8, on: NEAR_EYE });
    strokes.push({ pts: [fex - 0.3 + 0.3 * lx, fey - 0.1 + 0.25 * ly], color: INK.line, on: FAR_EYE });
  } else {
    const px = nex + 0.38 * lx, py = ney + 0.3 * ly;
    strokes.push({ pts: [px - 0.55, py, px + 0.55, py], color: INK.line, on: NEAR_EYE });
    const qx = fex - 0.35 + 0.3 * lx, qy = fey - 0.1 + 0.25 * ly;
    strokes.push({ pts: [qx - 0.32, qy, qx + 0.32, qy], color: INK.line, on: FAR_EYE });
  }
  toon(F, shapes, strokes, cx, cy, s, L, { line: INK.line, seam: INK.deep, ...d, contours: s >= LINED });
}
