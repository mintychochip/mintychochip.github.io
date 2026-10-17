/**
 * Hand-placed pixel sprites for the anniversary vault, in the pond's art-pixel style. Each character is
 * one art pixel: '.' is clear and every other character names a colour in the sprite's ink map.
 * `PixelArt.svelte` draws them as crisp SVG at the site's 3 CSS px per art pixel.
 */

export interface Sprite {
  readonly rows: readonly string[];
  /** CSS colour per character. */
  readonly ink: Readonly<Record<string, string>>;
}

function sprite(art: string, ink: Record<string, string>): Sprite {
  const rows = art
    .trim()
    .split('\n')
    .map((row) => row.trim());
  const w = rows[0].length;
  rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`sprite row ${y} is ${row.length} wide, not ${w}`);
    for (const ch of row) if (ch !== '.' && !(ch in ink)) throw new Error(`sprite colour "${ch}" has no ink`);
  });
  return { rows, ink };
}

/** One SVG path per colour, built from horizontal runs of that colour. */
export function spritePaths(s: Sprite): { fill: string; d: string }[] {
  const runs = new Map<string, string>();
  s.rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      if (ch !== '.') runs.set(ch, (runs.get(ch) ?? '') + `M${x} ${y}h${end - x}v1h${x - end}z`);
      x = end;
    }
  });
  return [...runs].map(([ch, d]) => ({ fill: s.ink[ch], d }));
}

const LOVE = 'var(--love)';
const LOVE_LIGHT = '#ffc4da';
const LOVE_DEEP = '#d65a8f';

export const HEART = sprite(
  `
  .xx.xx.
  xhxxxxx
  xxxxxxx
  .xxxxx.
  ..xxx..
  ...x...
  `,
  { x: LOVE, h: LOVE_LIGHT },
);

type Put = (x: number, y: number, c: string) => void;

/** A sprite painted by code onto a w × h grid, for shapes that are easier to describe than to type out. */
function painted(w: number, h: number, ink: Record<string, string>, paint: (put: Put) => void): Sprite {
  const grid = Array.from({ length: h }, () => Array<string>(w).fill('.'));
  paint((x, y, c) => {
    if (x >= 0 && y >= 0 && x < w && y < h) grid[y][x] = c;
  });
  return { rows: grid.map((row) => row.join('')), ink };
}

/** The small heart the envelope and the jar use, five pixels wide. */
const SMALL_HEART = ['.x.x.', 'xxxxx', '.xxx.', '..x..'];

function stamp(put: Put, art: readonly string[], x0: number, y0: number, c: string) {
  art.forEach((row, j) => [...row].forEach((ch, i) => ch === 'x' && put(x0 + i, y0 + j, c)));
}

/** Lily-pad greens that hold up on cream paper as well as on the night page. */
const PAD_INK = { d: '#173b35', g: '#2f7a66', l: '#4f9a70', h: '#8bbf73', v: '#256452' };

/**
 * A lily pad as the ponds draw them: an ellipse lit from the top left, with veins and the wedge cut toward the
 * bank (`notch` picks the side).
 */
function paintPad(put: Put, x0: number, y0: number, w: number, h: number, notch: 1 | -1) {
  const cx = x0 + w / 2;
  const cy = y0 + h / 2;
  const at = (x: number, y: number) => [(x + 0.5 - cx) / (w / 2), (y + 0.5 - cy) / (h / 2)] as const;
  const solid = (x: number, y: number) => {
    const [u, v] = at(x, y);
    return u * u + v * v <= 1 && !(v > 0.1 && Math.abs(u - 0.25 * notch) < v * 0.35);
  };
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (!solid(x, y)) continue;
      const [u, v] = at(x, y);
      const d = Math.hypot(u, v);
      const edge = !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1);
      const vein = d > 0.25 && d < 0.8 && Math.abs(Math.sin(Math.atan2(v, u) * 3.5)) < 0.14;
      put(x, y, edge ? 'd' : v < 0 && !solid(x, y - 2) ? 'h' : vein ? 'v' : u < -0.15 && v < 0.25 ? 'l' : 'g');
    }
  }
}

/** The pad the two frogs share at the foot of the letter. */
export const LILY_SEAT = painted(46, 11, PAD_INK, (put) => paintPad(put, 0, 0, 46, 11, -1));

