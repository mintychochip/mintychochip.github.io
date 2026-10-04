<script lang="ts">
  import { onMount } from 'svelte';
  import { isVaultSessionActive, revokeVaultSession, validateAndConsumeToken } from './auth';
  import GrandLoader from './GrandLoader.svelte';
  import SecretDenied from './SecretDenied.svelte';
  import SecretVault from './SecretVault.svelte';

  let {
    onNavigate,
  }: {
    onNavigate: (tab: 'portfolio' | 'wordle') => void;
  } = $props();

  type VaultView = 'checking' | 'loading' | 'vault' | 'denied';
  let view = $state<VaultView>('checking');

  function checkAccess() {
    if (typeof window === 'undefined') return;

    // Check if session is already authorized
    if (isVaultSessionActive()) {
      view = 'vault';
      return;
    }

    // Check for one-time token in URL hash or query params
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    let token = '';

    if (hash.includes('token=')) {
      token = hash.split('token=')[1]?.split('&')[0];
    } else if (search.includes('token=')) {
      token = new URLSearchParams(search).get('token') || '';
    }

    if (token && validateAndConsumeToken(token)) {
      if (token === 'preview' || token === 'sk_preview') {
        view = 'vault';
      } else {
        // Valid one-time token! Trigger the grand loading screen animation
        view = 'loading';
      }
    } else {
      // Missing or invalid token
      view = 'denied';
    }
  }

  function handleLogout() {
    revokeVaultSession();
    view = 'denied';
  }

  onMount(() => {
    checkAccess();

    function handleHash() {
      checkAccess();
    }
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  });
</script>

<div class="secret-page-root">
  {#if view === 'loading'}
    <GrandLoader onComplete={() => (view = 'vault')} />
  {:else if view === 'vault'}
    <SecretVault
      onLogout={handleLogout}
      {onNavigate}
    />
  {:else if view === 'denied'}
    <SecretDenied {onNavigate} />
  {/if}
</div>

<style>
  .secret-page-root {
    width: 100%;
    margin: 0 auto;
  }
</style>
