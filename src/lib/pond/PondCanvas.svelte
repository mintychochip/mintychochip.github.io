<script lang="ts">
  import { onMount } from 'svelte';
  import { Field, packPalette, quantize } from './field';
  import { INK_COLORS, PALETTES, type PaletteName } from './palette';
  import { nightPond, type NightOpts, type Scene } from './night';
  import { prefersReducedMotion, subscribe } from './ticker';

  type SceneOpts = Omit<NightOpts, 'seed' | 'still'>;
  const inks = packPalette(INK_COLORS);

  interface Props {
    seed: string;
    palette?: PaletteName;
    /** Scene options, or a function of the art size in pixels. */
    options?: SceneOpts | ((W: number, H: number) => SceneOpts);
    /** Pointer movement and clicks reach the scene. */
    interactive?: boolean;
  }

  let { seed, palette = 'night', options = {}, interactive = false }: Props = $props();

  let wrap: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let scene: Scene | null = null;
  let field: Field | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let img: ImageData | null = null;
  let px: Uint32Array | null = null;
  let W = 0, H = 0;
  let clock: ReturnType<typeof subscribe> | null = null;
  const still = prefersReducedMotion();
  const colors = $derived(packPalette(PALETTES[palette]));

  /** Art pixels are 3 CSS px, nudged so each covers a whole number of device pixels. */
  function pixelScale() {
    const dpr = window.devicePixelRatio || 1;
    return Math.max(2, Math.round(3 * dpr)) / dpr;
  }

  function draw(t: number) {
    if (!scene || !field || !ctx || !img || !px) return;
    scene.render(t, field);
    quantize(field, colors, px, inks);
    ctx.putImageData(img, 0, 0);
  }

  function build(cssW: number, cssH: number) {
    const S = pixelScale();
    const w = Math.max(8, Math.ceil(cssW / S)), h = Math.max(8, Math.ceil(cssH / S));
    if (w === W && h === H && scene) return;
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
    scene = nightPond(W, H, { ...opts, seed, still });
    draw(clock?.time ?? 0);
  }

  /** The scene notices something nearby, such as its card being hovered. */
  export function react() {
    scene?.react();
  }

  function toArt(e: MouseEvent): [number, number] {
    const r = canvas.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
  }

  let lastPoke = 0;
  function onMove(e: PointerEvent) {
    if (!scene) return;
    const [x, y] = toArt(e);
    scene.look(x, y);
    if (e.timeStamp - lastPoke > 160) {
      lastPoke = e.timeStamp;
      scene.poke(x, y);
    }
  }

  function onClick(e: MouseEvent) {
    scene?.tap(...toArt(e));
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
</script>

<div class="pond" bind:this={wrap} style:background={PALETTES[palette][0]}>
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
