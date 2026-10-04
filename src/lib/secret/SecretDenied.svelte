<script lang="ts">
  let {
    onNavigate,
  }: {
    onNavigate: (tab: 'portfolio' | 'wordle') => void;
  } = $props();
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
        This hidden chamber is protected by Bumpy the Frog. Direct access is prohibited.
      </p>

      <div class="lore-box px">
        <p>
          To enter, find <strong>Bumpy</strong> sitting on his lilypad in the <strong>Wordle</strong> tab.
          Clicking Bumpy will issue you an exclusive, one-time secret token to bypass security!
        </p>
      </div>

      <div class="denied-actions">
        <button type="button" class="btn px wordle-btn" onclick={() => onNavigate('wordle')}>
          Find Bumpy in Wordle 🐸
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

  .lore-box {
    background: #0f1422;
    border-left: 3px solid #d69e2e;
    padding: 12px 14px;
    margin-bottom: 24px;
    text-align: left;
    font-size: 14px;
    color: var(--fg);
    line-height: 1.5;
  }

  .lore-box p {
    margin: 0;
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
