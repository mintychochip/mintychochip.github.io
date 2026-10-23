<script lang="ts">
  import { onMount } from 'svelte';
  import type { BlogNavItem } from './sections';

  let {
    title,
    items,
    ariaLabel = 'Blog navigation',
  }: {
    title: string;
    items: BlogNavItem[];
    ariaLabel?: string;
  } = $props();

  let activeId = $state('');
  const WIDE = '(min-width: 961px)';
  /** Above the sidebar breakpoint the list is always visible; below it, it folds away. */
  let wide = $state(typeof window === 'undefined' || window.matchMedia(WIDE).matches);

  const sectionIds = $derived(items.flatMap((item) => (item.id ? [item.id] : [])));
  /** Section lists fold on narrow screens; a short list of links just wraps. */
  const folds = $derived(sectionIds.length > 0);

  // Highlights the last section whose top has scrolled past the upper third. Sections are looked up on
  // every pass, so ones that mount later (the WebAssembly labs) are picked up without re-binding.
  onMount(() => {
    const query = window.matchMedia(WIDE);
    wide = query.matches;
    const onWideChange = (event: MediaQueryListEvent) => {
      wide = event.matches;
    };
    query.addEventListener('change', onWideChange);

    if (sectionIds.length === 0) {
      return () => query.removeEventListener('change', onWideChange);
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.3;
      let current = '';
      for (const id of sectionIds) {
        const top = document.getElementById(id)?.getBoundingClientRect().top;
        if (top !== undefined && top <= line) current = id;
      }
      // The last section can never cross the line on a short page, so pin it at the bottom.
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      activeId = atBottom ? sectionIds[sectionIds.length - 1] : current;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
    return () => {
      query.removeEventListener('change', onWideChange);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  });

  function handleClick(event: MouseEvent, item: BlogNavItem) {
    if (!item.id) return;
    if (event.ctrlKey || event.metaKey || event.shiftKey) return;
    const target = document.getElementById(item.id);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth' });
    activeId = item.id;
    try {
      history.replaceState(null, '', item.href);
    } catch {
      /* ignore */
    }
  }

  function linkClass(item: BlogNavItem): string {
    return item.id && activeId === item.id ? 'nav-link active' : 'nav-link';
  }
</script>

{#snippet navList()}
  <ul class="nav-list">
    {#each items as item (item.href)}
      <li>
        <a
          href={item.href}
          class={linkClass(item)}
          aria-current={item.id && activeId === item.id ? 'true' : undefined}
          onclick={(event) => handleClick(event, item)}
        >{item.label}</a>
      </li>
    {/each}
  </ul>
{/snippet}

<aside class="sidebar-wrapper">
  <nav class="blog-nav" aria-label={ariaLabel}>
    {#if wide || !folds}
      <p class="title">{title}</p>
      {@render navList()}
    {:else}
      <!-- Narrow screens: a full section list would push the first paragraph below the fold. -->
      <details class="fold">
        <summary>{title}</summary>
        {@render navList()}
      </details>
    {/if}
  </nav>
</aside>

<style>
  .sidebar-wrapper {
    flex-shrink: 0;
    width: 168px;
    user-select: none;
  }

  .blog-nav {
    position: sticky;
    top: 16px;
  }

  .title {
    margin: 0 0 8px;
    font-family: var(--font);
    font-size: 18px;
    font-weight: 700;
    color: var(--accent);
  }

  .fold summary {
    padding: 4px 0;
    color: var(--accent);
    font-family: var(--font);
    font-size: 18px;
    font-weight: 700;
    cursor: var(--cursor-pointer);
  }

  .fold[open] summary {
    margin-bottom: 4px;
  }

  .nav-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .nav-link {
    display: block;
    padding: 5px 0;
    color: var(--muted);
    font-size: 15px;
    line-height: 1.35;
    text-decoration: none;
    cursor: var(--cursor-pointer);
  }

  .nav-link:hover {
    color: var(--fg);
  }

  .nav-link.active {
    color: var(--accent);
  }

  @media (max-width: 960px) {
    .sidebar-wrapper {
      width: 100%;
      margin-bottom: 24px;
    }

    .blog-nav {
      position: static;
    }

    .nav-list {
      flex-direction: row;
      flex-wrap: wrap;
      gap: 2px 16px;
    }

    .fold .nav-list {
      flex-direction: column;
      gap: 2px;
    }
  }
</style>
