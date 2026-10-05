<script lang="ts">
  import { onMount } from 'svelte';
  import type { Component } from 'svelte';
  import GrandLoader from './GrandLoader.svelte';
  import SecretDenied from './SecretDenied.svelte';
  import { clearVaultGrant, vaultGrantActive } from './vault-gate';
  import type { VaultCopy } from './vault-types';

  let {
    onNavigate,
    onReveal,
    openVault,
  }: {
    onNavigate: (tab: 'portfolio' | 'wordle') => void;
    onReveal?: (open: boolean) => void;
    openVault?: () => Promise<VaultCopy>;
  } = $props();

  type VaultView = 'denied' | 'loading' | 'vault';
  let view = $state<VaultView>(vaultGrantActive() ? 'loading' : 'denied');
  let loaderDone = false;
  let error = $state('');
  let payload = $state<VaultCopy | null>(null);
  let Vault = $state<Component<{
    onLogout: () => void;
    onNavigate: (tab: 'portfolio' | 'wordle') => void;
    copy: VaultCopy;
  }> | null>(null);

  async function defaultOpen(): Promise<VaultCopy> {
    const { openSealedVault } = await import('./vault-open');
    return openSealedVault();
  }

  function lock() {
    clearVaultGrant();
    payload = null;
    Vault = null;
    loaderDone = false;
    error = '';
    view = 'denied';
  }

  function finishLoader() {
    loaderDone = true;
    if (payload && Vault) view = 'vault';
  }

  async function unlock() {
    error = '';
    try {
      const opener = openVault ?? defaultOpen;
      const opened = await opener();
      const viewMod = await import('./SecretVault.svelte');
      payload = opened;
      Vault = viewMod.default;
      view = loaderDone ? 'vault' : 'loading';
    } catch {
      clearVaultGrant();
      payload = null;
      Vault = null;
      view = 'denied';
      error = 'The vault did not open.';
    }
  }

  $effect(() => {
    onReveal?.(view !== 'denied');
  });

  onMount(() => {
    const hash = window.location.hash || '';
    if (hash.includes('token=')) {
      const clean = hash.split('?')[0] || '#secret';
      window.location.hash = clean;
    }
    if (vaultGrantActive()) void unlock();
  });
</script>

<div class="secret-page-root">
  {#if view === 'loading'}
    <GrandLoader onComplete={finishLoader} />
  {:else if view === 'vault' && Vault && payload}
    <Vault
      copy={payload}
      onLogout={lock}
      {onNavigate}
    />
  {:else}
    <SecretDenied {onNavigate} {error} />
  {/if}
</div>

<style>
  .secret-page-root {
    width: 100%;
    margin: 0 auto;
  }
</style>