/** Bumpy's pad beside his puzzle. */
export const LILY_PAD = painted(32, 9, PAD_INK, (put) => paintPad(put, 0, 0, 32, 9, 1));

/**
 * The envelope's wax seal, pressed beside the signature: the same uneven pour and pressed heart, lit from the
 * top left.
 */
export const WAX_SEAL = painted(13, 13, { R: '#8f1248', W: '#d42a72', S: '#ff9cc6' }, (put) => {
  for (let y = 0; y < 13; y++) {
    for (let x = 0; x < 13; x++) {
      const dx = x - 6;
      const dy = y - 6;
      const a = Math.atan2(dy, dx);
      const r = 6.3 * (1 + 0.06 * Math.sin(3 * a + 1.7) + 0.04 * Math.sin(5 * a - 0.6));
      const d = Math.hypot(dx, dy);
      if (d > r) continue;
      put(x, y, d > r - 1 ? 'R' : Math.hypot(dx + 2.5, dy + 2.5) < 1.5 ? 'S' : 'W');
    }
  }
  stamp(put, SMALL_HEART, 4, 5, 'R');
});

/** Colours of the folded paper hearts in the jar, matched by the notes that come out of it. */
export const NOTE_TINTS = ['#fbefd9', LOVE, '#8bbf73'] as const;

/** Where the folded hearts sit in the jar, bottom first; the top one comes out first. */
const JAR_SLOTS: readonly (readonly [number, number])[] = [
  [4, 25], [10, 26], [16, 25], [7, 21], [13, 21], [4, 17], [10, 16], [16, 17],
];

/** A glass jar of folded paper hearts, holding `left` of them. */
export function jarSprite(left: number): Sprite {
  const ink = {
    o: '#a9bfc4',
    O: '#6f8b93',
    f: '#16203a',
    w: '#ffffff',
    c: '#d9a877',
    C: '#a8703f',
    p: LOVE,
    P: LOVE_DEEP,
    a: NOTE_TINTS[0],
    b: NOTE_TINTS[1],
    e: NOTE_TINTS[2],
  };
  return painted(26, 32, ink, (put) => {
    for (let y = 0; y < 4; y++) for (let x = 8; x < 18; x++) put(x, y, y === 3 || x === 17 ? 'C' : 'c');
    for (let x = 6; x < 20; x++) put(x, 4, 'o');
    // Glass from the neck down, widening at the shoulders, rounded at the base.
    const side = (y: number) => (y <= 6 ? 6 : y === 7 ? 4 : y === 8 ? 3 : y >= 31 ? 3 : 2);
    for (let y = 5; y < 32; y++) {
      const a = side(y);
      const b = 25 - a;
      for (let x = a; x <= b; x++) put(x, y, x === a ? 'o' : x === b ? 'O' : y === 31 ? 'O' : 'f');
    }
    // Ribbon round the neck, tied in a bow on the right.
    for (let x = 6; x < 20; x++) put(x, 5, 'p');
    for (let x = 6; x < 20; x++) put(x, 6, 'P');
    put(19, 4, 'p');
    put(20, 4, 'p');
    put(20, 5, 'P');
    put(21, 5, 'p');
    put(20, 6, 'p');
    put(21, 7, 'p');
    // Shine down the left of the glass.
    for (let y = 10; y < 24; y++) if (y !== 18) put(4, y, 'w');
    const tints = ['a', 'b', 'e'];
    JAR_SLOTS.slice(0, Math.max(0, left)).forEach(([x, y], i) => stamp(put, SMALL_HEART, x, y, tints[i % 3]));
  });
}

export type StationeryKind = 'letter' | 'note';

/** 4×4 ordered dither thresholds, the same kind of pattern the ponds shade with. */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

/** The ink the vault writes in on paper: the letter's outline and text. */
export const PAPER_INK = '#2a1630';

/** The letter's paper; its stationery is drawn over it in the vault's ink and greens. */
export const LETTER_PAPER = '#f6eedb';

/** `a` moved toward `b` by `t`, for shades of a paper colour. */
function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const channel = (shift: number) => {
    const from = (pa >> shift) & 255;
    return Math.round(from + (((pb >> shift) & 255) - from) * t);
  };
  return `#${((channel(16) << 16) | (channel(8) << 8) | channel(0)).toString(16).padStart(6, '0')}`;
}

