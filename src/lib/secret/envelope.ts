/**
 * The sealed envelope that floats on the vault's dusk pond. It is flat pixel art, like the frogs: each frame
 * is painted into a buffer of palette indices, one byte per art pixel, and shown at the ponds' 3 CSS px per
 * art pixel on their shared 12 FPS clock.
 *
 * Opening runs for OPEN_SECONDS: the wax heart swells and pops into small hearts, the flap folds back over
 * the top edge, and the letter rises out of the pocket.
 */
import { clamp } from '../pond/field';

/** Seconds from tapping the seal to the letter standing clear of the envelope. */
export const OPEN_SECONDS = 2;

/** Colours for buffer values 1..14; 0 is clear. */
export const ENVELOPE_INKS = [
  '#2a0f1a', // 1 outline, the pink frog's line colour
  '#fbefd9', // 2 paper
  '#ecd3b0', // 3 side flaps
  '#d4ab86', // 4 creases
  '#b9537a', // 5 lining
  '#de7fa2', // 6 lining pattern
  '#fffaf0', // 7 letter
  '#d9c2a3', // 8 handwriting
  '#d42a72', // 9 wax
  '#8f1248', // 10 wax rim and pressed heart
  '#ff9cc6', // 11 wax shine
  '#120a19', // 12 shadow on the water
  '#ffe8f3', // 13 sparkle
  '#ff4d94', // 14 hearts
] as const;

const LINE = 1, PAPER = 2, SIDE = 3, CREASE = 4, LINING = 5, LINING_DOT = 6, LETTER = 7, WRITING = 8;
const WAX = 9, WAX_DARK = 10, WAX_SHINE = 11, SHADOW = 12, SPARKLE = 13, HEART = 14;

export interface EnvelopeLayout {
  /** Envelope size, in art pixels. */
  w: number;
  h: number;
  /** The buffer's size and where its top-left corner sits on the pond, in art pixels. */
  bufW: number;
  bufH: number;
  left: number;
  top: number;
  /** The envelope's top-left corner inside the buffer. */
  ox: number;
  oy: number;
}

/** Buffer margin either side, for the sparkles and the hearts that burst out of the seal. */
const MARGIN = 12;

/** Sizes the envelope to a pond W×H art pixels and floats it just above the middle. */
export function envelopeLayout(W: number, H: number): EnvelopeLayout {
  const w = W >= 300 ? 76 : W >= 240 ? 64 : W >= 160 ? 50 : 42;
  const h = Math.round(w * 0.62);
  // Room above for the opened flap and the risen letter, and below for the float and the shadow.
  const above = Math.round(h * 0.66) + 4;
  const below = 9;
  return {
    w,
    h,
    bufW: w + MARGIN * 2,
    bufH: above + h + below,
    left: Math.round((W - w) / 2) - MARGIN,
    top: Math.round(H * 0.5 - h * 0.42) - above,
    ox: MARGIN,
    oy: above,
  };
}

/** The pond area under the envelope and its shadow, as [left, top, right, bottom] fractions of the pond. */
export function envelopeClearBox(L: EnvelopeLayout, W: number, H: number): [number, number, number, number] {
  const x = L.left + L.ox, y = L.top + L.oy;
  return [(x - 4) / W, (y - 4) / H, (x + L.w + 4) / W, (y + L.h + 8) / H];
}

export interface EnvelopeFrame {
  /** Flap fold: 0 shut over the front, 1 folded back above the top edge. */
  flap: number;
  /** Letter: 0 in the pocket, 1 standing clear of it. */
  rise: number;
  /** Wax seal: 0 gone, 1 resting, 2 swollen (a heartbeat, or about to pop). */
  seal: 0 | 1 | 2;
  /** Hearts flying out of the popped seal, 0..1, or -1 for none. */
  burst: number;
  /** Float, in art pixels. */
  bob: number;
  /** Clock time in seconds, for the sparkles. */
  t: number;
  /** False once the letter has been handed over and the envelope sits empty. */
  letter: boolean;
}

/** The letter's box in the buffer, in art pixels: inside the pocket at rise 0, standing clear of it at rise 1. */
export function letterBox(L: EnvelopeLayout, rise: number, bob = 0): { x: number; y: number; w: number; h: number } {
  const inset = Math.round(L.w * 0.1);
  return {
    x: L.ox + inset,
    y: L.oy + bob + Math.round(L.h * 0.1) - Math.round(rise * L.h * 0.72),
    w: L.w - 2 * inset,
    h: Math.round(L.h * 0.84),
  };
}

