<script lang="ts">
  let {
    activeTab = 'portfolio',
    onSelectTab,
  }: {
    activeTab: 'portfolio' | 'wordle' | 'secret';
    onSelectTab: (tab: 'portfolio' | 'wordle' | 'secret') => void;
  } = $props();
</script>

<nav class="tab-bar" aria-label="Main site navigation">
  <div class="nav-brand-group">
    <a
      href="#portfolio"
      class="brand-badge px"
      onclick={(e) => {
        if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
          e.preventDefault();
          onSelectTab('portfolio');
        }
      }}
    >
      <span class="brand-star">✦</span>
      <span class="brand-name">mintychochip</span>
    </a>
  </div>

  <div class="tabs" role="tablist" aria-label="Current area">
    <span class="area-pill px" class:portfolio={activeTab === 'portfolio'} class:wordle={activeTab === 'wordle'} class:secret={activeTab === 'secret'}>
      {#if activeTab === 'portfolio'}
        <span class="tab-glyph">✦</span>
        <span class="tab-name">Portfolio</span>
      {:else if activeTab === 'wordle'}
        <span class="tab-glyph">🟩</span>
        <span class="tab-name">Wordle</span>
      {:else}
        <span class="tab-glyph">💖</span>
        <span class="tab-name">Happy Anniversary</span>
      {/if}
    </span>

  </div>

  <div class="tab-side">
    <a
      href="#wordle"
      target="_blank"
      rel="noopener noreferrer"
      class="tab-popout px"
      title="Open Wordle in a new browser tab"
      aria-label="Open Wordle in a new browser tab"
    >
      <span class="popout-text">New Tab</span>
      <span class="popout-icon">↗</span>
    </a>
  </div>
</nav>

<style>
  .tab-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
    padding-bottom: 14px;
    border-bottom: 1px solid rgba(104, 113, 132, 0.25);
    user-select: none;
    flex-wrap: wrap;
  }

  .nav-brand-group {
    display: flex;
    align-items: center;
  }

  .brand-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 12px;
    background: var(--field);
    border: 1px solid var(--dim);
    color: var(--fg);
    text-decoration: none;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.5px;
    transition: all 0.15s ease;
  }

  .brand-badge:hover {
    color: var(--accent);
    border-color: var(--accent);
    background: var(--field-focus);
  }

  .brand-star {
    color: var(--accent);
    font-size: 15px;
    line-height: 1;
  }

  .tabs {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .area-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: var(--field);
    color: var(--muted);
    font-size: 15px;
    font-weight: 700;
    border: 1px solid var(--dim);
  }

  .area-pill.portfolio {
    color: var(--accent);
    border-color: var(--accent);
  }

  .area-pill.wordle {
    color: #8bbf73;
    border-color: #6b9e52;
  }

  .area-pill.secret {
    background: #2a1122;
    color: #ff94c2;
    border-color: #f48cb8;
    box-shadow: 0 0 12px rgba(244, 140, 184, 0.25);
  }

  .tab-glyph {
    font-size: 15px;
    line-height: 1;
  }

  .tab-popout {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 12px;
    background: transparent;
    color: var(--dim);
    font-size: 14px;
    font-weight: 700;
    text-decoration: none;
    border: 1px solid rgba(104, 113, 132, 0.3);
    transition: all 0.15s ease;
  }

  .tab-popout:hover {
    color: var(--accent);
    border-color: var(--accent);
    background: var(--field);
  }

  .popout-icon {
    font-size: 13px;
    line-height: 1;
  }

  @media (max-width: 480px) {
    .area-pill {
      padding: 6px 12px;
      font-size: 14px;
      gap: 6px;
    }
    .popout-text {
      display: none;
    }
    .tab-popout {
      padding: 6px 10px;
    }
  }
</style>
