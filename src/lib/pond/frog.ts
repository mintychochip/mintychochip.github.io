import type { Field } from './field';
import { INK } from './palette';

// The frog from the profile picture: a round body turned three-quarters toward +x, big eyes on top, blush and
// a small smile, crouched with its near hind leg folded into a haunch, placed pixel by pixel at three sizes.
// Pupils, blinks, the throat sac and the tongue tip are drawn over the art so they can move.

/** o outline, D d g h skin from dark to light, b belly, w eye white, k pupil (redrawn from the look), p blush, m mouth. */
const LEGEND: Record<string, number> = {
  o: INK.line, m: INK.line, D: INK.deep, d: INK.shade, g: INK.skin, h: INK.light, b: INK.belly, w: INK.eye, k: INK.eye, p: INK.blush,
};

interface Art {
  sit: string;
  /** In the air: stretched, legs hanging. */
  stretch: string;
  /** Rows taken out of the sitting frame to breathe out, and to crouch; the crouch also widens at column `wide`. */
  breath: number[];
  crouch: number[];
  wide: number;
  pupil: readonly [number, number];
  /** The pupil's top corner pixel stays white, as a shine. */
  shine: boolean;
  /** Sitting-frame pixels: where the tongue leaves the mouth, the tongue tip poking out, the throat sac's centre and radius. */
  mouth: readonly [number, number];
  blep: readonly (readonly [number, number])[];
  throat: readonly [number, number, number];
  /** Rows that stay above the water while it swims. */
  swim: number;
}

const SMALL: Art = {
  sit: `
.............
...gg...gg...
...oo...oo...
..owwo.owwo..
..owkooowkoo.
.ogoogggoogo.
.ohgpggmmgpgo
ogggoggbbbbgo
odddgobbbbbgo
oDddogoggobgo
.oooooooooooo`,
  stretch: `
.............
...gg...gg...
...oo...oo...
..owwo.owwo..
..owkooowkoo.
.ogoogggoogo.
.ohgpggmmgpgo
.odggggggbbgo
.oddddgbbbbgo
..oDddbbbbgo.
..oDooooooogo
.odo......oo.
.oo..........`,
  breath: [7], crouch: [7], wide: 6,
  pupil: [1, 1], shine: false,
  mouth: [8, 6], blep: [[8, 7]], throat: [10.5, 8, 1.9],
  swim: 6,
};

const MEDIUM: Art = {
  sit: `
...................
...ggg....ggg......
.....oooo..oooo....
....owwwwo.owwwwo..
....owkkwooowkkwo..
...oowkkwogowkkwoo.
..ogowwwwogowwwwogo
.ohhgoooogggooooggo
.ohggpggggmmggggpgo
.oggggggggggggbbbgo
ogggoooggggbbbbbbgo
odgohhhogbbbbbbbbgo
oDdggggdobbbbbbbbgo
oDddddddobbbooobbgo
.oDDdddogogogggogo.
..ooooooooooooooo..`,
  stretch: `
...................
...ggg....ggg......
.....oooo..oooo....
....owwwwo.owwwwo..
....owkkwooowkkwo..
...oowkkwogowkkwoo.
..ogowwwwogowwwwogo
.ohhgoooogggooooggo
.ohggpggggmmggggpgo
.oggggggggggggbbbgo
.odggggggggbbbbbbgo
.oddggggdgbbbbbbgo.
..oddddgdbbbbbbbgo.
..oDdddoobbbbbbgo..
..oDddo.ooooooogo..
.oDdo.........ogo..
.oggo.........oo...
.ooo...............`,
  breath: [9], crouch: [9, 12], wide: 10,
  pupil: [2, 2], shine: false,
  mouth: [11, 8], blep: [[10, 9], [11, 9]], throat: [15.5, 10, 2.9],
  swim: 8,
};

