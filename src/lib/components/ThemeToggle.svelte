<script lang="ts">
  import { theme } from '../theme.svelte';
</script>

{#snippet sun()}
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
    <circle cx="10" cy="10" r="4" fill="currentColor" />
    <g stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
      <line x1="10" y1="2" x2="10" y2="4" /><line x1="10" y1="16" x2="10" y2="18" />
      <line x1="2" y1="10" x2="4" y2="10" /><line x1="16" y1="10" x2="18" y2="10" />
      <line x1="4.2" y1="4.2" x2="5.6" y2="5.6" /><line x1="14.4" y1="14.4" x2="15.8" y2="15.8" />
      <line x1="14.4" y1="5.6" x2="15.8" y2="4.2" /><line x1="4.2" y1="15.8" x2="5.6" y2="14.4" />
    </g>
  </svg>
{/snippet}
{#snippet moon()}
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
    <path d="M11.5 2.2a7.5 7.5 0 1 0 6.3 11.3A6.5 6.5 0 1 1 11.5 2.2Z" fill="currentColor" />
  </svg>
{/snippet}

<button
  type="button"
  class="theme-toggle"
  aria-label={theme.effective === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
  title={theme.effective === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
  onclick={() => theme.toggle()}
>
  {#if theme.effective === 'dark'}{@render moon()}{:else}{@render sun()}{/if}
</button>
