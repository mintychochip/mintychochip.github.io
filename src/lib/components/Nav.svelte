<script lang="ts">
  import { site } from '../site';
  import ThemeToggle from './ThemeToggle.svelte';

  type NavItem = { label: string; href: string };

  let { items }: { items: NavItem[] } = $props();
  let menuOpen = $state(false);
  let avatarVisible = $state(true);
</script>

<header class="nav">
  <div class="nav-profile">
    <button
      type="button"
      class="nav-logo"
      aria-haspopup="menu"
      aria-expanded={menuOpen}
      aria-label="Toggle profile menu"
      onclick={() => (menuOpen = !menuOpen)}
    >
      {#if avatarVisible}
        <img
          class="nav-avatar"
          src={site.avatar}
          alt=""
          width="28"
          height="28"
          onerror={() => (avatarVisible = false)}
        />
      {/if}
      <span class="nav-name">{site.name}</span>
    </button>
    {#if menuOpen}
      <div class="nav-menu" role="menu">
        <a
          class="nav-menu-item"
          href={site.contact.github}
          target="_blank"
          rel="noreferrer"
          role="menuitem"
        >
          GitHub
        </a>
        <a
          class="nav-menu-item"
          href={`mailto:${site.contact.email}`}
          role="menuitem"
        >
          Email
        </a>
      </div>
    {/if}
  </div>
  <div class="nav-actions">
    <ThemeToggle />
    <nav class="nav-links" aria-label="Primary">
      {#each items as item}
        <a class="nav-link" href={item.href}>{item.label}</a>
      {/each}
    </nav>
  </div>
</header>

<style>
  .nav {
    width: min(94%, var(--max-width));
    justify-content: space-between;
    align-items: center;
    margin: 0 auto;
    padding: 16px 0;
    display: flex;
  }
  .nav-profile {
    position: relative;
  }
  .nav-logo {
    font-weight: 600;
    font-size: var(--text-md);
    letter-spacing: -0.01em;
    color: var(--text);
    cursor: pointer;
    font-family: var(--font-sans);
    background: transparent;
    border: none;
    align-items: center;
    gap: 10px;
    padding: 0;
    display: inline-flex;
  }
  .nav-avatar {
    border: 1px solid var(--border);
    background: var(--surface);
    border-radius: 50%;
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    display: block;
  }
  .nav-name {
    line-height: 1;
  }
  .nav-menu {
    border: 1px solid var(--border);
    background: var(--surface);
    min-width: 180px;
    box-shadow: 0 10px 30px var(--shadow);
    z-index: 20;
    transform-origin: 0 0;
    border-radius: 10px;
    flex-direction: column;
    gap: 2px;
    padding: 6px;
    animation: 0.18s cubic-bezier(0.22, 1, 0.36, 1) nav-menu-morph;
    display: flex;
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
  }
  @keyframes nav-menu-morph {
    from {
      opacity: 0;
      transform: scale(0.96) translateY(-4px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  .nav-menu-item {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    border-radius: 6px;
    padding: 8px 10px;
    transition: background 0.12s, color 0.12s;
    text-decoration: none;
  }
  .nav-menu-item:hover {
    background: var(--code-bg);
  }
  .nav-actions {
    align-items: center;
    gap: 20px;
    display: flex;
  }
  .nav-links {
    gap: 28px;
    display: flex;
  }
  .nav-link {
    color: var(--text-secondary);
    font-size: var(--text-sm);
    transition: color 0.15s;
    text-decoration: none;
  }
  .nav-link:hover {
    color: var(--text);
  }
  .visually-hidden {
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    width: 1px;
    height: 1px;
    position: absolute;
    overflow: hidden;
  }
</style>
