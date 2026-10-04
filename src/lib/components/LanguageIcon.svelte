<script lang="ts">
  import { resolveLanguageIcon } from './language-icons';

  let {
    language,
    size = 16,
  }: {
    language: string | null;
    size?: number;
  } = $props();

  const langKey = $derived((language || '').trim().toLowerCase());
  const resolved = $derived(resolveLanguageIcon(langKey));
</script>

<span class="lang-icon" style:width="{size}px" style:height="{size}px" title={language || 'Code'}>
  {#if resolved}
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={resolved.icon.path} fill={resolved.fill} />
    </svg>
  {:else}
    <svg viewBox="0 0 32 32" width={size} height={size} fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="4" fill="#1c2536" />
      <path
        d="M11 12l-4 4 4 4M21 12l4 4-4 4M17 10l-2 12"
        stroke="#8bbf73"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  {/if}
</span>

<style>
  .lang-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    vertical-align: middle;
    flex-shrink: 0;
  }

  svg {
    display: block;
    overflow: visible;
  }
</style>
