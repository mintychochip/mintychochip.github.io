import { describe, expect, it } from 'vitest';
import {
  CAMERA_WINDOW,
  CARD_LIFT_Y,
  CARD_PRESENT_Z,
  CARD_REST_Y,
  CARD_REST_Z,
  CARD_SETTLE_Y,
  COVER_CLOSED_ANGLE,
  COVER_OPEN_ANGLE,
  COVER_WINDOW,
  FLAP_OPEN_ANGLE,
  RISE_WINDOW,
  clamp01,
  easeInOutCubic,
  idleSway,
  letterOpenState,
  wrapLines,
  wrapMeasured,
  MIN_TYPE_SCALE,
  MAX_TYPE_SCALE,
  PAGE,
  fitCardLayout,
  layoutCardPages,
} from './letter3d';
import type { AnniversaryLetterCopy } from './letter-copy';

const FIXTURE_LETTER: AnniversaryLetterCopy = {
  cover: { kicker: 'a note', title: 'Sample Card' },
  greeting: 'Hello there,',
  paragraphs: [
    'This sample paragraph is long enough to fill a page of the card during layout tests. It talks about paper, ink, folds, and nothing private at all.',
    'Another sample paragraph keeps the second page occupied so the sign-off still has a place to land beside the body copy.',
    'A third sample paragraph exists only so the layout tests can measure height, scale, and order without using sealed copy.',
  ],
  signoff: 'Yours,',
  signature: 'A friend',
  postscript: 'More below.',
};

/** Deterministic stand-in for `ctx.measureText`: fixed advance per character. */
const stubMeasure = (text: string, fontPx: number) => text.length * fontPx * 0.62;
const measure = (text: string, fontPx: number, _weight: number) => stubMeasure(text, fontPx);

function pageText(page: { blocks: Array<{ lines: string[] }> }): string[] {
  return page.blocks.flatMap((block) => block.lines);
}

describe('letterOpenState', () => {
  it('starts with the envelope sealed and the card folded shut inside', () => {
    const state = letterOpenState(0);
    expect(state.flapAngle).toBe(0);
    expect(state.sealOpacity).toBe(1);
    expect(state.sealScale).toBe(1);
    expect(state.cardY).toBeCloseTo(CARD_REST_Y, 6);
    expect(state.cardZ).toBe(CARD_REST_Z);
    expect(state.cardTilt).toBe(0);
    expect(state.cardScale).toBeCloseTo(1, 6);
    expect(state.coverAngle).toBe(COVER_CLOSED_ANGLE);
    expect(state.cameraDolly).toBe(0);
    expect(state.done).toBe(false);
  });

  it('ends with the flap folded back and the letter spread open', () => {
    const state = letterOpenState(1);
    expect(state.flapAngle).toBeCloseTo(FLAP_OPEN_ANGLE, 6);
    expect(state.sealOpacity).toBe(0);
    expect(state.cardY).toBeCloseTo(CARD_SETTLE_Y, 6);
    expect(state.cardZ).toBeCloseTo(CARD_PRESENT_Z, 6);
    expect(state.cardScale).toBeGreaterThan(1.04);
    expect(state.coverAngle).toBe(COVER_OPEN_ANGLE);
    expect(state.cameraDolly).toBe(1);
    expect(state.done).toBe(true);
  });

  it('clamps progress outside 0..1 instead of producing wild transforms', () => {
    expect(letterOpenState(-5)).toEqual(letterOpenState(0));
    expect(letterOpenState(7)).toEqual(letterOpenState(1));
    expect(letterOpenState(Number.NaN)).toEqual(letterOpenState(0));
  });

  it('keeps the flap swinging forward and every transform finite', () => {
    let previousFlap = -Infinity;
    for (let i = 0; i <= 200; i++) {
      const state = letterOpenState(i / 200);
      for (const value of Object.values(state)) {
        if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
      }
      expect(state.flapAngle).toBeGreaterThanOrEqual(previousFlap);
      previousFlap = state.flapAngle;
    }
  });

  it('lifts the card clear of the envelope, then settles it for reading', () => {
    let previousY = -Infinity;
    for (let t = 0; t <= RISE_WINDOW.end; t += 0.01) {
      const state = letterOpenState(t);
      expect(state.cardY).toBeGreaterThanOrEqual(previousY);
      previousY = state.cardY;
    }
    // Fully clear of the envelope by the time the cover starts to open.
    expect(letterOpenState(RISE_WINDOW.end).cardY).toBeCloseTo(CARD_LIFT_Y, 5);

    let previousSettle = CARD_LIFT_Y + 1;
    for (let t = RISE_WINDOW.end; t <= 1.0001; t += 0.01) {
      const state = letterOpenState(Math.min(t, 1));
      expect(state.cardY).toBeLessThanOrEqual(previousSettle + 1e-9);
      expect(state.cardY).toBeGreaterThanOrEqual(CARD_SETTLE_Y - 1e-9);
      previousSettle = state.cardY;
    }
  });

  it('moves the card forward out of the envelope and never back', () => {
    let previousZ = -Infinity;
    for (let i = 0; i <= 200; i++) {
      const state = letterOpenState(i / 200);
      expect(state.cardZ).toBeGreaterThanOrEqual(previousZ);
      previousZ = state.cardZ;
    }
    expect(previousZ).toBeCloseTo(CARD_PRESENT_Z, 6);
  });

  it('keeps the card shut until it has cleared the envelope, then opens it', () => {
    for (let t = 0; t <= RISE_WINDOW.end; t += 0.01) {
      expect(letterOpenState(t).coverAngle).toBe(COVER_CLOSED_ANGLE);
    }

    let previous = COVER_CLOSED_ANGLE;
    for (let t = RISE_WINDOW.end; t <= 1.0001; t += 0.01) {
      const state = letterOpenState(Math.min(t, 1));
      expect(state.coverAngle).toBeGreaterThanOrEqual(previous);
      expect(state.coverAngle).toBeLessThanOrEqual(COVER_OPEN_ANGLE);
      previous = state.coverAngle;
    }
    expect(letterOpenState(COVER_WINDOW.end).coverAngle).toBe(COVER_OPEN_ANGLE);
    expect(letterOpenState(CAMERA_WINDOW.end).coverAngle).toBe(COVER_OPEN_ANGLE);
  });

  it('breaks the seal before the flap opens', () => {
    expect(letterOpenState(0.2).sealOpacity).toBe(0);
    expect(letterOpenState(0.02).sealOpacity).toBeGreaterThan(0.5);
  });
});

