<script lang="ts">
  let {
    onNavigate,
    error = '',
  }: {
    onNavigate: (tab: 'portfolio' | 'wordle') => void;
    error?: string;
  } = $props();
</script>

<div class="denied">
  <svg class="lock" viewBox="0 0 9 10" shape-rendering="crispEdges" aria-hidden="true">
    <path d="M2 0h5v1h-5zM1 1h1v3h-1zM7 1h1v3h-1zM0 4h9v6h-9z" style:fill="var(--muted)" />
    <path d="M4 6h1v2h-1z" style:fill="var(--bg)" />
  </svg>
  <h2 class="denied-title">Bumpy's vault is sealed</h2>
  <p class="denied-message">It opens for one person, with one word.</p>
  {#if error}
    <p class="passphrase-error" role="alert">{error}</p>
  {/if}
  <div class="denied-actions">
    <button type="button" class="btn px" onclick={() => onNavigate('wordle')}>Back to Wordle</button>
    <button type="button" class="text-btn" onclick={() => onNavigate('portfolio')}>Portfolio</button>
  </div>
</div>

<style>
  .denied {
    display: grid;
    justify-items: center;
    max-width: 520px;
    margin: 72px auto 0;
    text-align: center;
    user-select: none;
  }

  .lock {
    width: 36px;
    height: 40px;
  }

  .denied-title {
    margin: 20px 0 0;
    font-size: clamp(24px, 5vw, 30px);
    line-height: 1.2;
  }

  .denied-message {
    margin: 10px 0 0;
    color: var(--muted);
  }

  .passphrase-error {
    margin: 12px 0 0;
    color: var(--error);
  }

  .denied-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 10px 22px;
    margin-top: 26px;
  }

  .text-btn {
    padding: 6px 0;
    border: 0;
    background: none;
    color: var(--muted);
    text-decoration: underline;
    text-underline-offset: 4px;
    cursor: var(--cursor-pointer);
  }

  .text-btn:hover {
    color: var(--accent);
  }
</style>