/** The envelope at clock time `t`. `openedAt` is the clock time the seal was tapped, or null while shut. */
export function envelopeFrame(t: number, openedAt: number | null): EnvelopeFrame {
  if (openedAt === null) {
    // A heartbeat every 2.4 s and a slow one-pixel float, so the seal invites a tap.
    return {
      flap: 0,
      rise: 0,
      seal: t % 2.4 < 0.17 ? 2 : 1,
      burst: -1,
      bob: Math.round(Math.sin(t * 1.6) * 0.8),
      t,
      letter: true,
    };
  }
  const p = clamp((t - openedAt) / OPEN_SECONDS, 0, 1);
  const fold = clamp((p - 0.1) / 0.36, 0, 1);
  const lift = clamp((p - 0.42) / 0.46, 0, 1);
  return {
    // Smoothstep for the fold, ease-out for the lift.
    flap: fold * fold * (3 - 2 * fold),
    rise: 1 - (1 - lift) ** 3,
    seal: p < 0.06 ? 2 : 0,
    burst: p >= 0.06 && p < 0.5 ? (p - 0.06) / 0.44 : -1,
    bob: 0,
    t,
    letter: true,
  };
}

const SMALL_HEART = ['.x.x.', 'xxxxx', '.xxx.', '..x..'];
/** Six wide, so it centres on the even-width envelope. */
const PRESSED_HEART = ['.x..x.', 'xxxxxx', 'xxxxxx', '.xxxx.', '..xx..'];
/** Where the sparkles sit around the envelope, and their phase in frames. */
const SPARKLES = [
  { x: 0.08, y: -0.2, phase: 0 },
  { x: 1.08, y: 0.4, phase: 14 },
  { x: -0.09, y: 0.78, phase: 27 },
];