describe('easing and sway helpers', () => {
  it('pins the easing endpoints and stays monotonic', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 6);
    let previous = -Infinity;
    for (let i = 0; i <= 100; i++) {
      const value = easeInOutCubic(i / 100);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
    expect(clamp01(Number.POSITIVE_INFINITY)).toBe(1);
  });

  it('keeps the idle float subtle', () => {
    for (let t = 0; t < 40; t += 0.37) {
      const sway = idleSway(t);
      expect(Math.abs(sway.yaw)).toBeLessThanOrEqual(0.14);
      expect(Math.abs(sway.pitch)).toBeLessThanOrEqual(0.06);
      expect(Math.abs(sway.bob)).toBeLessThanOrEqual(0.06);
    }
  });
});

describe('layoutCardPages', () => {
  it('puts the greeting on the left and the sign-off on the right', () => {
    const layout = layoutCardPages(FIXTURE_LETTER, { measure });
    expect(layout.left.blocks[0]?.kind).toBe('greeting');
    expect(layout.left.blocks[0]?.lines.join(' ')).toBe(FIXTURE_LETTER.greeting);
    expect(layout.right.blocks.map((block) => block.kind)).toEqual([
      'body',
      'signoff',
      'signature',
      'postscript',
    ]);
  });

  it('sets every paragraph exactly once, in order, across the two pages', () => {
    const paragraphs = ['one', 'two', 'three', 'four', 'five'];
    const letter = { ...FIXTURE_LETTER, paragraphs };
    const layout = layoutCardPages(letter, { measure });
    const drawn = [...pageText(layout.left), ...pageText(layout.right)].join(' ');
    for (const paragraph of paragraphs) expect(drawn).toContain(paragraph);
    expect(pageText(layout.left).concat(pageText(layout.right)).join(' ').match(/one|two|three|four|five/g)).toEqual(paragraphs);
  });

  it('fills both pages of the real letter without overflowing either', () => {
    const layout = fitCardLayout(FIXTURE_LETTER, { measure });
    expect(layout.fits).toBe(true);
    expect(layout.left.used).toBeLessThanOrEqual(layout.left.available);
    expect(layout.right.used).toBeLessThanOrEqual(layout.right.available);
    // The type grows to fill the card, but stays inside the bounds that keep a
    // long letter legible on a phone.
    expect(layout.scale).toBeLessThanOrEqual(MAX_TYPE_SCALE);
    expect(layout.scale).toBeGreaterThanOrEqual(MIN_TYPE_SCALE);
    expect(layout.left.used / layout.left.available).toBeGreaterThan(0.55);
    expect(layout.right.used / layout.right.available).toBeGreaterThan(0.55);
  });

  it('balances the two pages by measured height, not by paragraph count', () => {
    const letter = {
      ...FIXTURE_LETTER,
      // One huge paragraph and two tiny ones: a 2/1 count split would stack the
      // huge one plus a tiny one on the left.
      paragraphs: ['word '.repeat(90).trim(), 'tiny one', 'tiny two'],
    };
    const layout = fitCardLayout(letter, { measure });
    expect(layout.fits).toBe(true);
    expect(layout.left.used).toBeLessThanOrEqual(layout.left.available);
    expect(layout.right.used).toBeLessThanOrEqual(layout.right.available);
    // Both tiny paragraphs move to the right, where they balance the huge one.
    expect(pageText(layout.left).join(' ')).not.toContain('tiny');
    expect(pageText(layout.right).join(' ')).toContain('tiny one');
    expect(pageText(layout.right).join(' ')).toContain('tiny two');
    expect(layout.left.used).toBeGreaterThan(layout.right.used);
  });

  it('shrinks the type rather than letting a long letter run off the page', () => {
    const letter = { ...FIXTURE_LETTER, paragraphs: ['word '.repeat(400).trim()] };
    const layout = fitCardLayout(letter, { measure });
    expect(layout.fits).toBe(true);
    expect(layout.scale).toBeLessThan(1);
    expect(layout.scale).toBeGreaterThanOrEqual(MIN_TYPE_SCALE);
    expect(pageText(layout.left).concat(pageText(layout.right)).join(' ')).toContain('word word');
  });

  it('reports copy that cannot fit even at the smallest type instead of hiding it', () => {
    const letter = { ...FIXTURE_LETTER, paragraphs: ['word '.repeat(6000).trim()] };
    const layout = fitCardLayout(letter, { measure });
    expect(layout.fits).toBe(false);
    expect(layout.scale).toBe(MIN_TYPE_SCALE);
    expect(pageText(layout.left).length + pageText(layout.right).length).toBeGreaterThan(0);
  });

  it('lays out a letter with no paragraphs without inventing any', () => {
    const layout = layoutCardPages({ ...FIXTURE_LETTER, paragraphs: [] }, { measure });
    expect(layout.left.blocks.map((block) => block.kind)).toEqual(['greeting']);
    expect(layout.left.blocks[0].lines.join(' ')).toBe(FIXTURE_LETTER.greeting);
    expect(pageText(layout.right).join(' ')).toContain(FIXTURE_LETTER.signoff);
    expect(pageText(layout.right).join(' ')).toContain(FIXTURE_LETTER.signature);
    expect(layout.fits).toBe(true);
  });

  it('scales type with the page, keeping the whole letter at any resolution', () => {
    const small = layoutCardPages(FIXTURE_LETTER, { measure, pageWidth: PAGE.width / 2, pageHeight: PAGE.height / 2 });
    const large = layoutCardPages(FIXTURE_LETTER, { measure, pageWidth: PAGE.width * 2, pageHeight: PAGE.height * 2 });
    const words = (page: { left: { blocks: Array<{ lines: string[] }> }; right: { blocks: Array<{ lines: string[] }> } }) =>
      [...pageText(page.left), ...pageText(page.right)].join(' ');
    expect(words(small)).toBe(words(large));
    expect(words(small)).toContain(FIXTURE_LETTER.paragraphs[1]);
    expect(small.fits).toBe(true);
    expect(large.fits).toBe(true);
    // Type is specified for a PAGE.width page, so it grows with the texture
    // instead of staying fixed while the page gets bigger.
    const bodySize = (page: typeof small) => page.left.blocks.find((block) => block.kind === 'body')?.fontPx ?? 0;
    expect(bodySize(large)).toBeGreaterThan(bodySize(small) * 3.5);
    expect(large.left.available).toBe(small.left.available * 4);
  });
});

describe('wrapMeasured', () => {
  it('wraps at the width limit without losing words', () => {
    const text = 'Before your passes one small truth about every ordinary day';
    const lines = wrapMeasured(text, 150, 10, 400, measure);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(stubMeasure(line, 10)).toBeLessThanOrEqual(150);
    expect(lines.join(' ')).toBe(text);
  });

  it('keeps a word that is wider than the column on its own line', () => {
    expect(wrapMeasured('supercalifragilistic', 40, 10, 400, measure)).toEqual(['supercalifragilistic']);
  });
 });

describe('wrapLines', () => {
  const stub = (charWidth: number) =>
    ({ measureText: (text: string) => ({ width: text.length * charWidth }) }) as unknown as CanvasRenderingContext2D;

  it('wraps at the width limit without losing words', () => {
    const text = 'Before your passes one small truth about every ordinary day';
    const lines = wrapLines(stub(10), text, 150);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(line.length * 10).toBeLessThanOrEqual(150);
    expect(lines.join(' ')).toBe(text);
  });

  it('keeps an over-long single word on its own line', () => {
    expect(wrapLines(stub(10), 'supercalifragilistic', 40)).toEqual(['supercalifragilistic']);
  });
});
