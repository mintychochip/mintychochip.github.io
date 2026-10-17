<script lang="ts">
  import { playKeyPress } from '../wordle/sound';
  import { SECRET_PAGE_TITLE, secretPageItems, type SecretNavItem } from '../secret/vault-chrome';

  let {
    activeTab = 'portfolio',
    onSecretAction,
    secretRevealed = false,
    vaultUnlocked = false,
  }: {
    activeTab: 'portfolio' | 'wordle' | 'secret';
    onSecretAction?: (action: 'lock' | 'wordle' | 'portfolio') => void;
    secretRevealed?: boolean;
    /** The letter is open, so the sections after it exist. */
    vaultUnlocked?: boolean;
  } = $props();

  let activeSectionId = $state('');

  const secretItems = $derived(secretPageItems(() => onSecretAction?.('lock'), vaultUnlocked));

  const pageItems = $derived(activeTab === 'secret' && secretRevealed ? secretItems : []);

  function handlePageNavClick(item: SecretNavItem, e: MouseEvent) {
    playKeyPress(true);
    e.preventDefault();
    if (item.action) {
      item.action();
      return;
    }
    if (!item.href) return;
    const target = document.getElementById(item.href.slice(1));
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth' });
    activeSectionId = target.id;
    try {
      history.replaceState(null, '', item.href);
    } catch {
      /* ignore */
    }
  }

  // Highlights the last section whose top has scrolled past the upper third. Sections that appear later
  // (everything after the letter) are picked up because each check looks them up again.
  $effect(() => {
    const ids = pageItems.flatMap((item) => (item.href ? [item.href.slice(1)] : []));
    if (ids.length === 0) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.3;
      let current = '';
      for (const id of ids) {
        const top = document.getElementById(id)?.getBoundingClientRect().top;
        if (top !== undefined && top <= line) current = id;
      }
      activeSectionId = current;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  });
</script>

{#if pageItems.length > 0}
  <aside class="sidebar-wrapper">
    <nav class="page-nav" aria-label="{SECRET_PAGE_TITLE} page navigation">
      <p class="title">{SECRET_PAGE_TITLE}</p>
      <ul class="nav-list">
        {#each pageItems as item (item.id)}
          <li>
            <a
              href={item.href ?? '#'}
              class="nav-link"
              class:active={item.href !== undefined && activeSectionId === item.href.slice(1)}
              onclick={(e) => handlePageNavClick(item, e)}
            >{item.label}</a>
          </li>
        {/each}
      </ul>
    </nav>
  </aside>
{/if}

<style>
  .sidebar-wrapper {
    flex-shrink: 0;
    width: 168px;
    user-select: none;
  }

  .page-nav {
    position: sticky;
    top: 16px;
  }

  .title {
    margin: 0 0 8px;
    font-family: var(--font);
    font-size: 18px;
    font-weight: 700;
    color: var(--love);
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
    font-size: 17px;
    text-decoration: none;
    cursor: var(--cursor-pointer);
  }

  .nav-link:hover {
    color: var(--fg);
  }

  .nav-link.active {
    color: var(--love);
  }

  @media (max-width: 960px) {
    .sidebar-wrapper {
      width: 100%;
      margin-bottom: 8px;
    }

    .page-nav {
      position: static;
    }

    .nav-list {
      flex-direction: row;
      flex-wrap: wrap;
      gap: 4px 16px;
    }
  }
</style>