/** Paints one frame into `buf`, a bufW × bufH grid of ENVELOPE_INKS indices (0 clear). */
export function paintEnvelope(buf: Uint8Array, L: EnvelopeLayout, f: EnvelopeFrame): void {
  const { w, h, bufW, bufH } = L;
  const ox = L.ox;
  const oy = L.oy + f.bob;
  /** Centre column; a half pixel when the width is even, so every shape stays symmetric. */
  const cx = ox + (w - 1) / 2;
  const half = (w - 1) / 2;
  buf.fill(0);
  const put = (x: number, y: number, c: number) => {
    if (x >= 0 && y >= 0 && x < bufW && y < bufH) buf[y * bufW + x] = c;
  };
  const stamp = (art: readonly string[], x0: number, y0: number, c: number) =>
    art.forEach((row, j) => [...row].forEach((ch, i) => ch === 'x' && put(x0 + i, y0 + j, c)));
  /** Height of a V that runs from `depth` at the centre column to 0 at the side edges. */
  const vee = (x: number, depth: number) => Math.round(depth * (1 - Math.abs(x - cx) / half));

  // Shadow on the water: a dithered oval that tightens while the envelope floats up.
  const shadowY = L.oy + h + 4;
  const rx = w * 0.42 + f.bob;
  for (let y = shadowY - 2; y <= shadowY + 2; y++) {
    for (let x = ox - 4; x < ox + w + 4; x++) {
      if (((x - cx) / rx) ** 2 + ((y - shadowY) / 2.4) ** 2 <= 1 && (x + y) % 2 === 0) put(x, y, SHADOW);
    }
  }

  // Back panel: the patterned lining, seen through the opening once the flap lifts.
  for (let y = oy; y < oy + h; y++) {
    for (let x = ox; x < ox + w; x++) {
      const i = x - ox, j = y - oy;
      const edge = i === 0 || j === 0 || i === w - 1 || j === h - 1;
      put(x, y, edge ? LINE : j % 3 === 1 && (i + 2 * Math.floor(j / 3)) % 4 === 1 ? LINING_DOT : LINING);
    }
  }

  // The flap's tip: below the top edge while shut, above it once folded back.
  const tip = Math.round(h * 0.6 * Math.cos(Math.PI * f.flap));
  if (tip < 0) {
    for (let x = ox; x < ox + w; x++) {
      const top = oy + Math.round(tip * (1 - Math.abs(x - cx) / half));
      for (let y = top; y < oy; y++) put(x, y, y === top ? LINE : LINING);
    }
  }

  // The letter, drawn before the pocket so the pocket hides whatever is still inside.
  if (f.letter) {
    const { x: lx0, y: ly0, w: lw, h: lh } = letterBox(L, f.rise, f.bob);
    const lx1 = lx0 + lw - 1;
    for (let y = ly0; y < ly0 + lh; y++) {
      for (let x = lx0; x <= lx1; x++) put(x, y, x === lx0 || x === lx1 || y === ly0 ? LINE : LETTER);
    }
    stamp(SMALL_HEART, Math.round(cx) - 2, ly0 + 3, HEART);
    for (let y = ly0 + 9, row = 0; y < ly0 + lh - 2; y += 3, row++) {
      const end = lx1 - 3 - ((row * 5) % 7);
      for (let x = lx0 + 3; x <= end; x++) put(x, y, WRITING);
    }
  }

  // Pocket: side flaps meeting under the opening, the bottom flap folded up over them.
  const opening = Math.round(h * 0.5);
  const bottom = h - 1 - Math.round(h * 0.58);
  for (let x = ox; x < ox + w; x++) {
    const top = oy + vee(x, opening);
    const fold = oy + h - 1 - vee(x, bottom);
    for (let y = top; y < oy + h; y++) put(x, y, y === top ? LINE : y === fold ? CREASE : y > fold ? PAPER : SIDE);
    put(x, oy + h - 1, LINE);
  }
  for (let y = oy; y < oy + h; y++) {
    put(ox, y, LINE);
    put(ox + w - 1, y, LINE);
  }

  // The flap while it is still over the front, with a crease of shadow under its edge.
  if (tip >= 0) {
    for (let x = ox; x < ox + w; x++) {
      const edge = oy + vee(x, tip);
      for (let y = oy; y <= edge; y++) put(x, y, y === edge || y === oy ? LINE : PAPER);
      if (edge + 1 < oy + h - 1 && tip > 0) put(x, edge + 1, CREASE);
    }
  }

  // Wax seal on the flap's tip: a poured blob with an uneven rim and the heart pressed into it.
  const sy = oy + Math.round(h * 0.6) - 1;
  if (f.seal > 0 && f.flap === 0) {
    const R = Math.max(4, Math.round(w * 0.09)) + (f.seal === 2 ? 1 : 0);
    for (let y = sy - R - 1; y <= sy + R + 1; y++) {
      for (let x = Math.floor(cx - R - 1); x <= Math.ceil(cx + R + 1); x++) {
        const dx = x - cx, dy = y - sy;
        const a = Math.atan2(dy, dx);
        const r = R * (1 + 0.07 * Math.sin(3 * a + 1.7) + 0.04 * Math.sin(5 * a - 0.6));
        const d = Math.hypot(dx, dy);
        if (d > r) continue;
        const shine = Math.hypot(dx + R * 0.45, dy + R * 0.45) < R * 0.28;
        put(x, y, d > r - 1 ? WAX_DARK : shine ? WAX_SHINE : WAX);
      }
    }
    stamp(PRESSED_HEART, Math.round(cx - 2.5), sy - 2, WAX_DARK);
  }

  // Hearts flying out of the popped seal; they blink out over the last third.
  if (f.burst >= 0 && !(f.burst > 0.7 && Math.floor(f.t * 12) % 2 === 0)) {
    for (let k = 0; k < 6; k++) {
      const a = -Math.PI / 2 + 0.3 + (k * Math.PI) / 3;
      const d = 3 + f.burst * 16;
      stamp(
        SMALL_HEART,
        Math.round(cx + Math.cos(a) * d * 1.25) - 2,
        Math.round(sy + Math.sin(a) * d + f.burst * f.burst * 8) - 2,
        HEART,
      );
    }
  }

  // Sparkles that wink around the shut envelope, each for half a second in every few.
  if (f.flap === 0 && f.seal > 0) {
    for (const s of SPARKLES) {
      const k = Math.floor(f.t * 12 + s.phase) % 40;
      if (k >= 6) continue;
      const x = Math.round(ox + s.x * w), y = Math.round(oy + s.y * h);
      const arm = k === 2 || k === 3 ? 2 : 1;
      for (let i = -arm; i <= arm; i++) {
        put(x + i, y, SPARKLE);
        put(x, y + i, SPARKLE);
      }
    }
  }
}
