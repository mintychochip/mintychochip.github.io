<script lang="ts">
  import PondCanvas from '../pond/PondCanvas.svelte';
  import type { PaletteName } from '../pond/palette';
  import { metaLine, type Project } from './github';

  let { project, palette }: { project: Project; palette: PaletteName } = $props();
  let pond = $state<ReturnType<typeof PondCanvas>>();
</script>

<a class="card" href={project.url} onpointerenter={() => pond?.react()} onfocus={() => pond?.react()}>
  <div class="art">
    <PondCanvas bind:this={pond} seed={project.name} {palette} options={{ k: 1.5, frogs: 1, flies: 3, horizon: 0.42 }} />
  </div>
  <h3>{project.name}</h3>
  {#if project.description}
    <p class="desc">{project.description}</p>
  {/if}
  <p class="meta">{metaLine(project)}</p>
</a>

<style>
  .card {
    display: block;
    text-decoration: none;
  }
  .art {
    aspect-ratio: 304 / 204;
  }
  h3 {
    margin: 14px 0 0;
    font-size: 22px;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }
  .card:hover h3,
  .card:focus-visible h3 {
    color: var(--accent);
  }
  .desc {
    margin: 6px 0 0;
    font-size: 17px;
    line-height: 1.4;
    color: var(--muted);
  }
  .meta {
    margin: 8px 0 0;
    font-size: 15px;
    color: var(--dim);
  }
</style>
