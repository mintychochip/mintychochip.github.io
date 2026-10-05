<script lang="ts">
  import { playKeyPress } from '../wordle/sound';
  import { SECRET_PAGE_HEADING, secretPageItems } from '../secret/vault-chrome';

  export interface SidebarItem {
    id: string;
    label: string;
    icon?: string;
    href?: string;
    badge?: string;
    action?: () => void;
  }

  let {
    activeTab = 'portfolio',
    onSecretAction,
    secretRevealed = false,
  }: {
    activeTab: 'portfolio' | 'wordle' | 'secret';
    onSecretAction?: (action: 'lock' | 'wordle' | 'portfolio') => void;
    secretRevealed?: boolean;
  } = $props();

  let activeSectionId = $state<string>('');

  const secretItems = $derived(secretPageItems(() => onSecretAction?.('lock')));

  const pageItems = $derived(activeTab === 'secret' && secretRevealed ? secretItems : []);

  const pageHeading = SECRET_PAGE_HEADING;

  function scrollToSection(targetId: string, href: string) {
    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth' });
      activeSectionId = targetId;
      try {
        history.replaceState(null, '', href);
      } catch {
        /* ignore */
      }
    }
  }

  function handlePageNavClick(item: SidebarItem, e?: MouseEvent) {
    playKeyPress(true);

    if (item.action) {
      e?.preventDefault();
      item.action();
      return;
    }

    if (item.href?.startsWith('#')) {
      e?.preventDefault();
      scrollToSection(item.href.slice(1), item.href);
    }
  }

  function isPageNavActive(item: SidebarItem): boolean {
    if (!item.href) return false;
    return activeSectionId === item.href.slice(1);
  }

  const SCROLL_SPY_SECTION_IDS = [
    'github',
    'usage',
    'blog',
    'projects',
    'resume',
    'contact',
    'anniversary-letter3d',
    'anniversary-pond',
    'anniversary-letter',
    'anniversary-reasons',
    'anniversary-coupons',
    'anniversary-wordle',
    'anniversary-oracle',
  ] as const;

  $effect(() => {
    const tab = activeTab;
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((e) => e.isIntersecting);
        if (visibleEntries.length > 0) {
          visibleEntries.sort(
            (a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top)
          );
          activeSectionId = visibleEntries[0].target.id;
        }
      },
      {
        rootMargin: '-10% 0px -60% 0px',
        threshold: [0, 0.2, 0.5],
      }
    );

    function registerSections() {
      observer.disconnect();
      const ids = tab === 'secret' ? SCROLL_SPY_SECTION_IDS.filter((id) => id.startsWith('anniversary-')) : [];

      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      });
    }

    registerSections();
    const timer = window.setTimeout(registerSections, 300);

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  });
</script>

{#if pageItems.length > 0}
  <aside class="sidebar-wrapper" class:secret-mode={activeTab === 'secret'}>
    <nav class="page-nav" aria-label="{pageHeading.title} page navigation">
      <p class="kicker">{pageHeading.title}</p>
      <ul class="nav-list">
        {#each pageItems as item (item.id)}
          <li>
            <a
              href={item.href ?? '#'}
              class="nav-link"
              class:active={isPageNavActive(item)}
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

  .kicker {
    margin: 0 0 8px;
    color: var(--dim);
    font-size: 14px;
    letter-spacing: 0.12em;
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
    color: var(--accent);
  }

  .secret-mode .nav-link.active,
  .secret-mode .kicker {
    color: #ff94c2;
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
