<script lang="ts" module>
  /** Art pixels are 3 CSS px, nudged so each covers a whole number of device pixels. */
  export function pixelScale() {
    const dpr = window.devicePixelRatio || 1;
    return Math.max(2, Math.round(3 * dpr)) / dpr;
  }

  /**
   * The box `el` covers on `pond`, as fractions for a scene's `clear` option, with headroom so no frog
   * sits behind it. Undefined when either is missing or `el` sits below the pond (as titles do on phones).
   */
  export function clearBoxOf(el: Element | undefined, pond: Element | null | undefined) {
    if (!el || !pond) return undefined;
    const a = pond.getBoundingClientRect(), t = el.getBoundingClientRect();
    if (t.top >= a.bottom - 2) return undefined;
    const pad = 14;
    return [
      Math.max(0, (t.left - a.left - pad) / a.width),
      Math.max(0, (t.top - a.top - 26) / a.height),
      Math.min(1, (t.right - a.left + pad) / a.width),
      Math.min(1, (t.bottom - a.top + 6) / a.height),
    ] as const;
  }

  /** What a parent can do with a bound pond. */
  export interface PondHandle {
    /** The scene notices something nearby, such as its card being hovered. */
    react(): void;
    /** Bumpy goes to the pink frog and they share a heart; ponds without both frogs ignore it. */
    meet(): void;
  }
</script>

<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { Field, packPalette, quantize } from './field';
  import type { Scene, SceneOpts } from './life';
  import { INK_COLORS, PALETTES, type PaletteName } from './palette';
  import { SCENES, makeScene, type SceneName } from './scenes';
  import { prefersReducedMotion, subscribe, type Clock } from './ticker';

  type Options = Omit<SceneOpts, 'seed' | 'still'>;
  const inks = packPalette(INK_COLORS);

  interface Props {
    seed: string;
    /** The world the frogs live in. */
    scene?: SceneName;
    /** Paints the scene in another palette; otherwise it has its own. */
    palette?: PaletteName;
    /** Scene options, or a function of the art size in pixels. */
    options?: Options | ((W: number, H: number) => Options);
    /** Pointer movement and clicks reach the scene. */
    interactive?: boolean;
  }

  let { seed, scene = 'lake', palette, options = {}, interactive = false }: Props = $props();

  let wrap: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let world: Scene | null = null;
  let field: Field | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let img: ImageData | null = null;
  let px: Uint32Array | null = null;
  let W = 0, H = 0;
  /** The scene and seed the current world was made for. */
  let built = '';
  /** The CSS size the pond was last given. */
  let box = { w: 0, h: 0 };
  let clock: Clock | null = null;
  const still = prefersReducedMotion();
  const shades = $derived(PALETTES[palette ?? SCENES[scene].palette]);
  const colors = $derived(packPalette(shades));
  const bgColor = $derived(shades[0]);

  function draw(t: number) {
    if (!world || !field || !ctx || !img || !px) return;
    world.render(t, field);
    quantize(field, colors, px, inks);
    ctx.putImageData(img, 0, 0);
  }

  function build(cssW: number, cssH: number) {
    box = { w: cssW, h: cssH };
    const S = pixelScale();
    const w = Math.max(8, Math.ceil(cssW / S)), h = Math.max(8, Math.ceil(cssH / S));
    const key = `${scene}\n${seed}`;
    if (w === W && h === H && world && key === built) return;
    built = key;
    W = w;
    H = h;
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = `${W * S}px`;
    canvas.style.height = `${H * S}px`;
    ctx = canvas.getContext('2d');
    if (!ctx) return;
    img = ctx.createImageData(W, H);
    px = new Uint32Array(img.data.buffer);
    field = new Field(W, H);
    const opts = typeof options === 'function' ? options(W, H) : options;
    world = makeScene(scene, W, H, { ...opts, seed, still });
    draw(clock?.time ?? 0);
  }

  /** The scene notices something nearby, such as its card being hovered. */
  export function react() {
    world?.react();
  }

  /** Bumpy goes to the pink frog and they share a heart; ponds without both frogs ignore it. */
  export function meet() {
    world?.meet();
  }

  function toArt(e: MouseEvent): [number, number] {
    const r = canvas.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
  }

  let lastPoke = 0;
  function onMove(e: PointerEvent) {
    if (!world) return;
    const [x, y] = toArt(e);
    world.look(x, y);
    if (e.timeStamp - lastPoke > 160) {
      lastPoke = e.timeStamp;
      world.poke(x, y);
    }
  }

  function onClick(e: MouseEvent) {
    world?.tap(...toArt(e));
  }

  onMount(() => {
    clock = subscribe(draw);
    const ro = new ResizeObserver(([entry]) => build(entry.contentRect.width, entry.contentRect.height));
    ro.observe(wrap);
    const io = new IntersectionObserver(([entry]) => clock?.setVisible(entry.isIntersecting && !still));
    io.observe(wrap);
    return () => {
      ro.disconnect();
      io.disconnect();
      clock?.stop();
    };
  });

  // A pond can be handed another scene or seed after it mounts, as a keyed list does when its data swaps: its palette
  // follows the scene at once, so its world has to as well.
  $effect(() => {
    const key = `${scene}\n${seed}`;
    untrack(() => {
      if (world && key !== built) build(box.w, box.h);
    });
  });
</script>

<div class="pond" bind:this={wrap} style:background={bgColor}>
  <canvas
    bind:this={canvas}
    aria-hidden="true"
    class:live={interactive}
    onpointermove={interactive ? onMove : undefined}
    onclick={interactive ? onClick : undefined}
  ></canvas>
</div>

<style>
  .pond {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  canvas {
    position: absolute;
    top: 0;
    left: 0;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }
  .live {
    cursor: var(--cursor-pointer);
  }
</style>
