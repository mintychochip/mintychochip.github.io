<script lang="ts" module>
  /** What the vault can do with its heart shower. */
  export interface HeartShowerHandle {
    /** Sends `count` pixel hearts up the screen. */
    burst(count: number): void;
  }
</script>

<script lang="ts">
  import { prefersReducedMotion } from '../pond/ticker';
  import PixelArt from './PixelArt.svelte';
  import { HEART } from './pixel-art';

  interface Rising {
    id: number;
    left: number;
    /** CSS px per art pixel. */
    px: number;
    delay: number;
    duration: number;
    drift: number;
  }

  let hearts = $state<Rising[]>([]);
  let nextId = 0;
  const still = prefersReducedMotion();

  /** Sends `count` pixel hearts up the screen. */
  export function burst(count: number) {
    if (still) return;
    const born = Array.from({ length: count }, () => ({
      id: nextId++,
      left: 4 + Math.random() * 92,
      px: 2 + Math.floor(Math.random() * 3),
      delay: Math.random() * 0.6,
      duration: 2.6 + Math.random() * 1.6,
      drift: (Math.random() - 0.5) * 60,
    }));
    hearts = [...hearts, ...born].slice(-48);
  }
</script>

<div class="shower" aria-hidden="true">
  {#each hearts as heart (heart.id)}
    <span
      class="heart"
      style:left="{heart.left}%"
      style:--drift="{heart.drift}px"
      style:animation-duration="{heart.duration}s"
      style:animation-delay="{heart.delay}s"
      onanimationend={() => (hearts = hearts.filter((h) => h.id !== heart.id))}
    >
      <PixelArt sprite={HEART} px={heart.px} />
    </span>
  {/each}
</div>

<style>
  .shower {
    position: fixed;
    inset: 0;
    z-index: 100;
    overflow: hidden;
    pointer-events: none;
  }

  /* Stepped like the ponds, so the hearts move at the pond clock's frame rate. */
  .heart {
    position: absolute;
    bottom: -24px;
    animation-name: rise;
    animation-timing-function: steps(40, end);
    animation-fill-mode: both;
  }

  @keyframes rise {
    from {
      transform: translate(0, 0);
      opacity: 1;
    }
    75% {
      opacity: 1;
    }
    to {
      transform: translate(var(--drift), -105vh);
      opacity: 0;
    }
  }
</style>
