<script lang="ts">
   import { site } from '../site';
  import { playKeyPress } from '../wordle/sound';
  import { SECRET_TAB_LABEL } from '../secret/vault-chrome';

  let {
    activeTab = 'portfolio',
    onSelectTab,
  }: {
    activeTab: 'portfolio' | 'wordle' | 'secret';
    onSelectTab: (tab: 'portfolio' | 'wordle' | 'secret') => void;
  } = $props();

  let activeSectionId = $state('');

  const sections = site.nav.filter((link) => link.label !== 'wordle');

  function scrollToSection(targetId: string, href: string) {
    const targetEl = document.getElementById(targetId);
    if (!targetEl) return;
    targetEl.scrollIntoView({ behavior: 'smooth' });
    activeSectionId = targetId;
    try {
      history.replaceState(null, '', href);
    } catch {
      /* ignore */
    }
  }

  function openSection(href: string, event: MouseEvent) {
    if (event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    playKeyPress(true);
    const targetId = href.slice(1);
    if (activeTab !== 'portfolio') {
      onSelectTab('portfolio');
      setTimeout(() => scrollToSection(targetId, href), 120);
    } else {
      scrollToSection(targetId, href);
    }
  }

  function openWordle(event: MouseEvent) {
    if (event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    playKeyPress(true);
    onSelectTab('wordle');
  }

  function goHome(event: MouseEvent) {
    if (event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    playKeyPress(true);
    onSelectTab('portfolio');
    activeSectionId = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  $effect(() => {
    const tab = activeTab;
    if (tab !== 'portfolio') return;
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) return;
        visible.sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
        activeSectionId = visible[0].target.id;
      },
      { rootMargin: '-10% 0px -60% 0px', threshold: [0, 0.2, 0.5] }
    );

    function watch() {
      observer.disconnect();
      for (const link of sections) {
        const el = document.getElementById(link.href.slice(1));
        if (el) observer.observe(el);
      }
    }

    watch();
    const timer = window.setTimeout(watch, 300);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  });
</script>

<nav class="mast" aria-label="Main site navigation">
  <a class="brand" href="#portfolio" onclick={goHome}>mintychochip</a>

  <div class="links">
    {#each sections as link (link.href)}
      <a
        href={link.href}
        class:current={activeTab === 'portfolio' && activeSectionId === link.href.slice(1)}
        onclick={(event) => openSection(link.href, event)}
      >{link.label}</a>
    {/each}
    <span class="wordle-slot">
      <a href="#wordle" class:current={activeTab === 'wordle'} onclick={openWordle}>wordle</a>
      <a
        href="#wordle"
        target="_blank"
        rel="noopener noreferrer"
        class="tab-popout"
        title="Open Wordle in a new browser tab"
        aria-label="Open Wordle in a new browser tab"
      >↗</a>
    </span>
    {#if activeTab === 'secret'}
      <span class="current secret">{SECRET_TAB_LABEL}</span>
    {/if}
  </div>
</nav>

<style>
  .mast {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 18px 32px;
    margin-bottom: 22px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(104, 113, 132, 0.28);
    user-select: none;
  }

  .brand {
    color: var(--fg);
    font-size: 22px;
    font-weight: 700;
    line-height: 1;
    text-decoration: none;
    flex-shrink: 0;
  }

  .brand:hover {
    color: var(--accent);
  }

  .links {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    align-items: baseline;
    gap: 8px 18px;
  }

  .links a,
  .current {
    color: var(--muted);
    font-size: 18px;
    line-height: 1.2;
    text-decoration: none;
  }

  .links a:hover {
    color: var(--fg);
  }

  .links a.current,
  .current.secret {
    color: var(--accent);
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 6px;
  }

  .current.secret {
    color: #ff94c2;
  }

  .wordle-slot {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    margin-left: 8px;
    padding-left: 16px;
    border-left: 1px solid rgba(104, 113, 132, 0.35);
  }

  .tab-popout {
    color: var(--dim);
    font-size: 15px;
    text-decoration: none;
  }

  .tab-popout:hover {
    color: var(--accent);
  }

  @media (max-width: 860px) {
    .mast {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }

    .links {
      justify-content: flex-start;
      gap: 8px 14px;
    }

    .links a,
    .current {
      font-size: 16px;
    }

    .wordle-slot {
      margin-left: 0;
      padding-left: 0;
      border-left: 0;
    }
  }
</style>
