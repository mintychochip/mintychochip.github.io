<script lang="ts">
  import { site } from '../site';
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
    onSelectTab,
    onWordleAction,
    onSecretAction,
    secretRevealed = false,
  }: {
    activeTab: 'portfolio' | 'wordle' | 'secret';
    onSelectTab: (tab: 'portfolio' | 'wordle' | 'secret') => void;
    onWordleAction?: (action: 'daily' | 'practice' | 'help' | 'stats' | 'settings') => void;
    onSecretAction?: (action: 'lock' | 'wordle' | 'portfolio') => void;
    secretRevealed?: boolean;
  } = $props();

  let activeSectionId = $state<string>('');
  let mobileDrawerOpen = $state(false);

  const SITE_NAV_ITEMS: SidebarItem[] = site.nav.map((link) => {
    const id = link.label === 'wordle' ? 'wordle-tab' : link.href.replace('#', '');
    if (link.label === 'wordle') {
      return {
        id,
        label: link.label,
        icon: '🟩',
        badge: 'GAME',
        action: () => onSelectTab('wordle'),
      };
    }
    return {
      id,
      label: link.label,
      icon: '✦',
      href: link.href,
    };
  });

  const WORDLE_PAGE_ITEMS: SidebarItem[] = [
    {
      id: 'wordle-daily',
      label: 'Daily Puzzle',
      icon: '🟩',
      badge: 'TODAY',
      action: () => onWordleAction?.('daily'),
    },
    {
      id: 'wordle-practice',
      label: 'Practice Mode',
      icon: '🔄',
      action: () => onWordleAction?.('practice'),
    },
    {
      id: 'wordle-help',
      label: 'How to Play',
      icon: '❓',
      action: () => onWordleAction?.('help'),
    },
    {
      id: 'wordle-stats',
      label: 'Statistics',
      icon: '📊',
      action: () => onWordleAction?.('stats'),
    },
    {
      id: 'wordle-settings',
      label: 'Settings',
      icon: '⚙️',
      action: () => onWordleAction?.('settings'),
    },
  ];

  const secretItems = $derived(secretPageItems(() => onSecretAction?.('lock')));

  const pageItems = $derived(
    activeTab === 'wordle' ? WORDLE_PAGE_ITEMS : activeTab === 'secret' && secretRevealed ? secretItems : []
  );

  const pageHeading = $derived(activeTab === 'wordle' ? { title: 'WORDLE', tag: 'THIS PAGE', icon: '🟩' } : SECRET_PAGE_HEADING);

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

  function handleSiteNavClick(item: SidebarItem, e?: MouseEvent) {
    playKeyPress(true);
    mobileDrawerOpen = false;

    if (item.action) {
      e?.preventDefault();
      item.action();
      return;
    }

    if (item.href?.startsWith('#')) {
      e?.preventDefault();
      const targetId = item.href.slice(1);
      if (activeTab !== 'portfolio') {
        onSelectTab('portfolio');
        setTimeout(() => scrollToSection(targetId, item.href!), 120);
      } else {
        scrollToSection(targetId, item.href);
      }
    }
  }

  function handlePageNavClick(item: SidebarItem, e?: MouseEvent) {
    playKeyPress(true);
    mobileDrawerOpen = false;

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

  function isSiteNavActive(item: SidebarItem): boolean {
    if (item.id === 'wordle-tab') return activeTab === 'wordle';
    if (activeTab !== 'portfolio') return false;
    return activeSectionId === item.id;
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
      const ids =
        tab === 'secret'
          ? SCROLL_SPY_SECTION_IDS.filter((id) => id.startsWith('anniversary-'))
          : tab === 'portfolio'
            ? SCROLL_SPY_SECTION_IDS.filter((id) => !id.startsWith('anniversary-'))
            : [];

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

<aside class="sidebar-wrapper" class:secret-mode={activeTab === 'secret'}>
  <div class="mobile-toggle-bar">
    <button
      type="button"
      class="mobile-toggle-btn px"
      onclick={() => (mobileDrawerOpen = !mobileDrawerOpen)}
      aria-expanded={mobileDrawerOpen}
      aria-label="Toggle navigation menu"
    >
      <span class="toggle-icon">✦</span>
      <span class="toggle-label">SITE NAV</span>
      <span class="toggle-arrow">{mobileDrawerOpen ? '▲' : '▼'}</span>
    </button>
  </div>

  <div class="sidebar-card px" class:drawer-open={mobileDrawerOpen}>
    <div class="sidebar-header">
      <div class="header-tag">
        <span class="status-pip"></span>
        <span>SITE // NAVIGATION</span>
      </div>
      <div class="header-title">
        <span class="title-glyph">✦</span>
        <h2 class="title-text">mintychochip</h2>
      </div>
    </div>

    <nav class="sidebar-nav site-nav" aria-label="Site navigation">
      <ul class="nav-list">
        {#each SITE_NAV_ITEMS as item (item.id)}
          {@const isActive = isSiteNavActive(item)}
          <li class="nav-item">
            <a
              href={item.href ?? '#wordle'}
              class="nav-link px"
              class:active={isActive}
              onclick={(e) => handleSiteNavClick(item, e)}
            >
              <span class="pip" aria-hidden="true">{isActive ? '►' : '▪'}</span>
              {#if item.icon}
                <span class="item-icon" aria-hidden="true">{item.icon}</span>
              {/if}
              <span class="item-label">{item.label}</span>
              {#if item.badge}
                <span class="item-badge">{item.badge}</span>
              {/if}
            </a>
          </li>
        {/each}
      </ul>
    </nav>

    {#if pageItems.length > 0}
      <div class="sidebar-divider" role="presentation"></div>
      <div class="sidebar-subheader">
        <div class="header-tag sub">
          <span class="status-pip"></span>
          <span>{pageHeading.tag}</span>
        </div>
        <div class="header-title compact">
          <span class="title-glyph">{pageHeading.icon}</span>
          <h3 class="title-text">{pageHeading.title}</h3>
        </div>
      </div>
      <nav class="sidebar-nav page-nav" aria-label="{pageHeading.title} page navigation">
        <ul class="nav-list">
          {#each pageItems as item (item.id)}
            {@const isActive = isPageNavActive(item)}
            <li class="nav-item">
              <a
                href={item.href ?? '#'}
                class="nav-link px"
                class:active={isActive}
                onclick={(e) => handlePageNavClick(item, e)}
              >
                <span class="pip" aria-hidden="true">{isActive ? '►' : '▪'}</span>
                {#if item.icon}
                  <span class="item-icon" aria-hidden="true">{item.icon}</span>
                {/if}
                <span class="item-label">{item.label}</span>
                {#if item.badge}
                  <span class="item-badge">{item.badge}</span>
                {/if}
              </a>
            </li>
          {/each}
        </ul>
      </nav>
    {/if}
  </div>
</aside>

<style>
  .sidebar-wrapper {
    position: relative;
    user-select: none;
    flex-shrink: 0;
    width: 220px;
    min-height: 0;
    align-self: stretch;
  }

  .sidebar-card {
    position: sticky;
    top: 16px;
    width: 220px;
    max-height: calc(100vh - 32px);
    overflow-y: auto;
    overscroll-behavior: contain;
    background: var(--field);
    border: 2px solid var(--dim);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .secret-mode .sidebar-card {
    border-color: #f48cb8;
    background: #181224;
    box-shadow: 0 4px 20px rgba(244, 140, 184, 0.15);
  }

  .sidebar-header,
  .sidebar-subheader {
    background: #0f1524;
    padding: 12px 14px;
    border-bottom: 2px solid var(--dim);
  }

  .sidebar-subheader {
    padding: 10px 14px;
    background: #0c111c;
  }

  .secret-mode .sidebar-header,
  .secret-mode .sidebar-subheader {
    background: #231633;
    border-bottom-color: #f48cb8;
  }

  .sidebar-divider {
    height: 3px;
    background: linear-gradient(90deg, var(--accent), transparent);
    margin: 0;
  }

  .secret-mode .sidebar-divider {
    background: linear-gradient(90deg, #f48cb8, transparent);
  }

  .header-tag {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: var(--muted);
  }

  .header-tag.sub {
    font-size: 10px;
  }

  .secret-mode .header-tag {
    color: #ff94c2;
  }

  .status-pip {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 6px var(--accent);
  }

  .secret-mode .status-pip {
    background: #ff4d94;
    box-shadow: 0 0 6px #ff4d94;
  }

  .header-title {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
  }

  .header-title.compact {
    margin-top: 2px;
  }

  .title-glyph {
    font-size: 16px;
  }

  .title-text {
    margin: 0;
    font-size: 18px;
    letter-spacing: 1px;
    color: var(--fg);
  }

  h3.title-text {
    font-size: 15px;
  }

  .secret-mode .title-text {
    color: #ffe8f3;
  }

  .sidebar-nav {
    padding: 8px 6px;
  }

  .page-nav {
    padding-top: 4px;
    padding-bottom: 10px;
  }

  .nav-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .nav-item {
    margin: 0;
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    text-decoration: none;
    color: var(--muted);
    font-size: 15px;
    font-weight: 700;
    border: 1px solid transparent;
    transition: all 0.15s ease;
    cursor: var(--cursor-pointer);
  }

  .nav-link:hover {
    color: var(--fg);
    background: var(--field-focus);
    border-color: rgba(139, 191, 115, 0.4);
    transform: translateX(2px);
  }

  .secret-mode .nav-link:hover {
    color: #ffe8f3;
    background: #2b1d36;
    border-color: rgba(244, 140, 184, 0.5);
  }

  .nav-link.active {
    background: #111a22;
    color: var(--accent);
    border-color: var(--accent);
    font-weight: 700;
  }

  .secret-mode .nav-link.active {
    background: #2a1122;
    color: #ff94c2;
    border-color: #f48cb8;
  }

  .pip {
    font-size: 12px;
    line-height: 1;
    color: var(--dim);
    width: 12px;
    text-align: center;
  }

  .nav-link.active .pip {
    color: var(--accent);
  }

  .secret-mode .nav-link.active .pip {
    color: #ff4d94;
  }

  .item-icon {
    font-size: 14px;
    line-height: 1;
  }

  .item-label {
    flex: 1;
    text-transform: lowercase;
  }

  .item-badge {
    background: #1a271c;
    border: 1px solid var(--accent);
    color: var(--accent);
    font-size: 9px;
    font-weight: 700;
    padding: 1px 4px;
    letter-spacing: 0.5px;
  }

  .secret-mode .item-badge {
    background: #3b1424;
    border-color: #f48cb8;
    color: #ffc4da;
  }

  .mobile-toggle-bar {
    display: none;
    margin-bottom: 12px;
  }

  .mobile-toggle-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: var(--field);
    border: 2px solid var(--dim);
    color: var(--fg);
    font-size: 15px;
    font-weight: 700;
    cursor: var(--cursor-pointer);
  }

  .secret-mode .mobile-toggle-btn {
    border-color: #f48cb8;
    background: #181224;
    color: #ffe8f3;
  }

  .toggle-icon {
    font-size: 16px;
  }

  .toggle-label {
    flex: 1;
    text-align: left;
    margin-left: 8px;
    letter-spacing: 1px;
  }

  .toggle-arrow {
    font-size: 12px;
    color: var(--dim);
  }

  @media (max-width: 960px) {
    .sidebar-wrapper {
      width: 100%;
    }

    .mobile-toggle-bar {
      display: block;
      position: sticky;
      top: 8px;
      z-index: 40;
      margin-bottom: 12px;
    }

    .sidebar-card {
      display: none;
      position: static;
      width: 100%;
      max-height: none;
      margin-bottom: 20px;
    }

    .sidebar-card.drawer-open {
      display: flex;
      animation: drawer-slide 0.2s ease-out;
    }

    @keyframes drawer-slide {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  }
</style>
