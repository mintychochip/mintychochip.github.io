/**
 * Three.js "sealed letter" experience: an envelope whose wax seal pops, flap
 * swings open, and a folded greeting card rises out and opens into the full
 * anniversary letter.
 *
 * The module is split so the interesting behaviour stays testable:
 *  - `letterOpenState(t)` maps one normalized progress value to every animated
 *    transform (pure, no DOM, no WebGL).
 *  - `paintCardSpread` / `paintCardCover` draw the card's paper, cover art and
 *    the letter itself on plain 2D canvases (the "note material").
 *  - `createLetterScene` wires those into a Three.js scene. Three.js is passed
 *    in (dynamically imported by the caller) so it stays out of the main bundle.
 */

import type * as ThreeNS from 'three';
import type { AnniversaryLetterCopy } from './letter-copy';

export type ThreeModule = typeof ThreeNS;

/** Seconds the open animation runs for. */
export const OPEN_SECONDS = 2.6;

/* ------------------------------------------------------------------ *
 * Timeline (pure)
 * ------------------------------------------------------------------ */

export const SEAL_WINDOW = { start: 0, end: 0.12 } as const;
export const FLAP_WINDOW = { start: 0.06, end: 0.4 } as const;
export const RISE_WINDOW = { start: 0.4, end: 0.66 } as const;
export const COVER_WINDOW = { start: 0.66, end: 0.9 } as const;
export const PRESENT_WINDOW = { start: 0.88, end: 1 } as const;
export const CAMERA_WINDOW = { start: 0.7, end: 1 } as const;

/** Flap rotation when fully open, radians. Positive X rotation folds it backwards. */
export const FLAP_OPEN_ANGLE = Math.PI * 0.985;

/** Card position while it is still shut inside the envelope. */
export const CARD_REST_Y = -0.06;
/** How high the card is lifted clear of the envelope before it opens. */
export const CARD_LIFT_Y = 0.98;
/** Where the opened spread settles for reading. */
export const CARD_SETTLE_Y = 0.86;
/** Z just behind the front pocket, so the shut card is hidden by the envelope. */
export const CARD_REST_Z = -0.006;
/** Z of the opened spread, in front of the envelope. */
export const CARD_PRESENT_Z = 0.45;

/** Cover fold angle, radians: shut (folded over the left page) → open spread. */
export const COVER_CLOSED_ANGLE = -Math.PI;
export const COVER_OPEN_ANGLE = 0;

export interface LetterOpenState {
  /** 0 → flap shut, `FLAP_OPEN_ANGLE` → flap folded back behind the envelope. */
  flapAngle: number;
  /** Wax seal fades and pops off the flap. */
  sealOpacity: number;
  sealScale: number;
  sealDrop: number;
  /** Card transform, in envelope-local world units. */
  cardTilt: number;
  cardY: number;
  cardZ: number;
  cardScale: number;
  coverAngle: number;
  /** 0 → wide establishing shot, 1 → settled on the opened letter. */
  cameraDolly: number;
  /** Rim/back light ramp for the reveal. */
  glow: number;
  done: boolean;
}