const LARGE: Art = {
  sit: `
........................
....gggg......gggg......
........ooo.....ooo.....
.......owwwo...owwwo....
......owwkkwo.owwkkwo...
......owkkkwooowkkkwo...
......owkkkwogowkkkwo...
....oogowwwogggowwwogo..
...ogggoooogggggooogggo.
..oghhggggggggggggggggo.
.oghgggpggggmggggmgpggo.
.ogggggggggggmmmmggggggo
ogggggggggggggggggbbbggo
ogggooooggggggbbbbbbbggo
odgohhhhogggbbbbbbbbbggo
oddghhgggogbbbbbbbbbbggo
oDdgggggggobbbbbbbbbbggo
oDddggggggobbbbooobbbggo
.oDdddddddoggbogggobbggo
..oDDddddogogoggoggooggo
...oooooooooooooooooooo.`,
  stretch: `
........................
....gggg......gggg......
........ooo.....ooo.....
.......owwwo...owwwo....
......owwkkwo.owwkkwo...
......owkkkwooowkkkwo...
......owkkkwogowkkkwo...
....oogowwwogggowwwogo..
...ogggoooogggggooogggo.
..oghhggggggggggggggggo.
.oghgggpggggmggggmgpggo.
.ogggggggggggmmmmggggggo
.oggggggggggggggggbbbggo
.odgggggggggggbbbbbbbggo
..odggggggdgbbbbbbbbbgo.
..oddgggggdgbbbbbbbbbgo.
..oddddgggdbbbbbbbbbgo..
...oddddddobbbbbbbbbgo..
...oDddddoobbbbbbbbgo...
...oDdddo.ooobbbooggo...
..oDddo.....ooo.oggo....
..oddo..........ogo.....
.ogggo..........oo......
.ooooo..................`,
  breath: [12], crouch: [12, 16], wide: 13,
  pupil: [3, 3], shine: true,
  mouth: [15, 11], blep: [[14, 12], [15, 12], [14, 13]], throat: [19.5, 14.5, 4.2],
  swim: 9,
};

const ARTS = [SMALL, MEDIUM, LARGE];

export type Frame = 'sit' | 'breath' | 'crouch' | 'stretch';

interface Eye { x0: number; y0: number; w: number; h: number; mask: Uint8Array }

interface Sprite {
  w: number;
  h: number;
  /** Colour + 1 per pixel, 0 where clear. */
  px: Uint8Array;
  eyes: Eye[];
  mouth: [number, number];
  blep: [number, number][];
  throat: [number, number];
}

type Point = readonly [number, number];

function sprite(rows: string[], at: { mouth: Point; blep: readonly Point[]; throat: readonly number[] }): Sprite {
  const h = rows.length, w = rows[0].length;
  const px = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    if (rows[y].length !== w) throw new Error(`frog art row ${y} is ${rows[y].length} wide, not ${w}`);
    for (let x = 0; x < w; x++) {
      const c = LEGEND[rows[y][x]];
      if (c !== undefined) px[y * w + x] = c + 1;
    }
  }
  const eyes: Eye[] = [];
  const seen = new Uint8Array(w * h);
  const isEye = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && 'wk'.includes(rows[y][x]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!isEye(x, y) || seen[y * w + x]) continue;
    const cells: [number, number][] = [], stack: [number, number][] = [[x, y]];
    seen[y * w + x] = 1;
    while (stack.length) {
      const [cx, cy] = stack.pop()!;
      cells.push([cx, cy]);
      for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
        if (isEye(nx, ny) && !seen[ny * w + nx]) { seen[ny * w + nx] = 1; stack.push([nx, ny]); }
      }
    }
    const x0 = Math.min(...cells.map((c) => c[0])), y0 = Math.min(...cells.map((c) => c[1]));
    const ew = Math.max(...cells.map((c) => c[0])) - x0 + 1, eh = Math.max(...cells.map((c) => c[1])) - y0 + 1;
    const mask = new Uint8Array(ew * eh);
    for (const [cx, cy] of cells) mask[(cy - y0) * ew + cx - x0] = 1;
    eyes.push({ x0, y0, w: ew, h: eh, mask });
  }
  return { w, h, px, eyes, mouth: [...at.mouth], blep: at.blep.map((p) => [...p]), throat: [at.throat[0], at.throat[1]] };
}

const lines = (art: string) => art.trim().split('\n');

/** The sitting frame with rows taken out and, optionally, one column doubled; its marked points move along. */
function squash(rows: string[], a: Art, drop: number[], wide = -1) {
  const out = rows.filter((_, y) => !drop.includes(y)).map((r) => (wide >= 0 ? r.slice(0, wide) + r[wide] + r.slice(wide) : r));
  const move = ([x, y]: Point): [number, number] => [x + (wide >= 0 && x >= wide ? 1 : 0), y - drop.filter((d) => d < y).length];
  return sprite(out, { mouth: move(a.mouth), blep: a.blep.map(move), throat: move([a.throat[0], a.throat[1]]) });
}

