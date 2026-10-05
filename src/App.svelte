<script lang="ts">
  import { onMount } from 'svelte';
  import Hero from './lib/components/Hero.svelte';
  import Resume from './lib/components/Resume.svelte';
  import Footer from './lib/components/Footer.svelte';
  import Contact from './lib/contact/Contact.svelte';
  import Projects from './lib/projects/Projects.svelte';
  import GitHubActivitySection from './lib/github/GitHubActivitySection.svelte';
  import UsageSection from './lib/usage/UsageSection.svelte';
  import BlogSection from './lib/blog/BlogSection.svelte';
  import TabBar from './lib/components/TabBar.svelte';
  import PageSidebar from './lib/components/PageSidebar.svelte';
  import WordleGame from './lib/wordle/WordleGame.svelte';
  import SecretPage from './lib/secret/SecretPage.svelte';
  import { SECRET_LOAD_ERROR } from './lib/secret/vault-chrome';
  import { clearVaultGrant } from './lib/secret/vault-gate';

  type Tab = 'portfolio' | 'wordle' | 'secret';

  function getTabFromHash(): Tab {
    if (typeof window === 'undefined') return 'portfolio';
    const hash = window.location.hash.toLowerCase();
    if (hash === '#secret' || hash.startsWith('#secret')) {
      return 'secret';
    }
    if (hash === '#wordle' || hash.startsWith('#wordle')) {
      return 'wordle';
    }
    return 'portfolio';
  }

  let activeTab = $state<Tab>(getTabFromHash());
  let secretRevealed = $state(false);

  function setTab(tab: Tab) {
    activeTab = tab;
    if (tab !== 'secret') secretRevealed = false;
    if (typeof window !== 'undefined') {
      if (tab === 'secret') {
        window.location.hash = '#secret';
        document.title = 'mintychochip';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (tab === 'wordle') {
        window.location.hash = '#wordle';
        document.title = 'mintychochip — wordle';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        if (window.location.hash.startsWith('#wordle') || window.location.hash.startsWith('#secret')) {
          window.location.hash = '#portfolio';
        }
        document.title = 'mintychochip';
      }
    }
  }

  function handleSecretAction(action: 'lock' | 'wordle' | 'portfolio') {
    if (action === 'lock') {
      clearVaultGrant();
      secretRevealed = false;
      setTab('portfolio');
    } else if (action === 'wordle') {
      setTab('wordle');
    } else {
      setTab('portfolio');
    }
  }

  onMount(() => {
    function scrollToAnchor(hash: string) {
      if (!hash || hash === '#portfolio' || hash === '#') return;
      setTimeout(() => {
        const el = document.getElementById(hash.slice(1));
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }

    function handleHashChange() {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#secret' || hash.startsWith('#secret')) {
        activeTab = 'secret';
        document.title = 'mintychochip';
      } else if (hash === '#wordle' || hash.startsWith('#wordle')) {
        activeTab = 'wordle';
        document.title = 'mintychochip — wordle';
      } else if (activeTab !== 'portfolio' && document.getElementById(hash.slice(1))) {
        // In-page anchors inside the secret/wordle tabs (e.g. "Continue to your
        // passes") must not bounce the visitor back to the portfolio.
        scrollToAnchor(hash);
      } else {
        activeTab = 'portfolio';
        document.title = 'mintychochip';
        scrollToAnchor(hash);
      }
    }

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  });
</script>

<div class="page">
  <TabBar {activeTab} onSelectTab={setTab} />

  <div class="page-layout">
    <PageSidebar
      {activeTab}
      onSecretAction={handleSecretAction}
      {secretRevealed}
    />

    <div class="page-content">
      {#if activeTab === 'portfolio'}
        <svelte:boundary>
          <Hero />
          {#snippet failed()}
            <header><h1>mintychochip</h1></header>
          {/snippet}
        </svelte:boundary>
        <main>
          <svelte:boundary>
            <GitHubActivitySection />
            {#snippet failed()}
              <p class="broken">GitHub activity didn’t load. See <a href="https://github.com/mintychochip">my profile</a>.</p>
            {/snippet}
          </svelte:boundary>
          <svelte:boundary>
            <UsageSection />
            {#snippet failed()}
              <p class="broken">The usage chart didn’t load.</p>
            {/snippet}
          </svelte:boundary>
          <svelte:boundary>
            <BlogSection />
            {#snippet failed()}
              <p class="broken">Blog didn’t load. Read the post on <a href="https://blog.umans.ai/blog/the-token-gap/">Umans AI</a>.</p>
            {/snippet}
          </svelte:boundary>
          <svelte:boundary>
            <Projects />
            {#snippet failed()}
              <p class="broken">Projects didn’t load. They’re all on <a href="https://github.com/mintychochip">GitHub</a>.</p>
            {/snippet}
          </svelte:boundary>
          <div class="pair">
            <Resume />
            <Contact />
          </div>
        </main>
      {:else if activeTab === 'wordle'}
        <main class="wordle-main">
          <svelte:boundary>
            <WordleGame onNavigateToSecret={() => setTab('secret')} />
            {#snippet failed()}
              <p class="broken">Wordle game didn’t load.</p>
            {/snippet}
          </svelte:boundary>
        </main>
      {:else if activeTab === 'secret'}
        <main class="secret-main">
          <svelte:boundary>
            <SecretPage onNavigate={setTab} onReveal={(open) => (secretRevealed = open)} />
            {#snippet failed()}
              <p class="broken">{SECRET_LOAD_ERROR}</p>
            {/snippet}
          </svelte:boundary>
        </main>
      {/if}
    </div>
  </div>

  <Footer />
</div>

<style>
  .page {
    width: min(calc(var(--width) + 240px), calc(100% - 32px));
    margin: 0 auto;
    padding: 16px 0 40px;
  }

  .page-layout {
    display: flex;
    align-items: stretch;
    gap: 28px;
  }

  .page-content {
    flex: 1;
    min-width: 0;
  }

  /* Sticky sidebar needs a tall flex sibling; stretch matches main column height */
  .page-layout :global(.sidebar-wrapper) {
    align-self: stretch;
  }

  main {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 76px;
    margin-top: 76px;
    min-width: 0;
    max-width: 100%;
  }
  main > :global(*) {
    min-width: 0;
    max-width: 100%;
  }
  .wordle-main,
  .secret-main {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
    margin-top: 16px;
  }

  .secret-main {
    width: 100%;
    max-width: none;
    align-self: stretch;
  }

  .secret-main :global(.pass-stage) {
    margin-top: -8px;
  }
  .pair {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
    gap: 48px;
  }
  .broken {
    color: var(--muted);
  }
  @media (max-width: 768px) {
    .pair {
      grid-template-columns: minmax(0, 1fr);
      gap: 48px;
    }
  }
  @media (max-width: 960px) {
    .page-layout {
      flex-direction: column;
      gap: 0;
    }
  }

  @media (max-width: 640px) {
    main {
      gap: 48px;
      margin-top: 48px;
    }
  }
  @media (max-width: 480px) {
    .page {
      width: min(var(--width), calc(100% - 24px));
      padding: 12px 0 32px;
    }
    main {
      gap: 40px;
      margin-top: 40px;
    }
    .pair {
      gap: 40px;
    }
  }
</style>