export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function easeInOutCubic(t: number): number {
  const p = clamp01(t);
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

export function easeOutCubic(t: number): number {
  const p = clamp01(t);
  return 1 - Math.pow(1 - p, 3);
}

/** Maps a global progress value onto a sub-window, eased. */
function windowed(t: number, start: number, end: number, ease: (t: number) => number): number {
  if (end <= start) return t >= end ? 1 : 0;
  return ease((t - start) / (end - start));
}

export function letterOpenState(progress: number): LetterOpenState {
  const t = clamp01(progress);

  const seal = easeOutCubic(windowed(t, SEAL_WINDOW.start, SEAL_WINDOW.end, (v) => v));
  const flap = easeInOutCubic((t - FLAP_WINDOW.start) / (FLAP_WINDOW.end - FLAP_WINDOW.start));
  const rise = easeOutCubic((t - RISE_WINDOW.start) / (RISE_WINDOW.end - RISE_WINDOW.start));
  const open = easeInOutCubic((t - COVER_WINDOW.start) / (COVER_WINDOW.end - COVER_WINDOW.start));
  const present = easeOutCubic((t - PRESENT_WINDOW.start) / (PRESENT_WINDOW.end - PRESENT_WINDOW.start));
  const dolly = easeInOutCubic((t - CAMERA_WINDOW.start) / (CAMERA_WINDOW.end - CAMERA_WINDOW.start));

  return {
    flapAngle: FLAP_OPEN_ANGLE * flap,
    sealOpacity: 1 - seal,
    sealScale: 1 + 0.45 * seal,
    sealDrop: 0.25 * seal,
    cardTilt: lerp(0, -0.1, rise) + 0.05 * present,
    cardY: lerp(CARD_REST_Y, CARD_LIFT_Y, rise) - (CARD_LIFT_Y - CARD_SETTLE_Y) * present,
    cardZ: lerp(CARD_REST_Z, 0.08, rise) + (CARD_PRESENT_Z - 0.08) * present,
    cardScale: lerp(1, 1.02, rise) * lerp(1, 1.03, present),
    coverAngle: lerp(COVER_CLOSED_ANGLE, COVER_OPEN_ANGLE, open),
    cameraDolly: dolly,
    glow: clamp01(0.15 + 0.85 * easeInOutCubic((t - 0.3) / 0.6)),
    done: t >= 1,
  };
}

/** Gentle idle float for the sealed envelope, in radians / world units. */
export function idleSway(elapsed: number): { yaw: number; pitch: number; bob: number } {
  return {
    yaw: Math.sin(elapsed * 0.32) * 0.13,
    pitch: Math.sin(elapsed * 0.24 + 1.1) * 0.05,
    bob: Math.sin(elapsed * 0.9) * 0.05,
  };
}

/** Resting tilt of the envelope: enough perspective for the depth to read. */
export const BASE_TILT = { yaw: 0.13, pitch: -0.07 } as const;

/* ------------------------------------------------------------------ *
 * Procedural paper textures
 * ------------------------------------------------------------------ */

export interface PaperOptions {
  base?: string;
  /** Per-pixel grain strength, 0..1. */
  grain?: number;
  /** Edge darkening, 0..1. */
  vignette?: number;
  /** Number of drawn paper fibres. */
  fibres?: number;
  /** Ruled writing lines. */
  ruled?: { gap: number; color: string; inset: number; startY: number };
  /** Warm blotches for an aged look. */
  stains?: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
  const int = Number.parseInt(full, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

/** Paints a sheet of paper: grain, fibres, stains, vignette and optional rules. */
export function paintPaper(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: PaperOptions = {},
): void {
  const { base = '#f6ead0', grain = 0.09, vignette = 0.35, fibres = 420, ruled, stains = 2 } = options;
  const [r, g, b] = hexToRgb(base);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  // Aged blotches
  for (let i = 0; i < stains; i++) {
    const cx = Math.random() * width;
    const cy = Math.random() * height;
    const radius = (0.12 + Math.random() * 0.22) * Math.max(width, height);
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, `rgba(150, 112, 60, ${0.04 + Math.random() * 0.04})`);
    gradient.addColorStop(1, 'rgba(150, 112, 60, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  // Per-pixel grain
  if (grain > 0) {
    const image = ctx.getImageData(0, 0, width, height);
    const data = image.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 255 * grain;
      data[i] = Math.min(255, Math.max(0, data[i] + n));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
    }
    ctx.putImageData(image, 0, 0);
  }

  // Fibres
  ctx.lineWidth = 1;
  for (let i = 0; i < fibres; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const len = 6 + Math.random() * 34;
    const angle = Math.random() * Math.PI * 2;
    const dark = Math.random() > 0.5;
    ctx.strokeStyle = dark
      ? `rgba(${r - 42}, ${g - 44}, ${b - 46}, 0.16)`
      : 'rgba(255, 255, 255, 0.28)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }

  if (ruled) {
    ctx.strokeStyle = ruled.color;
    ctx.lineWidth = 1.4;
    for (let y = ruled.startY; y < height - ruled.inset; y += ruled.gap) {
      ctx.beginPath();
      ctx.moveTo(ruled.inset, y);
      ctx.lineTo(width - ruled.inset, y);
      ctx.stroke();
    }
  }

  if (vignette > 0) {
    const gradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.32,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.72,
    );
    gradient.addColorStop(0, 'rgba(60, 34, 10, 0)');
    gradient.addColorStop(1, `rgba(60, 34, 10, ${vignette})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
}

/** Greedy word wrap for canvas text. */
export function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Heart outline in y-down units (tip at `[0, 1]`, lobes above), shared by the
 * canvas doodle and the extruded wax-seal emblem so both stay identical.
 */
export const HEART_OUTLINE = {
  start: [0, -0.3] as [number, number],
  curves: [
    [0, -0.55, -0.55, -0.55, -0.55, -0.2],
    [-0.55, 0.15, -0.2, 0.6, 0, 1],
    [0.2, 0.6, 0.55, 0.15, 0.55, -0.2],
    [0.55, -0.55, 0, -0.55, 0, -0.3],
  ] as Array<[number, number, number, number, number, number]>,
};

/**
 * Vertical centre of the shared heart outline, sampled from the curves so the
 * seal can place the heart centred on the wax.
 */
export const HEART_OUTLINE_CENTRE_Y = (() => {
  let min = Infinity;
  let max = -Infinity;
  let from = HEART_OUTLINE.start;
  for (const [c1x, c1y, c2x, c2y, x, y] of HEART_OUTLINE.curves) {
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const u = 1 - t;
      const py = u * u * u * from[1] + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y;
      if (py < min) min = py;
      if (py > max) max = py;
    }
    from = [x, y];
  }
  return (min + max) / 2;
})();

/** Traces the shared heart outline onto a 2D canvas. */
export function traceHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  ctx.beginPath();
  ctx.moveTo(cx + HEART_OUTLINE.start[0] * size, cy + HEART_OUTLINE.start[1] * size);
  for (const [c1x, c1y, c2x, c2y, x, y] of HEART_OUTLINE.curves) {
    ctx.bezierCurveTo(
      cx + c1x * size,
      cy + c1y * size,
      cx + c2x * size,
      cy + c2y * size,
      cx + x * size,
      cy + y * size,
    );
  }
  ctx.closePath();
}

const DEFAULT_FONT = '"Pixelify Sans", Georgia, serif';
const DEFAULT_ACCENT = '#c2185b';
const DEFAULT_INK = '#3b2a1c';

/**
 * Inside-page geometry in canvas pixels. One page is exactly the world-space
 * `CARD.pageWidth × CARD.pageHeight`; the spread is two of these side by side.
 */
export const PAGE = { width: 512, height: 864 } as const;

/**
 * Type scale for one page at scale 1. 17px of body text on a 512px page is
 * roughly 12pt on a 5×7 card: readable once the card is presented, and small
 * enough that the whole letter fits on the two pages instead of running off
 * the bottom of the left one.
 */
const CARD_TYPE = {
  padX: 0.11,
  padTop: 0.085,
  padBottom: 0.085,
  greeting: { px: 25, weight: 600, step: 1.24, gap: 26 },
  body: { px: 17, weight: 400, step: 1.5, gap: 12 },
  signoff: { px: 15, weight: 400, step: 1.4, gap: 26 },
  signature: { px: 20, weight: 600, step: 1.3, gap: 30 },
  postscript: { px: 13, weight: 400, step: 1.4, gap: 0 },
} as const;

export type CardBlockKind = 'greeting' | 'body' | 'signoff' | 'signature' | 'postscript';

export interface CardBlock {
  kind: CardBlockKind;
  /** Wrapped lines, ready to draw. */
  lines: string[];
  fontPx: number;
  weight: number;
  /** Baseline of the first line, measured down from the top of the page. */
  firstY: number;
  /** Baseline-to-baseline distance. */
  step: number;
}

export interface CardPageLayout {
  blocks: CardBlock[];
  /** Distance from the top margin to the last baseline plus its descender. */
  used: number;
  /** Usable height between the top and bottom margins. */
  available: number;
}

export interface CardLayout {
  left: CardPageLayout;
  right: CardPageLayout;
  /** Type scale that produced this layout; 1 is the nominal card type. */
  scale: number;
  /** False only when even the smallest scale overflows, i.e. copy too long. */
  fits: boolean;
}

/** Width of `text` in px at the given type size. */
export type TextMeasure = (text: string, fontPx: number, weight: number) => number;

/** Greedy word wrap driven by an injected measurer instead of a canvas. */
export function wrapMeasured(
  text: string,
  maxWidth: number,
  fontPx: number,
  weight: number,
  measure: TextMeasure,
): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && measure(candidate, fontPx, weight) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

interface BlockSpec {
  kind: CardBlockKind;
  text: string;
  px: number;
  weight: number;
  step: number;
  gap: number;
}

function specsFor(
  letter: AnniversaryLetterCopy,
  greeting: boolean,
  paragraphs: string[],
  closing: boolean,
): BlockSpec[] {
  const specs: BlockSpec[] = [];
  if (greeting) specs.push({ kind: 'greeting', text: letter.greeting, ...CARD_TYPE.greeting });
  for (const paragraph of paragraphs) specs.push({ kind: 'body', text: paragraph, ...CARD_TYPE.body });
  if (closing) {
    specs.push({ kind: 'signoff', text: letter.signoff, ...CARD_TYPE.signoff });
    specs.push({ kind: 'signature', text: letter.signature, ...CARD_TYPE.signature });
    specs.push({ kind: 'postscript', text: letter.postscript, ...CARD_TYPE.postscript });
  }
  return specs;
}

export interface CardLayoutOptions {
  measure: TextMeasure;
  /** Type scale to lay out at; defaults to 1. */
  scale?: number;
  pageWidth?: number;
  pageHeight?: number;
}

function buildPage(
  specs: BlockSpec[],
  measure: TextMeasure,
  scale: number,
  maxWidth: number,
  top: number,
  available: number,
): CardPageLayout {
  const blocks: CardBlock[] = [];
  let y = 0;
  let used = 0;
  for (const spec of specs) {
    const fontPx = Math.max(6, Math.round(spec.px * scale));
    const step = spec.step * fontPx;
    const lines = wrapMeasured(spec.text, maxWidth, fontPx, spec.weight, measure);
    blocks.push({ kind: spec.kind, lines, fontPx, weight: spec.weight, firstY: y, step });
    y += lines.length * step;
    // Height of the text so far: last baseline plus its descender.
    used = y - step + fontPx * 0.32;
    y += spec.gap * scale;
  }
  // A short letter would otherwise leave the page half empty, so the message
  // sits centred on the card instead of clinging to the top margin.
  const offset = top + Math.max(0, (available - used) / 2);
  for (const block of blocks) block.firstY += offset;
  return { blocks, used, available };
}

/**
 * Lays the letter out across the two inside pages: greeting and the first
 * paragraphs on the left, the rest plus the sign-off on the right. Every
 * paragraph is placed exactly once and the split is chosen by measured height
 * so the two pages come out balanced.
 */
export function layoutCardPages(letter: AnniversaryLetterCopy, options: CardLayoutOptions): CardLayout {
  const { measure } = options;
  const pageWidth = options.pageWidth ?? PAGE.width;
  const pageHeight = options.pageHeight ?? PAGE.height;
  const scale = options.scale ?? 1;
  // Type is specified for a PAGE.width page; a higher-resolution texture gets
  // proportionally larger type, so the layout looks the same at any size.
  const typeScale = scale * (pageWidth / PAGE.width);
  const maxWidth = pageWidth * (1 - CARD_TYPE.padX * 2);
  const top = pageHeight * CARD_TYPE.padTop;
  const available = pageHeight * (1 - CARD_TYPE.padTop - CARD_TYPE.padBottom);
  const paragraphs = letter.paragraphs;

  let best: CardLayout | undefined;
  let bestOverflow: CardLayout | undefined;

  for (let split = 0; split <= paragraphs.length; split++) {
    const layout: CardLayout = {
      left: buildPage(
        specsFor(letter, true, paragraphs.slice(0, split), false),
        measure,
        typeScale,
        maxWidth,
        top,
        available,
      ),
      right: buildPage(
        specsFor(letter, false, paragraphs.slice(split), true),
        measure,
        typeScale,
        maxWidth,
        top,
        available,
      ),
      scale,
      fits: false,
    };
    layout.fits = layout.left.used <= available && layout.right.used <= available;
    // Ties keep the earlier split, so the layout stays deterministic.
    const skew = Math.abs(layout.left.used - layout.right.used);
    if (layout.fits && (!best || skew < Math.abs(best.left.used - best.right.used))) best = layout;
    if (!bestOverflow || skew < Math.abs(bestOverflow.left.used - bestOverflow.right.used)) {
      bestOverflow = layout;
    }
  }

  if (best) return best;
  if (bestOverflow) return { ...bestOverflow, fits: false };
  const empty: CardPageLayout = { blocks: [], used: 0, available };
  return { left: empty, right: empty, scale, fits: false };
}

/** Type scale bounds: the card is filled as much as the copy allows. */
export const MIN_TYPE_SCALE = 0.62;
export const MAX_TYPE_SCALE = 1.55;
const TYPE_SCALE_STEP = 0.04;

/**
 * Lays the letter out at the largest type size that still fits both pages, so
 * the card is filled instead of half-empty and no copy ever runs off the
 * bottom of a page.
 */
export function fitCardLayout(letter: AnniversaryLetterCopy, options: CardLayoutOptions): CardLayout {
  const pageWidth = options.pageWidth ?? PAGE.width;
  const pageHeight = options.pageHeight ?? PAGE.height;
  let scale = options.scale ?? MAX_TYPE_SCALE;
  let layout = layoutCardPages(letter, { ...options, scale, pageWidth, pageHeight });
  while (!layout.fits && scale > MIN_TYPE_SCALE) {
    scale = Math.max(MIN_TYPE_SCALE, Math.round((scale - TYPE_SCALE_STEP) * 100) / 100);
    layout = layoutCardPages(letter, { ...options, scale, pageWidth, pageHeight });
  }
  return layout;
}

export interface CardSpreadOptions {
  letter: AnniversaryLetterCopy;
  fontFamily?: string;
  accent?: string;
  ink?: string;
  /** Text measurement override; defaults to `ctx.measureText` in the card font. */
  measure?: TextMeasure;
}

function blockInk(kind: CardBlockKind, accent: string, ink: string): string {
  if (kind === 'greeting' || kind === 'signature') return accent;
  if (kind === 'postscript') return `${ink}b0`;
  return ink;
}

/**
 * Paints both inside pages of the opened card side by side. The letter is laid
 * out first (`fitCardLayout`) and drawn block by block, so the whole letter
 * lands on the card and neither page overflows.
 */
export function paintCardSpread(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: CardSpreadOptions,
): void {
  const { letter, fontFamily = DEFAULT_FONT, accent = DEFAULT_ACCENT, ink = DEFAULT_INK } = options;
  const pageWidth = width / 2;
  const measure: TextMeasure =
    options.measure ??
    ((text, fontPx, weight) => {
      ctx.font = `${weight} ${fontPx}px ${fontFamily}`;
      return ctx.measureText(text).width;
    });
  const layout = fitCardLayout(letter, { measure, pageWidth, pageHeight: height });

  paintPaper(ctx, width, height, {
    base: '#fbf3e0',
    grain: 0.055,
    vignette: 0.22,
    fibres: 420,
    stains: 1,
  });

  // Fold crease down the middle.
  const crease = ctx.createLinearGradient(pageWidth - 30, 0, pageWidth + 30, 0);
  crease.addColorStop(0, 'rgba(86, 58, 28, 0)');
  crease.addColorStop(0.5, 'rgba(86, 58, 28, 0.2)');
  crease.addColorStop(1, 'rgba(86, 58, 28, 0)');
  ctx.fillStyle = crease;
  ctx.fillRect(pageWidth - 30, 0, 60, height);

  const padX = pageWidth * CARD_TYPE.padX;
  const pages: Array<[CardPageLayout, number]> = [
    [layout.left, 0],
    [layout.right, pageWidth],
  ];

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  for (const [page, originX] of pages) {
    for (const block of page.blocks) {
      ctx.font = `${block.weight} ${block.fontPx}px ${fontFamily}`;
      ctx.fillStyle = blockInk(block.kind, accent, ink);
      let y = block.firstY;
      for (const line of block.lines) {
        ctx.fillText(line, originX + padX, y);
        y += block.step;
      }
      // Drawn heart right after the signature.
      if (block.kind === 'signature') {
        const signatureWidth = measure(block.lines.join(' '), block.fontPx, block.weight);
        ctx.fillStyle = accent;
        traceHeart(ctx, originX + padX + signatureWidth + block.fontPx * 0.5, y - block.fontPx * 0.32, block.fontPx * 1.1);
        ctx.fill();
      }
    }
  }
}

export interface CardCoverOptions {
  kicker: string;
  title: string;
  fontFamily?: string;
  accent?: string;
  ink?: string;
}

/** Paints the outside front cover of the card. */
export function paintCardCover(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: CardCoverOptions,
): void {
  const { kicker, title, fontFamily = DEFAULT_FONT, accent = DEFAULT_ACCENT, ink = DEFAULT_INK } = options;

  paintPaper(ctx, width, height, {
    base: '#f7e7d6',
    grain: 0.06,
    vignette: 0.26,
    fibres: 320,
    stains: 1,
  });

  // Double rule border.
  ctx.strokeStyle = 'rgba(194, 24, 91, 0.5)';
  ctx.lineWidth = 3;
  ctx.strokeRect(width * 0.075, height * 0.05, width * 0.85, height * 0.9);
  ctx.strokeStyle = 'rgba(194, 24, 91, 0.22)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(width * 0.1, height * 0.066, width * 0.8, height * 0.868);

  const inner = width * 0.16;
  const maxWidth = width - inner * 2;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = accent;
  traceHeart(ctx, width / 2, height * 0.2, width * 0.13);
  ctx.fill();

  ctx.font = `400 ${Math.round(height * 0.028)}px ${fontFamily}`;
  ctx.fillStyle = 'rgba(59, 42, 28, 0.6)';
  ctx.fillText(kicker.toUpperCase(), width / 2, height * 0.36);

  ctx.font = `600 ${Math.round(height * 0.075)}px ${fontFamily}`;
  ctx.fillStyle = ink;
  let y = height * 0.48;
  for (const line of wrapLines(ctx, title, maxWidth)) {
    ctx.fillText(line, width / 2, y);
    y += height * 0.088;
  }

  ctx.strokeStyle = 'rgba(194, 24, 91, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width * 0.3, y + height * 0.02);
  ctx.lineTo(width * 0.7, y + height * 0.02);
  ctx.stroke();

  ctx.font = `400 ${Math.round(height * 0.03)}px ${fontFamily}`;
  ctx.fillStyle = 'rgba(59, 42, 28, 0.55)';
  ctx.fillText('open me', width / 2, y + height * 0.09);
  ctx.textAlign = 'left';
}

/** Soft round sprite used for dust motes and the glow card behind the letter. */
export function paintRadialSprite(
  ctx: CanvasRenderingContext2D,
  size: number,
  stops: Array<[number, string]>,
): void {
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
}

function makeCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  return { canvas, ctx };
}

/* ------------------------------------------------------------------ *
 * Scene
 * ------------------------------------------------------------------ */

export interface LetterSceneOptions {
  letter: AnniversaryLetterCopy;
  reducedMotion?: boolean;
  onOpened?: () => void;
  onError?: (error: unknown) => void;
  /** Pointer released without dragging — treat as "open the letter". */
  onTap?: () => void;
  /** Visible page and how many there are; 1 means the whole spread is in frame. */
  onPage?: (page: number, count: number) => void;
}

export interface LetterSceneHandle {
  open(): void;
  /** Turn to the next/previous page. Only does anything when the card is paged. */
  turnPage(direction: 1 | -1): void;
  dispose(): void;
  setPaused(paused: boolean): void;
}

const ENVELOPE = { width: 3.4, height: 2.6, depth: 0.075 };
/** One folded page of the card; the opened spread is twice as wide. */
const CARD = { pageWidth: 1.28, pageHeight: 2.16, faceGap: 0.004, coverOffset: 0.008 };
const DRAG = { yaw: 0.6, pitch: 0.32 };
const CLICK_SLOP = 6;
/**
 * World box the camera keeps in frame for each state. The card boxes carry a
 * margin so its resting tilt never clips a page, and the frame is measured at
 * the subject's depth — the presented card sits `CARD_PRESENT_Z` closer to the
 * camera than the envelope does.
 */
const FIT = {
  sealed: { width: ENVELOPE.width + 2, height: ENVELOPE.height + 2 },
  spread: { width: CARD.pageWidth * 2 * 1.14, height: CARD.pageHeight * 1.24 },
  page: { width: CARD.pageWidth * 1.1, height: CARD.pageHeight * 1.12 },
};
/** Gap left between pages when the camera pans from one page to the next. */
const PAGE_GAP = 0.14;
/** Canvas aspect below which the card is read one page at a time. */
const SINGLE_PAGE_ASPECT = 0.95;
/** Horizontal travel, in CSS px, that turns the page on a touch screen. */
const PAGE_SWIPE = 42;

/** Sharpest render ratio to start from; adaptive quality drops it if needed. */
const START_PIXEL_RATIO = 1.5;
/** Floor for the adaptive ratio, so the card text never turns to mush. */
const MIN_PIXEL_RATIO = 0.75;
/** Multiplier applied each time frames run slow. */
const QUALITY_STEP = 0.75;
/** Average frame time slower than this (≈49fps) means the GPU is behind. */
const SLOW_FRAME_SECONDS = 0.0205;
/** Frames to render at the starting ratio before judging it. */
const WARMUP_FRAMES = 45;

/**
 * How often a settled scene still repaints. The renderer does not preserve its
 * drawing buffer, so a canvas that nothing redraws can composite blank.
 */
const IDLE_REPAINT_MS = 400;
/** Seconds the card keeps drifting after it opens before the loop parks. */
const SETTLE_SECONDS = 1.4;


/** Rewrites a shape geometry's UVs to span its bounding box, so paper grain does not tile. */
function fitUVs(geometry: ThreeNS.BufferGeometry): void {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const uv = geometry.getAttribute('uv') as ThreeNS.BufferAttribute;
  const position = geometry.getAttribute('position') as ThreeNS.BufferAttribute;
  if (!box) return;
  const sizeX = Math.max(box.max.x - box.min.x, 1e-6);
  const sizeY = Math.max(box.max.y - box.min.y, 1e-6);
  for (let i = 0; i < position.count; i++) {
    uv.setXY(i, (position.getX(i) - box.min.x) / sizeX, (position.getY(i) - box.min.y) / sizeY);
  }
  uv.needsUpdate = true;
}

/* ------------------------------------------------------------------ *
 * Wax seal
 * ------------------------------------------------------------------ */

/** Seal dimensions in world units, and the wobble seed that shapes the pour. */
export const WAX = { radius: 0.28, height: 0.075, seed: 1.7 } as const;

/**
 * Radius of the wax blob at a given angle: a couple of smooth harmonics on top
 * of the circle, which is what makes poured wax read as poured rather than
 * printed. Deterministic in `seed`, so the seal looks the same every load.
 */
export function waxRadius(angle: number, seed: number): number {
  return (
    1 +
    0.05 * Math.sin(angle * 3 + seed) +
    0.028 * Math.sin(angle * 5 - seed * 1.7) +
    0.016 * Math.sin(angle * 8 + seed * 0.6)
  );
}

/** Height of the wax dome at radius `r`, as a quarter cosine. */
export function waxDomeHeight(r: number): number {
  const t = Math.max(0, Math.min(1, r / WAX.radius));
  return WAX.height * Math.cos((t * Math.PI) / 2);
}

/**
 * Lathe profile for the blob: the dome from the apex out to the rim, then a
 * short underside so the wax has thickness where it meets the paper.
 */
export function waxProfile(): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const r = (WAX.radius * i) / steps;
    points.push([r, waxDomeHeight(r)]);
  }
  points.push([WAX.radius * 0.94, -WAX.height * 0.22]);
  points.push([WAX.radius * 0.6, -WAX.height * 0.34]);
  points.push([0, -WAX.height * 0.38]);
  return points;
}

/**
 * Paints the wax surface for the seal: a deep oxblood pour with darker pooling
 * at the rim, speckle, and the heart pressed into it as a groove. The same
 * canvas also drives the bump map, so the scene's own lights define the relief.
 * Laid out top-down across the square that contains the blob.
 */
export function paintWax(ctx: CanvasRenderingContext2D, size: number): void {
  const mid = size / 2;
  const rim = size * 0.48;
  ctx.clearRect(0, 0, size, size);

  const base = ctx.createRadialGradient(mid * 0.82, mid * 0.78, rim * 0.1, mid, mid, rim);
  base.addColorStop(0, '#b31c47');
  base.addColorStop(0.55, '#8d0f30');
  base.addColorStop(1, '#490418');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // Mottling and speckle so the highlight is never perfectly even.
  for (let i = 0; i < 110; i++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    const radius = size * (0.02 + Math.random() * 0.07);
    const blob = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    blob.addColorStop(0, Math.random() > 0.5 ? 'rgba(255, 180, 200, 0.07)' : 'rgba(40, 4, 14, 0.09)');
    blob.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = blob;
    ctx.fillRect(0, 0, size, size);
  }

  // The heart is traced in canvas coordinates (tip downwards); shift it so it
  // lands centred on the wax rather than where the outline happens to start.
  const heartSize = rim * 0.66;
  const heart = (dx: number, dy: number) => {
    ctx.save();
    ctx.translate(mid + dx, mid + HEART_OUTLINE_CENTRE_Y * heartSize + dy);
    traceHeart(ctx, 0, 0, heartSize);
    ctx.restore();
  };

  // Lit edge above, shadowed edge below: the groove needs a light direction.
  ctx.lineWidth = size * 0.024;
  ctx.strokeStyle = 'rgba(255, 195, 210, 0.42)';
  heart(-size * 0.006, -size * 0.009);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(26, 2, 9, 0.5)';
  heart(size * 0.006, size * 0.009);
  ctx.stroke();

  ctx.fillStyle = 'rgba(58, 5, 18, 0.5)';
  heart(0, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(22, 1, 8, 0.55)';
  ctx.lineWidth = size * 0.014;
  ctx.stroke();

  const image = ctx.getImageData(0, 0, size, size);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 22;
    data[i] = Math.min(255, Math.max(0, data[i] + n));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n * 0.6));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n * 0.6));
  }
  ctx.putImageData(image, 0, 0);
}

/**
 * Planar UVs across the square containing the blob, so the painted wax and its
 * pressed heart land the right way up on the dome. The lathe is built around
 * its local Y axis and later tipped to face the camera, so the face plane is
 * local XZ — projecting across XY would smear the paint along the dome.
 */
export function planarSealUVs(geometry: ThreeNS.BufferGeometry, radius: number): void {
  const position = geometry.getAttribute('position') as ThreeNS.BufferAttribute;
  const uv = geometry.getAttribute('uv') as ThreeNS.BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    uv.setXY(
      i,
      position.getX(i) / (radius * 2) + 0.5,
      0.5 - position.getZ(i) / (radius * 2),
    );
  }
  uv.needsUpdate = true;
}

export function createLetterScene(
  THREE: ThreeModule,
  host: HTMLElement,
  options: LetterSceneOptions,
): LetterSceneHandle {
  const letterCopy = options.letter;
  const reducedMotion = options.reducedMotion ?? false;
  const { width: W, height: H, depth: D } = ENVELOPE;
  /** Render resolution, lowered by `watchFrameTime` when frames run long. */
  let pixelRatio = Math.min(window.devicePixelRatio || 1, START_PIXEL_RATIO);
  let frames = 0;
  let frameTime = 0;
  /** Timestamp of the last painted frame, for the idle repaint throttle. */
  let lastPaintAt = 0;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;

  const canvas = renderer.domElement;
  // The canvas is positioned by CSS (absolute, inset 0) and sized in px by
  // renderer.setSize, so it never depends on percentage height inside a flex item.
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 60);
  camera.position.set(0, 0.6, 7);

  const disposables: Array<{ dispose(): void }> = [];
  const track = <T extends { dispose(): void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  /* --- textures --------------------------------------------------- */
  const paperCanvas = makeCanvas(1024, 1024);
  paintPaper(paperCanvas.ctx, 1024, 1024, {
    base: '#e9d3ab',
    grain: 0.1,
    vignette: 0.3,
    fibres: 1100,
    stains: 2,
  });
  const kraftTexture = track(new THREE.CanvasTexture(paperCanvas.canvas));
  kraftTexture.colorSpace = THREE.SRGBColorSpace;
  kraftTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const spreadCanvas = makeCanvas(1024, 864);
  paintCardSpread(spreadCanvas.ctx, 1024, 864, { letter: letterCopy });
  const spreadTexture = track(new THREE.CanvasTexture(spreadCanvas.canvas));
  spreadTexture.colorSpace = THREE.SRGBColorSpace;
  spreadTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  // Left page samples the left half of the canvas, right page the right half.
  spreadTexture.repeat.set(0.5, 1);
  const spreadRightTexture = track(spreadTexture.clone());
  spreadRightTexture.repeat.set(0.5, 1);
  spreadRightTexture.offset.set(0.5, 0);

  const coverCanvas = makeCanvas(512, 864);
  paintCardCover(coverCanvas.ctx, 512, 864, {
    kicker: letterCopy.cover.kicker,
    title: letterCopy.cover.title,
  });
  const coverTexture = track(new THREE.CanvasTexture(coverCanvas.canvas));
  coverTexture.colorSpace = THREE.SRGBColorSpace;
  coverTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const moteCanvas = makeCanvas(64, 64);
  paintRadialSprite(moteCanvas.ctx, 64, [
    [0, 'rgba(255, 235, 214, 0.95)'],
    [0.4, 'rgba(255, 190, 220, 0.35)'],
    [1, 'rgba(255, 190, 220, 0)'],
  ]);
  const moteTexture = track(new THREE.CanvasTexture(moteCanvas.canvas));
  moteTexture.colorSpace = THREE.SRGBColorSpace;

  const glowCanvas = makeCanvas(256, 256);
  paintRadialSprite(glowCanvas.ctx, 256, [
    [0, 'rgba(255, 150, 200, 0.55)'],
    [0.45, 'rgba(168, 85, 247, 0.28)'],
    [1, 'rgba(34, 211, 238, 0)'],
  ]);
  const glowTexture = track(new THREE.CanvasTexture(glowCanvas.canvas));
  glowTexture.colorSpace = THREE.SRGBColorSpace;

  /* --- materials -------------------------------------------------- */
  const paperMaterial = track(
    new THREE.MeshStandardMaterial({
      map: kraftTexture,
      roughness: 0.88,
      metalness: 0.04,
      side: THREE.DoubleSide,
    }),
  );
  const interiorMaterial = track(
    new THREE.MeshStandardMaterial({
      map: kraftTexture,
      color: 0xb59a6e,
      roughness: 0.95,
      metalness: 0.02,
      side: THREE.DoubleSide,
    }),
  );
  const pageMaterial = (texture: ThreeNS.Texture, color: number) =>
    track(new THREE.MeshStandardMaterial({ map: texture, color, roughness: 0.92, metalness: 0 }));
  const leftPageMaterial = pageMaterial(spreadTexture, 0xefe4ca);
  const rightPageMaterial = pageMaterial(spreadRightTexture, 0xefe4ca);
  const coverMaterial = pageMaterial(coverTexture, 0xefe4ca);
  const cardBackMaterial = pageMaterial(kraftTexture, 0xf3e3c6);

  const waxCanvas = makeCanvas(512, 512);
  paintWax(waxCanvas.ctx, 512);
  const waxTexture = track(new THREE.CanvasTexture(waxCanvas.canvas));
  waxTexture.colorSpace = THREE.SRGBColorSpace;
  waxTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const waxMaterial = track(
    new THREE.MeshStandardMaterial({
      map: waxTexture,
      // The painted heart doubles as a height map, so the key light picks out
      // the pressed groove instead of it being a flat decal.
      bumpMap: waxTexture,
      bumpScale: 0.9,
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.02,
      transparent: true,
      opacity: 1,
    }),
  );


  /* --- lights ----------------------------------------------------- */
  scene.add(new THREE.AmbientLight(0xffe9d5, 0.5));

  const keyLight = new THREE.DirectionalLight(0xfff6ec, 1.45);
  keyLight.position.set(3.2, 4.6, 5.4);
  scene.add(keyLight);

  const pinkRim = new THREE.PointLight(0xff4d94, 8, 0, 2);
  pinkRim.position.set(-5.5, -2, 4);
  scene.add(pinkRim);

  const cyanRim = new THREE.PointLight(0x22d3ee, 6, 0, 2);
  cyanRim.position.set(5, 2.4, 3.4);
  scene.add(cyanRim);

  /* --- stage ------------------------------------------------------ */
  const rig = new THREE.Group();
  scene.add(rig);

  const letter = new THREE.Group();
  rig.add(letter);

  // Envelope body with real thickness; its front face is the dark interior.
  const bodyMaterials = [
    paperMaterial, // +x right edge
    paperMaterial, // -x left edge
    paperMaterial, // +y top edge
    paperMaterial, // -y bottom edge
    interiorMaterial, // +z front (inside of the envelope)
    paperMaterial, // -z back
  ];
  const bodyGeometry = track(new THREE.BoxGeometry(W, H, D));
  const body = new THREE.Mesh(bodyGeometry, bodyMaterials);
  body.position.z = -D / 2 - 0.015;
  letter.add(body);

  // Front pocket, folded up over the lower half.
  const pocketShape = new THREE.Shape();
  pocketShape.moveTo(-W / 2, -H / 2);
  pocketShape.lineTo(W / 2, -H / 2);
  pocketShape.lineTo(W / 2, H * 0.26);
  pocketShape.lineTo(0, H * 0.08);
  pocketShape.lineTo(-W / 2, H * 0.26);
  pocketShape.closePath();
  const pocketGeometry = track(new THREE.ShapeGeometry(pocketShape));
  fitUVs(pocketGeometry);
  const pocket = new THREE.Mesh(pocketGeometry, paperMaterial);
  pocket.position.z = 0.008;
  letter.add(pocket);

  // Flap: hinged at the top edge, tip reaching the middle of the envelope.
  const flapPivot = new THREE.Group();
  flapPivot.position.set(0, H / 2, 0.02);
  letter.add(flapPivot);

  const flapShape = new THREE.Shape();
  flapShape.moveTo(-W / 2, 0);
  flapShape.lineTo(W / 2, 0);
  flapShape.lineTo(W / 2, -H * 0.42);
  flapShape.lineTo(0, -H * 0.62);
  flapShape.lineTo(-W / 2, -H * 0.42);
  flapShape.closePath();
  const flapGeometry = track(new THREE.ShapeGeometry(flapShape));
  fitUVs(flapGeometry);
  const flap = new THREE.Mesh(flapGeometry, paperMaterial);
  flapPivot.add(flap);

  // Crease shading under the flap tip, so the fold reads at a glance.
  const creaseShape = new THREE.Shape();
  creaseShape.moveTo(-W / 2, -H * 0.42);
  creaseShape.lineTo(0, -H * 0.62);
  creaseShape.lineTo(W / 2, -H * 0.42);
  creaseShape.lineTo(W / 2, -H * 0.5);
  creaseShape.lineTo(0, -H * 0.68);
  creaseShape.lineTo(-W / 2, -H * 0.5);
  creaseShape.closePath();
  const creaseGeometry = track(new THREE.ShapeGeometry(creaseShape));
  const crease = new THREE.Mesh(
    creaseGeometry,
    track(
      new THREE.MeshBasicMaterial({ color: 0x3a2410, transparent: true, opacity: 0.15, side: THREE.DoubleSide }),
    ),
  );
  crease.position.z = 0.004;
  flapPivot.add(crease);

  // Wax seal riding on the flap tip: a poured blob with an uneven edge, a domed
  // top and the heart pressed in as a raised signet cord.
  const seal = new THREE.Group();
  seal.position.set(0, -H * 0.62, 0.02);
  flapPivot.add(seal);

  // Three's lathe faces outwards only when the profile runs bottom to top, so
  // the apex-first profile is reversed here; otherwise the dome renders inside
  // out and you see the envelope through it.
  const waxProfilePoints = waxProfile().reverse().map(([r, y]) => new THREE.Vector2(r, y));
  const blobGeometry = track(new THREE.LatheGeometry(waxProfilePoints, 72));
  // Push the silhouette in and out so the pour is not a printed circle.
  const blobPositions = blobGeometry.getAttribute('position') as ThreeNS.BufferAttribute;
  for (let i = 0; i < blobPositions.count; i++) {
    const x = blobPositions.getX(i);
    const z = blobPositions.getZ(i);
    const angle = Math.atan2(z, x);
    const scale = waxRadius(angle, WAX.seed);
    blobPositions.setX(i, x * scale);
    blobPositions.setZ(i, z * scale);
  }
  blobPositions.needsUpdate = true;
  blobGeometry.computeVertexNormals();
  // Painted wax needs a top-down projection, not the lathe's wrap-around UVs.
  planarSealUVs(blobGeometry, WAX.radius * 1.1);
  const blob = new THREE.Mesh(blobGeometry, waxMaterial);
  // The lathe is built around +Y; the seal faces the front of the envelope.
  blob.rotation.x = Math.PI / 2;
  seal.add(blob);

  // Folded card: a left page and a cover hinged down the middle, hidden in the
  // envelope until it rises out and opens into the full letter.
  const cardGroup = new THREE.Group();
  cardGroup.position.set(0, CARD_REST_Y, CARD_REST_Z);
  letter.add(cardGroup);

  const leftPage = new THREE.Mesh(
    track(new THREE.PlaneGeometry(CARD.pageWidth, CARD.pageHeight)),
    leftPageMaterial,
  );
  leftPage.position.set(-CARD.pageWidth / 2, 0, 0);
  cardGroup.add(leftPage);

  const cardBack = new THREE.Mesh(
    track(new THREE.PlaneGeometry(CARD.pageWidth, CARD.pageHeight)),
    cardBackMaterial,
  );
  cardBack.position.set(-CARD.pageWidth / 2, 0, -CARD.faceGap);
  cardBack.rotation.y = Math.PI;
  cardGroup.add(cardBack);

  const coverPivot = new THREE.Group();
  coverPivot.position.set(0, 0, CARD.coverOffset);
  coverPivot.rotation.y = COVER_CLOSED_ANGLE;
  cardGroup.add(coverPivot);

  const rightPage = new THREE.Mesh(
    track(new THREE.PlaneGeometry(CARD.pageWidth, CARD.pageHeight)),
    rightPageMaterial,
  );
  rightPage.position.set(CARD.pageWidth / 2, 0, CARD.faceGap / 2);
  coverPivot.add(rightPage);

  const coverFace = new THREE.Mesh(
    track(new THREE.PlaneGeometry(CARD.pageWidth, CARD.pageHeight)),
    coverMaterial,
  );
  coverFace.position.set(CARD.pageWidth / 2, 0, -CARD.faceGap / 2);
  coverFace.rotation.y = Math.PI;
  coverPivot.add(coverFace);

  // Glow card behind the letter + drifting dust motes.
  const glow = new THREE.Mesh(
    track(new THREE.PlaneGeometry(7.4, 5.4)),
    track(
      new THREE.MeshBasicMaterial({
        map: glowTexture,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    ),
  );
  glow.position.set(0, 0.1, -1.3);
  scene.add(glow);

  const MOTE_COUNT = 70;
  const motePositions = new Float32Array(MOTE_COUNT * 3);
  for (let i = 0; i < MOTE_COUNT; i++) {
    motePositions[i * 3] = (Math.random() - 0.5) * 7;
    motePositions[i * 3 + 1] = (Math.random() - 0.5) * 5;
    motePositions[i * 3 + 2] = (Math.random() - 0.5) * 3 - 0.4;
  }
  const moteGeometry = track(new THREE.BufferGeometry());
  moteGeometry.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
  const moteMaterial = track(
    new THREE.PointsMaterial({
      size: 0.075,
      map: moteTexture,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    }),
  );
  const motes = new THREE.Points(moteGeometry, moteMaterial);
  scene.add(motes);

  /* --- animation state -------------------------------------------- */
  let progress = 0;
  let target = 0;
  let opened = false;
  let notified = false;
  let elapsed = 0;
  /** Loop time when the letter was opened, for the settle fade. */
  let openedAt = 0;
  let paused = false;
  let raf = 0;
  let dragYaw = 0;
  let dragPitch = 0;
  let dragTargetYaw = 0;
  let dragTargetPitch = 0;
  let dragging = false;
  let pointerId: number | null = null;
  let downX = 0;
  let downY = 0;
  let travelled = 0;
  let lastFrameTime = 0;
  let warmupFrames = 0;
  /** Narrow canvases read the card one page at a time. */
  let paged = false;
  let page = 0;
  let pageAnim = 0;

  function notifyPage(): void {
    options.onPage?.(page, paged ? 2 : 1);
  }

  function apply(state: LetterOpenState): void {
    flapPivot.rotation.x = state.flapAngle;
    waxMaterial.opacity = state.sealOpacity;
    seal.visible = state.sealOpacity > 0.01;
    seal.scale.setScalar(state.sealScale);
    seal.position.y = -H * 0.62 - state.sealDrop;

    cardGroup.position.set(0, state.cardY, state.cardZ);
    cardGroup.rotation.x = state.cardTilt;
    cardGroup.scale.setScalar(state.cardScale);
    coverPivot.rotation.y = state.coverAngle;

    // Frame the envelope, then tighten onto the card as it is presented. On a
    // paged canvas the frame tightens further and pans sideways between pages.
    // The distance is measured at the subject's depth, because the presented
    // card sits CARD_PRESENT_Z nearer the camera than the envelope does.
    const halfFov = Math.tan((camera.fov * Math.PI) / 360);
    const spread = state.cameraDolly;
    const single = paged ? spread : 0;
    const fitWidth = lerp(lerp(FIT.sealed.width, FIT.spread.width, spread), FIT.page.width, single);
    const fitHeight = lerp(lerp(FIT.sealed.height, FIT.spread.height, spread), FIT.page.height, single);
    const depth = lerp(0, state.cardZ, spread);
    const distance =
      Math.max(fitHeight / 2 / halfFov, fitWidth / 2 / (halfFov * camera.aspect)) + depth;
    const pan = (pageAnim - 0.5) * (CARD.pageWidth + PAGE_GAP) * single;
    camera.position.z = distance;
    camera.position.x = pan;
    camera.position.y = lerp(0.6, 0.5, state.cameraDolly);
    camera.lookAt(pan, lerp(0.05, CARD_SETTLE_Y - 0.02, state.cameraDolly), 0);

    (glow.material as ThreeNS.MeshBasicMaterial).opacity = 0.16 + 0.4 * state.glow;
    pinkRim.intensity = 8 + 18 * state.glow;
    cyanRim.intensity = 6 + 14 * state.glow;
  }

  let size = { width: 0, height: 0 };

  function syncSize(): void {
    const measuredWidth = host.clientWidth;
    const measuredHeight = host.clientHeight;
    // Not laid out yet: keep the previous size instead of inventing one, and let
    // the observer or the warm-up frames call us again.
    if (!Number.isFinite(measuredWidth) || !Number.isFinite(measuredHeight)) return;
    if (measuredWidth < 1 || measuredHeight < 1) return;
    const width = Math.round(measuredWidth);
    const height = Math.round(measuredHeight);
    if (width === size.width && height === size.height) return;
    size = { width, height };
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    const nextPaged = camera.aspect < SINGLE_PAGE_ASPECT;
    if (nextPaged !== paged) {
      paged = nextPaged;
      if (!paged) {
        page = 0;
        pageAnim = 0;
      }
      notifyPage();
    }
    // A parked loop still has to repaint at the new size.
    if (!raf) {
      apply(letterOpenState(progress));
      renderer.render(scene, camera);
    }
  }

  function frame(now: number): void {
    // Layout can settle after mount, so re-measure for the first few frames.
    if (warmupFrames < 3) {
      warmupFrames++;
      syncSize();
    }
    if (!lastFrameTime) lastFrameTime = now;
    const rawDelta = Math.max(0, (now - lastFrameTime) / 1000);
    lastFrameTime = now;
    // Smooth motion uses a clamped delta; the reveal itself is wall-clock based
    // so a slow renderer cannot stretch the animation out.
    const dt = Math.min(rawDelta, 0.05);
    const step = Math.min(rawDelta, 0.25);
    elapsed += dt;
    watchFrameTime(rawDelta);

    if (progress < target) {
      progress = Math.min(target, progress + step / OPEN_SECONDS);
      if (progress >= 1 && !notified) {
        notified = true;
        options.onOpened?.();
      }
    }

    const state = letterOpenState(progress);
    // The envelope stops drifting as the card is presented, so it stays readable,
    // and the sway fades out entirely once the reveal is over.
    const settle = opened ? Math.max(0, 1 - (elapsed - openedAt) / SETTLE_SECONDS) : 1;
    const calm = (1 - 0.85 * state.cameraDolly) * settle;
    const sway = reducedMotion ? { yaw: 0, pitch: 0, bob: 0 } : idleSway(elapsed);
    dragYaw += (dragTargetYaw - dragYaw) * Math.min(1, dt * 6);
    dragPitch += (dragTargetPitch - dragPitch) * Math.min(1, dt * 6);
    pageAnim += (page - pageAnim) * Math.min(1, dt * 5);
    rig.rotation.y = BASE_TILT.yaw + sway.yaw * calm + dragYaw;
    rig.rotation.x = BASE_TILT.pitch + sway.pitch * calm + dragPitch;
    letter.position.y = sway.bob * calm;

    if (!reducedMotion && calm > 0) {
      const positions = moteGeometry.getAttribute('position') as ThreeNS.BufferAttribute;
      for (let i = 0; i < MOTE_COUNT; i++) {
        let y = positions.getY(i) + dt * (0.06 + (i % 7) * 0.012);
        if (y > 2.6) y = -2.6;
        positions.setY(i, y);
        positions.setX(i, positions.getX(i) + Math.sin(elapsed * 0.5 + i) * dt * 0.02);
      }
      positions.needsUpdate = true;
    }

    // Once the card has settled there is nothing to animate, so paint only often
    // enough to keep the drawing buffer alive. A hard stop is not an option:
    // without `preserveDrawingBuffer` the browser may discard the buffer, and a
    // canvas nothing redraws can composite blank.
    if (isSettled() && now - lastPaintAt < IDLE_REPAINT_MS) {
      raf = requestAnimationFrame(frame);
      return;
    }

    apply(state);
    renderer.render(scene, camera);
    lastPaintAt = now;
    raf = requestAnimationFrame(frame);
  }

  /**
   * True once the reveal is over and nothing is being touched: the card holds
   * still while it is read instead of drifting under the reader's eyes.
   */
  function isSettled(): boolean {
    if (paused || dragging || !notified || progress < 1) return false;
    if (elapsed - openedAt < SETTLE_SECONDS) return false;
    if (Math.abs(page - pageAnim) > 0.002) return false;
    if (Math.abs(dragTargetYaw - dragYaw) > 0.002) return false;
    return Math.abs(dragTargetPitch - dragPitch) <= 0.002;
  }

  /**
   * Drops the render resolution when the average frame time says the GPU is
   * behind. The opened card fills the screen, so on a weak GPU it is fill-rate
   * bound and a smaller buffer is the difference between smooth and stuttering.
   * The average matters more than any single frame: a renderer that misses
   * vsync alternates fast and slow frames instead of running slowly throughout.
   */
  function watchFrameTime(rawDelta: number): void {
    if (pixelRatio <= MIN_PIXEL_RATIO) return;
    // Ignore the first frame, tab wake-ups and other stalls that say nothing
    // about how expensive the scene is.
    if (rawDelta <= 0 || rawDelta >= 0.5) return;
    frameTime += rawDelta;
    frames++;
    if (frames < WARMUP_FRAMES) return;
    if (frameTime / frames <= SLOW_FRAME_SECONDS) {
      frames = 0;
      frameTime = 0;
      return;
    }
    pixelRatio = Math.max(MIN_PIXEL_RATIO, pixelRatio * QUALITY_STEP);
    frames = 0;
    frameTime = 0;
    applyQuality();
  }

  function applyQuality(): void {
    renderer.setPixelRatio(pixelRatio);
    if (size.width > 0 && size.height > 0) renderer.setSize(size.width, size.height);
  }

  function start(): void {
    if (paused || raf) return;
    lastFrameTime = 0;
    raf = requestAnimationFrame(frame);
  }

  function stop(): void {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  /* --- input ------------------------------------------------------ */
  function onPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    dragging = true;
    pointerId = event.pointerId;
    downX = event.clientX;
    downY = event.clientY;
    travelled = 0;
    canvas.setPointerCapture(event.pointerId);
    // The loop parks once the card is still; touching it wakes it up again.
    start();
  }

  function onPointerMove(event: PointerEvent): void {
    if (!dragging || event.pointerId !== pointerId) return;
    const dx = event.clientX - downX;
    const dy = event.clientY - downY;
    travelled = Math.max(travelled, Math.hypot(dx, dy));
    // Once the card is open on a paged canvas, horizontal drags turn pages.
    if (paged && opened) return;
    if (!reducedMotion) {
      dragTargetYaw = Math.max(-DRAG.yaw, Math.min(DRAG.yaw, dx * 0.003));
      dragTargetPitch = Math.max(-DRAG.pitch, Math.min(DRAG.pitch, dy * 0.0025));
    }
  }

  function endDrag(event: PointerEvent): void {
    if (!dragging || (pointerId !== null && event.pointerId !== pointerId)) return;
    dragging = false;
    pointerId = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (paged && opened) {
      const dx = event.clientX - downX;
      const dy = event.clientY - downY;
      if (travelled <= CLICK_SLOP) {
        // A tap turns the page, like tapping a card held in your hands.
        turnPage(1);
      } else if (Math.abs(dx) > PAGE_SWIPE && Math.abs(dx) > Math.abs(dy)) {
        turnPage(dx < 0 ? 1 : -1);
      }
      return;
    }
    if (travelled <= CLICK_SLOP) options.onTap?.();
  }

  function onContextLost(event: Event): void {
    event.preventDefault();
    stop();
    options.onError?.(new Error('WebGL context lost'));
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('webglcontextlost', onContextLost);

  // The observer only re-measures; the canvas keeps its own px size, so nothing
  // here can feed back into layout and trigger a ResizeObserver loop.
  const resizeObserver = new ResizeObserver(() => syncSize());
  resizeObserver.observe(host);
  syncSize();
  apply(letterOpenState(0));
  start();

  function open(): void {
    if (opened) return;
    opened = true;
    openedAt = elapsed;
    target = 1;
    // Re-centre any rotation the visitor left behind, so the card is presented head-on.
    dragTargetYaw = 0;
    dragTargetPitch = 0;
    if (reducedMotion) {
      progress = 1;
      pageAnim = page;
      if (!notified) {
        notified = true;
        options.onOpened?.();
      }
      apply(letterOpenState(1));
      renderer.render(scene, camera);
    } else {
      start();
    }
  }

  function turnPage(direction: 1 | -1): void {
    if (!opened || !paged) return;
    const next = Math.max(0, Math.min(1, page + direction));
    if (next === page) return;
    page = next;
    notifyPage();
    if (reducedMotion) {
      pageAnim = page;
      apply(letterOpenState(progress));
      renderer.render(scene, camera);
      return;
    }
    start();
  }

  return {
    open,
    turnPage,
    setPaused(next: boolean) {
      paused = next;
      if (paused) stop();
      else start();
    },
    dispose() {
      stop();
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', endDrag);
      canvas.removeEventListener('pointercancel', endDrag);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      for (const item of disposables) item.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (canvas.parentNode === host) host.removeChild(canvas);
    },
  };
}