interface Size {
  frames: Record<Frame, Sprite>;
  art: Art;
}

const SIZES: Size[] = ARTS.map((a) => {
  const sit = lines(a.sit);
  return {
    art: a,
    frames: {
      sit: sprite(sit, a),
      breath: squash(sit, a, a.breath),
      crouch: squash(sit, a, a.crouch, a.wide),
      stretch: sprite(lines(a.stretch), a),
    },
  };
});

/**
 * Which drawing to use for a frog at scale `s` (art pixels per unit of a frog about 9 units tall):
 * 0 small, 1 medium, 2 large.
 */
export const sizeFor = (s: number) => (s < 1.22 ? 0 : s < 1.78 ? 1 : 2);

/** Width and height of the sitting frog, its eyes' height above its feet, and how much of it shows when swimming. */
export function frogBox(size: number) {
  const { frames, art } = SIZES[size], S = frames.sit;
  const e = S.eyes[0];
  return { w: S.w, h: S.h, eye: S.h - (e.y0 + e.h / 2), swim: art.swim };
}

export interface FrogFace {
  /** Where the pupils point, -1..1 on each axis, +x being the way the frog faces. */
  look?: readonly [number, number];
  eyes?: 'open' | 'shut' | 'happy';
  /** Startled: small pupils. */
  wide?: boolean;
  /** Throat sac size, 0..1. */
  sac?: number;
  /** Tongue tip poking out. */
  blep?: boolean;
}

export type FrogKind = 'green' | 'pink';

export interface FrogDraw {
  mirror?: boolean;
  /** Rows from here down are not drawn (under water). */
  clipY?: number;
  kind?: FrogKind;
}

/** Body pixels in the sprite use green ink slots 0–5; map them for the pink girlfriend. */
const PINK_BODY = [INK.pinkLine, INK.pinkDeep, INK.pinkShade, INK.pinkSkin, INK.pinkLight, INK.pinkBelly] as const;

function mapBodyInk(c: number, kind: FrogKind) {
  if (kind === 'green' || c > INK.belly) return c;
  return PINK_BODY[c];
}

/** Rows of forehead art above the eyes (must match sit / stretch strings). */
const FOREHEAD_ROWS = 2;

/**
 * Small tilted hair bow (+x = near side). dx/dy from the top forehead row; ~5–7 px wide, not a brow stripe.
 */
const BOW: Record<number, readonly (readonly [number, number, number])[]> = {
  0: [
    [-2, 0, INK.bowFold], [-1, 0, INK.bow],
    [0, 1, INK.bowKnot],
    [1, 0, INK.bowLight], [2, 0, INK.bow],
    [3, 3, INK.bow], [3, 4, INK.bowFold],
  ],
  1: [
    [-2, -1, INK.bow], [-1, 0, INK.bowFold],
    [0, 0, INK.bowKnot],
    [1, -1, INK.bowLight], [2, 0, INK.bow],
    [3, 2, INK.bow], [4, 3, INK.bowKnot], [4, 4, INK.bowFold],
  ],
  2: [
    [-2, -1, INK.bow], [-1, -1, INK.bowLight],
    [0, 0, INK.bowKnot],
    [1, -1, INK.bowLight], [2, -1, INK.bow],
    [3, 2, INK.bow], [4, 3, INK.bowKnot], [5, 4, INK.bowFold],
  ],
};

function bowAnchor(S: Sprite): [number, number] | null {
  if (!S.eyes.length) return null;
  let left = S.eyes[0], right = S.eyes[0];
  for (const e of S.eyes) {
    if (e.x0 < left.x0) left = e;
    if (e.x0 + e.w > right.x0 + right.w) right = e;
  }
  const eyeTop = Math.min(...S.eyes.map((e) => e.y0));
  const cx = (left.x0 + left.w / 2 + right.x0 + right.w / 2) / 2 + 0.5;
  return [Math.round(cx), Math.max(0, eyeTop - FOREHEAD_ROWS)];
}

function onEyeBlob(S: Sprite, i: number, j: number) {
  for (const e of S.eyes) if (inEye(e, i, j)) return true;
  return false;
}

function drawBow(S: Sprite, size: number, mirror: boolean, put: (i: number, j: number, c: number) => void) {
  const at = bowAnchor(S);
  const parts = BOW[size];
  if (!at || !parts) return;
  const [cx, top] = at;
  for (const [dx, dy, c] of parts) {
    const sx = mirror ? -dx : dx;
    const i = cx + sx, j = top + dy;
    if (!onEyeBlob(S, i, j)) put(i, j, c);
  }
}

