<script lang="ts">
  import { fly } from 'svelte/transition';
  import PondCanvas, { pixelScale, type PondHandle } from '../pond/PondCanvas.svelte';
  import type { SceneName } from '../pond/scenes';
  import { prefersReducedMotion } from '../pond/ticker';
  import PixelArt from './PixelArt.svelte';
  import { GIFT_BOW, HEART, PASS_ICONS, RIBBON_INK } from './pixel-art';

  let {
    id,
    title,
    icon,
    desc,
    redeemed,
    scene,
    highlight = false,
    onRedeem,
  }: {
    id: number;
    title: string;
    icon: string;
    desc: string;
    redeemed: boolean;
    scene: SceneName;
    /** Just arrived from the letter's attachments: the pass flashes and its frogs look up. */
    highlight?: boolean;
    onRedeem: () => void;
  } = $props();

  let pond = $state<PondHandle>();

  /** Art pixels from the card's right edge to its ribbon, which is five art pixels wide. */
  const TIE = 28;
  /** The ribbon's pinks, one art pixel each, matching the bow's knot. */
  const ribbon = `linear-gradient(90deg, ${RIBBON_INK.map((ink, i) => `${ink} ${i * 20}% ${(i + 1) * 20}%`).join(', ')})`;
  /** The pond keeps its perches, and so its frogs, out from under the ribbon. */
  const pondOptions = (W: number) => ({
    k: 1.5,
    frogs: 2,
    flies: 3,
    horizon: 0.42,
    clear: [[(W - TIE - 8) / W, 0, (W - TIE + 3) / W, 1] as const],
  });

  /** Untied when she redeems it: the bow and ribbon lift off in pond-clock steps. */
  const untie = { y: -18, duration: prefersReducedMotion() ? 0 : 360, easing: (t: number) => Math.round(t * 4) / 4 };

  $effect(() => {
    if (highlight) pond?.react();
  });
</script>

<!-- Each pass comes wrapped, its bow over the card's edge; the card itself is clipped to its notches. -->
<div class="gift" style:--art="{pixelScale()}px" style:--tie={TIE}>
  <article id="pass-{id}" class="pass px" class:redeemed class:highlight onpointerenter={() => pond?.react()}>
    <div class="art">
      <PondCanvas bind:this={pond} seed={title} {scene} options={pondOptions} />
      {#if redeemed}
        <p class="stamp px">Redeemed</p>
      {:else}
        <span class="ribbon" style:background={ribbon} aria-hidden="true" out:fly={untie}></span>
      {/if}
    </div>
    <div class="tear" aria-hidden="true"></div>
    <div class="body">
      <h3>
        <PixelArt sprite={PASS_ICONS[icon] ?? HEART} />
        <span>{title}</span>
      </h3>
      <p class="desc">{desc}</p>
      <div class="foot">
        {#if redeemed}
          <p class="done"><PixelArt sprite={HEART} px={2} /> Redeemed with love</p>
        {:else}
          <button
            type="button"
            class="btn px"
            onclick={() => {
              onRedeem();
              pond?.react();
            }}
          >
            Redeem
          </button>
          <span class="term">Good forever</span>
        {/if}
      </div>
    </div>
  </article>
  {#if !redeemed}
    <span class="bow" aria-hidden="true" out:fly={untie}><PixelArt sprite={GIFT_BOW} /></span>
  {/if}
</div>

<style>
  .gift {
    position: relative;
    display: grid;
  }

  .pass {
    --n: 6px;
    display: flex;
    flex-direction: column;
    background: var(--field);
    transition: background 0.15s ease;
  }

  /* Down the pond's right third, in art pixels like the bow, so its stripes meet the knot exactly. */
  .ribbon {
    position: absolute;
    top: 0;
    bottom: 0;
    right: calc(var(--art) * var(--tie));
    width: calc(var(--art) * 5);
    pointer-events: none;
  }

  /* Tied on over the top edge, its knot on the ribbon. */
  .bow {
    position: absolute;
    top: calc(var(--art) * -5);
    right: calc(var(--art) * (var(--tie) - 5));
    pointer-events: none;
  }

  .bow :global(svg) {
    display: block;
  }

  .pass:hover,
  .pass:focus-within {
    background: #172032;
  }

  /* Arrived at from the letter: a pink frame blinks three times, in pond-clock steps. */
  .pass.highlight {
    animation: found 0.5s step-end 3;
  }

  @keyframes found {
    0% {
      box-shadow: inset 0 0 0 3px var(--love);
    }
    50% {
      box-shadow: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .pass.highlight {
      animation: none;
      box-shadow: inset 0 0 0 3px var(--love);
    }
  }

  .art {
    position: relative;
    aspect-ratio: 304 / 170;
  }

  .stamp {
    position: absolute;
    top: 12px;
    right: 12px;
    margin: 0;
    padding: 5px 12px 6px;
    background: var(--bg);
    color: var(--love);
    box-shadow: inset 0 0 0 3px var(--love);
    font-family: var(--font);
    font-size: 18px;
    font-weight: 700;
    line-height: 1;
    animation: press 0.4s steps(4, end) both;
  }

  @keyframes press {
    from {
      transform: scale(1.6);
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .stamp {
      animation: none;
    }
  }

  /* Perforation just inside the stub, bitten in at both edges where it tears off. */
  .tear {
    position: relative;
    height: 3px;
    margin: 15px 18px 0;
    background: linear-gradient(90deg, var(--dim) 6px, transparent 6px) 0 0 / 12px 3px repeat-x;
  }

  .tear::before,
  .tear::after {
    content: '';
    position: absolute;
    top: -6px;
    width: 12px;
    height: 15px;
    background: var(--bg);
  }

  .tear::before {
    left: -24px;
  }

  .tear::after {
    right: -24px;
  }

  .body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px 18px 18px;
  }

  h3 {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin: 0;
    font-size: 21px;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }

  h3 :global(svg) {
    margin-top: 1px;
  }

  .desc {
    margin: 0;
    font-size: 16px;
    line-height: 1.45;
    color: var(--muted);
  }

  .foot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px 12px;
    margin-top: auto;
    padding-top: 10px;
  }

  .foot .btn {
    font-size: 16px;
    padding: 7px 16px;
  }

  .done {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-size: 15px;
    color: var(--love);
  }

  .term {
    font-size: 14px;
    color: var(--muted);
  }

  @media (max-width: 560px) {
    h3 {
      font-size: 20px;
    }

    .desc {
      font-size: 15px;
    }
  }
</style>