/**
 * A sheet of pixel stationery, w × h art pixels: an outlined sheet with stepped corners and the pond's dither
 * shading in from its edge. A letter also gets a stitched border with hearts along it and a lily pad, with a
 * heart on it, at each corner.
 */
export function stationerySprite(w: number, h: number, kind: StationeryKind, paper: string): Sprite {
  const letter = kind === 'letter';
  const ink = { K: PAPER_INK, C: paper, R: mixHex(paper, PAPER_INK, 0.13), S: '#2f7a66', H: LOVE, W: LOVE_LIGHT, ...PAD_INK };
  // Cells cut from every corner, as offsets from it: a stepped round.
  const cut = letter ? [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2]] : [[0, 0], [1, 0], [0, 1]];
  const inside = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < w && y < h &&
    !cut.some(([cx, cy]) => (x === cx || x === w - 1 - cx) && (y === cy || y === h - 1 - cy));
  // Dither strength for each row in from the rim: the paper darkens toward its edge.
  const band = letter ? [0.5, 0.25, 0.12] : [0.4, 0.15];

  return painted(w, h, ink, (put) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!inside(x, y)) continue;
        if (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) {
          put(x, y, 'K');
          continue;
        }
        const d = Math.min(x, y, w - 1 - x, h - 1 - y);
        const level = d === 1 ? 1 : (band[d - 2] ?? 0);
        put(x, y, BAYER4[(y & 3) * 4 + (x & 3)] < level ? 'R' : 'C');
      }
    }
    if (!letter) return;

    // Stitched border, two on and one off, set in from the edge.
    const at = 7;
    for (let x = at; x <= w - 1 - at; x++) {
      if (x % 3 === 2) continue;
      put(x, at, 'S');
      put(x, h - 1 - at, 'S');
    }
    for (let y = at; y <= h - 1 - at; y++) {
      if (y % 3 === 2) continue;
      put(at, y, 'S');
      put(w - 1 - at, y, 'S');
    }

    // Hearts threaded on the stitches, evenly between the corners.
    const heart = (cx: number, cy: number) => {
      for (let y = cy - 3; y <= cy + 2; y++) for (let x = cx - 3; x <= cx + 3; x++) put(x, y, 'C');
      stamp(put, SMALL_HEART, cx - 2, cy - 2, 'H');
      put(cx - 1, cy - 1, 'W');
    };
    const spots = (length: number) => {
      const run = length - 2 * at - 36;
      const n = Math.max(0, Math.floor(run / 36));
      return Array.from({ length: n }, (_, i) => at + 18 + Math.round((run * (i + 0.5)) / n));
    };
    for (const x of spots(w)) {
      heart(x, at);
      heart(x, h - 1 - at);
    }
    for (const y of spots(h)) {
      heart(at, y);
      heart(w - 1 - at, y);
    }

    // A lily pad on each corner, lying across the stitches, with a heart blooming on it.
    for (const [cx, cy, notch] of [[at, at, -1], [w - 1 - at, at, 1], [at, h - 1 - at, -1], [w - 1 - at, h - 1 - at, 1]] as const) {
      paintPad(put, cx - 7, cy - 3, 15, 8, notch);
      stamp(put, SMALL_HEART, cx - 2 + notch * 2, cy - 4, 'H');
      put(cx - 1 + notch * 2, cy - 3, 'W');
    }
  });
}

/** The ribbon's pinks, edge to edge across it: outline, light, love, shade, outline. */
export const RIBBON_INK = ['#a3164f', LOVE_LIGHT, LOVE, LOVE_DEEP, '#a3164f'] as const;

/**
 * The bow each pass is wrapped with, until it is redeemed. Its knot is over columns 5 to 9, where a ribbon
 * five art pixels wide runs down from it.
 */
export const GIFT_BOW = sprite(
  `
  .ooo.......ooo.
  ohhpo.....ophho
  ohpppo...opppho
  oppppdooodppppo
  oppppdohodppppo
  opppddododdpppo
  .odddooooodddo.
  .....odpdo.....
  ....odo.odo....
  ...odo...odo...
  ...oo.....oo...
  `,
  { o: RIBBON_INK[0], h: LOVE_LIGHT, p: LOVE, d: LOVE_DEEP },
);

