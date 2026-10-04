/// <reference lib="dom" />

/** Every pond animates on one shared clock at this rate. */
export const FPS = 12;
const STEP = 1000 / FPS;

interface Sub {
  visible: boolean;
  frame: number;
  draw: (t: number) => void;
}

const subs = new Set<Sub>();
let raf = 0;
let last = 0;

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function wanted() {
  if (document.hidden || prefersReducedMotion()) return false;
  for (const s of subs) if (s.visible) return true;
  return false;
}

function loop(now: number) {
  raf = 0;
  if (!wanted()) return;
  if (now - last >= STEP - 4) {
    last = now;
    for (const s of subs) {
      if (!s.visible) continue;
      s.frame++;
      s.draw(s.frame / FPS);
    }
  }
  raf = requestAnimationFrame(loop);
}

function kick() {
  if (!raf && wanted()) raf = requestAnimationFrame(loop);
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', kick);
  if (typeof matchMedia === 'function') matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', kick);
}

/**
 * Registers a drawing callback. Each subscriber keeps its own clock that only advances while it is
 * visible, so a scene scrolled away resumes where it left off instead of jumping ahead.
 */
export function subscribe(draw: (t: number) => void, startFrame = 0) {
  const sub: Sub = { visible: false, frame: startFrame, draw };
  subs.add(sub);
  return {
    get time() {
      return sub.frame / FPS;
    },
    setVisible(v: boolean) {
      sub.visible = v;
      kick();
    },
    stop() {
      subs.delete(sub);
    },
  };
}
