<script lang="ts">
  import { onMount } from 'svelte';
  import type { Component } from 'svelte';
  import GrandLoader from './GrandLoader.svelte';
  import SecretDenied from './SecretDenied.svelte';
  import type { VaultCopy } from './vault-types';

  let {
    onNavigate,
    onReveal,
    openVault,
  }: {
    onNavigate: (tab: 'portfolio' | 'wordle') => void;
    onReveal?: (open: boolean) => void;
    openVault?: (passphrase: string) => Promise<VaultCopy>;
  } = $props();

  type VaultView = 'denied' | 'loading' | 'vault';
  let view = $state<VaultView>('denied');
  let error = $state('');
  let busy = $state(false);
  let payload = $state<VaultCopy | null>(null);
  let Vault = $state<Component<{
    onLogout: () => void;
    onNavigate: (tab: 'portfolio' | 'wordle') => void;
    copy: VaultCopy;
  }> | null>(null);

  async function defaultOpen(passphrase: string): Promise<VaultCopy> {
    const { openSealedVault } = await import('./vault-open');
    return openSealedVault(passphrase);
  }

  function lock() {
    payload = null;
    Vault = null;
    error = '';
    busy = false;
    view = 'denied';
  }

  async function handleSubmit(passphrase: string) {
    error = '';
    busy = true;
    try {
      const opener = openVault ?? defaultOpen;
      const opened = await opener(passphrase);
      const viewMod = await import('./SecretVault.svelte');
      payload = opened;
      Vault = viewMod.default;
      view = 'loading';
    } catch {
      payload = null;
      Vault = null;
      error = 'That passphrase does not open the vault.';
    } finally {
      busy = false;
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
  });
</script>

<div class="secret-page-root">
  {#if view === 'loading'}
    <GrandLoader onComplete={() => (view = 'vault')} />
  {:else if view === 'vault' && Vault && payload}
    <Vault
      copy={payload}
      onLogout={lock}
      {onNavigate}
    />
  {:else}
    <SecretDenied {onNavigate} {error} {busy} onSubmit={handleSubmit} />
  {/if}
</div>

<style>
  .secret-page-root {
    width: 100%;
    margin: 0 auto;
  }
</style>