/** "More below" prompt at the foot of the letter while it is still being written. */
export const MORE = sprite(
  `
  xxxxxxx
  .xxxxx.
  ..xxx..
  ...x...
  `,
  { x: 'currentColor' },
);

const PASS_INK = {
  c: '#ece6cc',
  C: '#b9ad8f',
  w: '#fffaf0',
  p: '#f48cb8',
  P: LOVE_DEEP,
  h: LOVE_LIGHT,
  r: '#a3164f',
  y: '#f2c25c',
  Y: '#c98a2e',
  o: '#d9a877',
  O: '#a8703f',
  b: '#3a2230',
  g: '#7be07e',
  G: '#45c148',
  s: '#a9bfc4',
  S: '#6f8b93',
};

/** One icon per pass, keyed by the `icon` field of the sealed copy. */
export const PASS_ICONS: Readonly<Record<string, Sprite>> = {
  massage: sprite(
    `
    .........gg.
    ........gGg.
    ....sss..g..
    ...swsss....
    ....SSS.....
    ..swsssss...
    .sssssssss..
    ..SSSSSSS...
    .swssssssss.
    ssssssssssss
    .SSSSSSSSSS.
    ............
    `,
    PASS_INK,
  ),
  dinner: sprite(
    `
    ............
    ...cccccc...
    ...cw...c...
    ...crrrrc...
    ...crrrrc...
    ....crrc....
    .....cc.....
    .....cc.....
    .....cc.....
    .....cc.....
    ...cccccc...
    ............
    `,
    PASS_INK,
  ),
  boba: sprite(
    `
    .........pp.
    ........pp..
    .......pp...
    .ccccccpccc.
    .CCCCCCCCCC.
    ..oooooooo..
    ..owoooooo..
    ..oooooooo..
    ...obobbo...
    ...obbobo...
    ....oooo....
    ............
    `,
    PASS_INK,
  ),
  movie: sprite(
    `
    ...ww..ww...
    ..wwwwwwwy..
    .wywwwywwww.
    .wwwwwwwwyw.
    .PPwwPPwwPP.
    .PPwwPPwwPP.
    ..PwwPPwwP..
    ..PwwPPwwP..
    ..PwwPPwwP..
    ...wwPPww...
    ...wwPPww...
    ............
    `,
    PASS_INK,
  ),
  crown: sprite(
    `
    ............
    ............
    .p...pp...p.
    .y...yy...y.
    .yy..yy..yy.
    .yyy.yy.yyy.
    .yyyyyyyyyy.
    .yyyyyyyyyy.
    .YYpYhhYpYY.
    .YYYYYYYYYY.
    ............
    ............
    `,
    PASS_INK,
  ),
  getaway: sprite(
    `
    ............
    ....OOOO....
    ....O..O....
    .oooooooooo.
    .oOoopopoOo.
    .oOopppppOo.
    .oOoopppoOo.
    .oOooopooOo.
    .oOooooooOo.
    .OOOOOOOOOO.
    .O........O.
    ............
    `,
    PASS_INK,
  ),
};

/** Music bar transport, in the text colour. */
const TRANSPORT_INK = { x: 'currentColor' };

export const PLAY = sprite(
  `
  .x.....
  .xx....
  .xxx...
  .xxxx..
  .xxx...
  .xx....
  .x.....
  `,
  TRANSPORT_INK,
);

export const PAUSE = sprite(
  `
  .xx.xx.
  .xx.xx.
  .xx.xx.
  .xx.xx.
  .xx.xx.
  .xx.xx.
  .xx.xx.
  `,
  TRANSPORT_INK,
);

export const PREVIOUS = sprite(
  `
  x....x.
  x...xx.
  x..xxx.
  x.xxxx.
  x..xxx.
  x...xx.
  x....x.
  `,
  TRANSPORT_INK,
);

export const NEXT = sprite(
  `
  .x....x
  .xx...x
  .xxx..x
  .xxxx.x
  .xxx..x
  .xx...x
  .x....x
  `,
  TRANSPORT_INK,
);

export const VOLUME = sprite(
  `
  ...x...
  ..xx.x.
  xxxx..x
  xxxx..x
  xxxx..x
  ..xx.x.
  ...x...
  `,
  TRANSPORT_INK,
);
