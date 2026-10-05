<script lang="ts">
  let {
    onNavigate,
    error = '',
    busy = false,
    onSubmit,
  }: {
    onNavigate: (tab: 'portfolio' | 'wordle') => void;
    error?: string;
    busy?: boolean;
    onSubmit: (passphrase: string) => void;
  } = $props();

  let passphrase = $state('');

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (busy) return;
    const field = event.currentTarget;
    const entered = field instanceof HTMLFormElement
      ? String(new FormData(field).get('vault-passphrase') ?? '')
      : passphrase;
    onSubmit(entered);
  }
</script>

<div class="denied-wrap">
  <div class="denied-card px">
    <div class="denied-header">
      <div class="denied-led"></div>
      <span class="denied-tag">CLEARANCE REFUSED // TOKEN REQUIRED</span>
    </div>

    <div class="denied-content">
      <div class="denied-icon">🔒</div>
      <h2 class="denied-title">BUMPY'S SECRET VAULT</h2>
      <p class="denied-message">
        This vault is sealed. The passphrase opens it. Nothing else does.
      </p>

      <form class="passphrase-form" onsubmit={handleSubmit}>
        <label class="passphrase-label" for="vault-passphrase">Passphrase</label>
        <input
          id="vault-passphrase"
          class="passphrase-input px"
          type="password"
          name="vault-passphrase"
          autocomplete="off"
          spellcheck="false"
          bind:value={passphrase}
          disabled={busy}
          required
        />
        {#if error}
          <p class="passphrase-error" role="alert">{error}</p>
        {/if}
        <button type="submit" class="btn px wordle-btn" disabled={busy}>
          {busy ? 'Checking…' : 'Open the vault'}
        </button>
      </form>

      <div class="denied-actions">
        <button type="button" class="btn px wordle-btn" onclick={() => onNavigate('wordle')}>
          Back to Wordle
        </button>
        <button type="button" class="btn px portfolio-btn" onclick={() => onNavigate('portfolio')}>
          ← Portfolio
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .denied-wrap {
    width: 100%;
    max-width: 480px;
    margin: 32px auto 0;
    user-select: none;
  }

  .denied-card {
    background: var(--field);
    border: 2px solid var(--dim);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7);
    overflow: hidden;
  }

  .denied-header {
    background: #111726;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 2px solid var(--dim);
  }

  .denied-led {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--error);
    box-shadow: 0 0 8px var(--error);
  }

  .denied-tag {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: var(--error);
  }

  .denied-content {
    padding: 32px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .denied-icon {
    font-size: 48px;
    margin-bottom: 12px;
  }

  .denied-title {
    margin: 0;
    font-size: 24px;
    letter-spacing: 1px;
  }

  .denied-message {
    margin: 8px 0 20px;
    font-size: 15px;
    color: var(--muted);
    line-height: 1.5;
  }

  .passphrase-form {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 18px;
    text-align: left;
  }

  .passphrase-label {
    font-size: 12px;
    letter-spacing: 1px;
    color: var(--muted);
  }

  .passphrase-input {
    width: 100%;
    box-sizing: border-box;
    background: #0f1422;
    color: var(--fg);
    border: 1px solid var(--dim);
    padding: 12px;
    font: inherit;
    font-size: 16px;
  }

  .passphrase-error {
    margin: 0;
    color: var(--error);
    font-size: 14px;
  }

  .denied-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
  }

  .wordle-btn {
    background: var(--accent);
    color: #080c18;
    padding: 12px;
    font-size: 16px;
  }

  .wordle-btn:hover {
    background: #9ecc85;
  }

  .portfolio-btn {
    background: transparent;
    border: 1px solid var(--dim);
    color: var(--muted);
    padding: 10px;
    font-size: 14px;
  }

  .portfolio-btn:hover {
    color: var(--fg);
    border-color: var(--fg);
  }
</style>