const place = (S: Sprite, x: number, y: number) => [Math.round(x - S.w / 2), Math.round(y) - S.h] as const;

/** Where the tongue leaves the mouth, for a frog drawn with its feet at (x, y). */
export function mouthAt(size: number, frame: Frame, x: number, y: number, mirror = false): [number, number] {
  const S = SIZES[size].frames[frame];
  const [left, top] = place(S, x, y);
  const mx = mirror ? S.w - 1 - S.mouth[0] : S.mouth[0];
  return [left + mx + 0.5, top + S.mouth[1] + 0.5];
}

const inEye = (e: Eye, x: number, y: number) => x >= e.x0 && y >= e.y0 && x < e.x0 + e.w && y < e.y0 + e.h && e.mask[(y - e.y0) * e.w + x - e.x0] === 1;

/** Draws the frog with its feet at (x, y): its bottom row sits just above y. */
export function drawFrog(F: Field, size: number, frame: Frame, face: FrogFace, x: number, y: number, o: FrogDraw = {}) {
  const { frames, art } = SIZES[size];
  const S = frames[frame];
  const kind = o.kind ?? 'green';
  const [left, top] = place(S, x, y);
  const clip = o.clipY ?? Infinity;
  const put = (i: number, j: number, c: number) => {
    const Y = top + j;
    if (Y < clip) F.paint(left + (o.mirror ? S.w - 1 - i : i), Y, c);
  };

  for (let j = 0; j < S.h; j++) for (let i = 0; i < S.w; i++) {
    const c = S.px[j * S.w + i];
    if (c) put(i, j, mapBodyInk(c - 1, kind));
  }

  const eyes = face.eyes ?? 'open';
  const [lx, ly] = face.look ?? [0, 0];
  const [pw, ph] = face.wide ? [Math.max(1, art.pupil[0] - 1), Math.max(1, art.pupil[1] - 1)] : art.pupil;
  for (const e of S.eyes) {
    if (eyes !== 'open') {
      const mid = e.y0 + (e.h >> 1);
      for (let j = e.y0; j < e.y0 + e.h; j++) for (let i = e.x0; i < e.x0 + e.w; i++) if (inEye(e, i, j)) put(i, j, kind === 'pink' ? INK.pinkSkin : INK.skin);
      for (let i = e.x0; i < e.x0 + e.w; i++) {
        const j = eyes === 'happy' && i > e.x0 && i < e.x0 + e.w - 1 ? mid - 1 : mid;
        if (inEye(e, i, j)) put(i, j, INK.line);
      }
      continue;
    }
    const cx = e.x0 + (e.w - pw) / 2, cy = e.y0 + (e.h - ph) / 2;
    let best = Infinity, bx = 0, by = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const px = Math.floor(cx + dx + 0.5), py = Math.floor(cy + dy + 0.5);
      let fits = true;
      for (let j = 0; j < ph && fits; j++) for (let i = 0; i < pw; i++) if (!inEye(e, px + i, py + j)) { fits = false; break; }
      const score = (dx - lx) ** 2 + (dy - ly) ** 2;
      if (fits && score < best - 1e-9) { best = score; bx = px; by = py; }
    }
    if (best === Infinity) continue;
    for (let j = 0; j < ph; j++) for (let i = 0; i < pw; i++) put(bx + i, by + j, INK.line);
    if (art.shine && !face.wide) put(bx, by, INK.eye);
  }

  if (kind === 'pink') drawBow(S, size, !!o.mirror, put);

  if (face.blep) for (const [i, j] of S.blep) put(i, j, INK.tongue);

  const r = art.throat[2] * (face.sac ?? 0);
  if (r >= 1.2) {
    const [tx, ty] = S.throat;
    const inSac = (i: number, j: number) => Math.hypot(i + 0.5 - tx, j + 0.5 - ty) <= r;
    for (let j = Math.floor(ty - r); j <= Math.ceil(ty + r); j++) for (let i = Math.floor(tx - r); i <= Math.ceil(tx + r); i++) {
      if (!inSac(i, j)) continue;
      const edge = !inSac(i + 1, j) || !inSac(i - 1, j) || !inSac(i, j + 1) || !inSac(i, j - 1);
      put(i, j, edge ? INK.line : j > ty + r * 0.35 ? INK.belly : INK.eye);
    }
  }
}
