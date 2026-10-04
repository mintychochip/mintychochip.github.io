<script lang="ts">
  import { onMount } from 'svelte';
  import { assignPalettes } from '../pond/palette';
  import { site } from '../site';
  import { FALLBACK, PER_PAGE, fetchProjects, type Project } from './github';
  import ProjectCard from './ProjectCard.svelte';

  let projects = $state.raw<Project[]>(FALLBACK);
  let page = $state(0);
  let top: HTMLElement;

  const pages = $derived(Math.max(1, Math.ceil(projects.length / PER_PAGE)));
  const shown = $derived(projects.slice(page * PER_PAGE, (page + 1) * PER_PAGE));
  const palettes = $derived(assignPalettes(shown.map((p) => p.name)));

  function go(n: number) {
    page = Math.min(pages - 1, Math.max(0, n));
    if (top.getBoundingClientRect().top < 0) top.scrollIntoView({ block: 'start' });
  }

  onMount(() => {
    const ctl = new AbortController();
    fetchProjects(site.githubUser, ctl.signal)
      .then((list) => {
        if (!list.length) return;
        projects = list;
        page = 0;
      })
      .catch(() => {});
    return () => ctl.abort();
  });
</script>

<section id="projects" aria-labelledby="projects-title" bind:this={top}>
  <div class="head">
    <h2 id="projects-title">Projects</h2>
    <a href="{site.github}?tab=repositories">all repositories</a>
  </div>
  <div class="grid">
    {#each shown as p, i (p.name)}
      <ProjectCard project={p} palette={palettes[i]} />
    {/each}
  </div>
  {#if pages > 1}
    <nav class="pager" aria-label="Project pages">
      <button type="button" disabled={page === 0} onclick={() => go(page - 1)}>newer</button>
      {#each { length: pages } as _, i (i)}
        <button type="button" aria-current={i === page ? 'page' : undefined} aria-label="Page {i + 1}" onclick={() => go(i)}>{i + 1}</button>
      {/each}
      <button type="button" disabled={page === pages - 1} onclick={() => go(page + 1)}>older</button>
    </nav>
  {/if}
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
  .head a {
    color: var(--muted);
    text-decoration: none;
    padding: 4px 0;
  }
  .head a:hover {
    color: var(--accent);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 40px 24px;
    margin-top: 22px;
  }
  .pager {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 10px;
    margin-top: 32px;
  }
  .pager button {
    padding: 6px 8px;
    min-width: 36px;
    min-height: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    background: none;
    color: var(--muted);
    cursor: var(--cursor-pointer);
  }
  .pager button:hover:not(:disabled) {
    color: var(--fg);
  }
  .pager button:disabled {
    color: var(--dim);
    opacity: 0.5;
    cursor: var(--cursor-default);
  }
  .pager [aria-current='page'] {
    color: var(--fg);
    text-decoration: underline;
    text-decoration-thickness: 3px;
    text-underline-offset: 6px;
  }
  @media (max-width: 860px) {
    .grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 32px 20px;
    }
  }
  @media (max-width: 560px) {
    .grid {
      grid-template-columns: minmax(0, 1fr);
      gap: 28px;
    }
    .pager {
      margin-top: 24px;
      gap: 4px 6px;
    }
  }
</style>
