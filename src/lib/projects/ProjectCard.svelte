<script lang="ts">
  import PondCanvas from '../pond/PondCanvas.svelte';
  import type { PaletteName } from '../pond/palette';
  import { metaParts, truncateWords, type Project } from './github';
  import LanguageIcon from '../components/LanguageIcon.svelte';

  let { project, palette }: { project: Project; palette: PaletteName } = $props();
  let pond = $state<ReturnType<typeof PondCanvas>>();
  const meta = $derived(metaParts(project));
  const desc = $derived(truncateWords(project.description));
  const descTitle = $derived(desc !== project.description.trim() ? project.description : undefined);
</script>

<a class="card" href={project.url} onpointerenter={() => pond?.react()} onfocus={() => pond?.react()}>
  <div class="art">
    <PondCanvas bind:this={pond} seed={project.name} {palette} options={{ k: 1.5, frogs: 1, flies: 3, horizon: 0.42 }} />
  </div>
  <h3>{project.name}</h3>
  {#if desc}
    <p class="desc" title={descTitle}>{desc}</p>
  {/if}
  <p class="meta">
    {#if meta.language}
      <span class="meta-lang">
        <LanguageIcon language={meta.language} size={15} />
        <span class="lang-name">{meta.language}</span>
      </span>
      {#if meta.otherParts.length > 0}
        <span class="meta-sep">·</span>
      {/if}
    {/if}
    {#each meta.otherParts as part, i}
      <span>{part}</span>
      {#if i < meta.otherParts.length - 1}
        <span class="meta-sep">·</span>
      {/if}
    {/each}
  </p>
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
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  .meta-lang {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: var(--fg);
  }
  .meta-sep {
    color: var(--dim);
  }
  @media (max-width: 560px) {
    h3 {
      font-size: 20px;
      margin-top: 10px;
    }
    .desc {
      font-size: 16px;
      margin-top: 4px;
    }
    .meta {
      font-size: 14px;
      margin-top: 6px;
    }
  }
</style>
