<script lang="ts">
  import LovePass from './LovePass.svelte';
  import { passScenes } from './pass-scenes';
  import type { VaultCoupon } from './vault-types';

  let {
    passes,
    highlighted,
    onRedeem,
  }: {
    passes: (VaultCoupon & { redeemed: boolean })[];
    /** The pass she just jumped to from the letter, if any. */
    highlighted: number | null;
    onRedeem: (id: number) => void;
  } = $props();

  /** Each pass gets a pond that suits its gift. */
  const scenes = $derived(passScenes(passes.map((p) => p.icon)));

  const redeemed = $derived(passes.filter((p) => p.redeemed).length);
</script>

<section id="anniversary-passes" aria-labelledby="passes-title">
  <div class="head">
    <h2 id="passes-title">Tucked in with your letter</h2>
    <p class="count" aria-live="polite">{redeemed} of {passes.length} passes redeemed</p>
  </div>
  <div class="grid">
    {#each passes as pass, i (pass.id)}
      <LovePass
        id={pass.id}
        title={pass.title}
        icon={pass.icon}
        desc={pass.desc}
        redeemed={pass.redeemed}
        scene={scenes[i]}
        highlight={highlighted === pass.id}
        onRedeem={() => onRedeem(pass.id)}
      />
    {/each}
  </div>
</section>

<style>
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px 24px;
  }

  h2 {
    margin: 0;
    font-size: clamp(24px, 5vw, 30px);
    line-height: 1.2;
  }

  .count {
    margin: 0;
    color: var(--muted);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 28px 24px;
    margin-top: 22px;
  }

  @media (max-width: 560px) {
    .grid {
      grid-template-columns: minmax(0, 1fr);
      gap: 24px;
    }
  }
</style>
