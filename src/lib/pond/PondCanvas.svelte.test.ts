// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import PondCanvas from './PondCanvas.svelte';
import type { SceneName } from './scenes';

/** Every picture a pond puts on its canvas, as packed pixels. */
let drawn: Uint32Array[] = [];
/** The size callbacks the pond's resize observers were given. */
let resizes: ResizeObserverCallback[] = [];

beforeEach(() => {
  drawn = [];
  resizes = [];
  vi.stubGlobal('ResizeObserver', class {
    constructor(cb: ResizeObserverCallback) {
      resizes.push(cb);
    }
    observe() {}
    disconnect() {}
  });
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    disconnect() {}
  });
  // jsdom has no canvas: the pond gets a context that records what it draws. The stub covers only what the pond calls,
  // so it is cast to the full context type.
  const context = {
    createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
    putImageData: (img: ImageData) => drawn.push(new Uint32Array(img.data.slice().buffer)),
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

/** Mounts a pond and gives it a size, the way the browser's resize observer would. */
function pondWith(scene: SceneName) {
  const props = $state<{ seed: string; scene: SceneName }>({ seed: 'card', scene });
  const app = mount(PondCanvas, { target: document.body, props });
  flushSync();
  resizes.at(-1)?.([{ contentRect: { width: 360, height: 240 } } as ResizeObserverEntry], {} as ResizeObserver);
  return { props, app };
}

describe('PondCanvas', () => {
  it('paints the world of the scene it is handed, also when the scene changes after it mounts', () => {
    const born = pondWith('cave');
    const cave = drawn.at(-1);
    unmount(born.app);
    drawn = [];

    const swapped = pondWith('waterfall');
    const waterfall = drawn.at(-1);
    swapped.props.scene = 'cave';
    flushSync();
    unmount(swapped.app);

    expect(cave).toBeDefined();
    expect(waterfall).toBeDefined();
    expect(drawn.at(-1)).toEqual(cave);
    expect(drawn.at(-1)).not.toEqual(waterfall);
  });
});
