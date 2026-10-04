<script lang="ts">
  let {
    open = false,
    onClose,
  }: {
    open: boolean;
    onClose: () => void;
  } = $props();

  function handleBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
  <div class="modal-backdrop" onclick={handleBackdrop}>
    <div class="modal-card px" role="dialog" aria-modal="true" aria-labelledby="help-title">
      <div class="modal-head">
        <h2 id="help-title">How To Play</h2>
        <button type="button" class="close-btn" onclick={onClose} aria-label="Close modal">✕</button>
      </div>

      <div class="modal-body">
        <p class="summary">Guess the <strong>WORDLE</strong> in 6 tries.</p>
        <ul class="rules">
          <li>Each guess must be a valid 5-letter word.</li>
          <li>The color of the tiles will change to show how close your guess was to the word.</li>
        </ul>

        <div class="section-title">Examples</div>

        <div class="example">
          <div class="example-row">
            <div class="ex-tile px correct">W</div>
            <div class="ex-tile px">E</div>
            <div class="ex-tile px">A</div>
            <div class="ex-tile px">R</div>
            <div class="ex-tile px">Y</div>
          </div>
          <p><strong>W</strong> is in the word and in the correct spot.</p>
        </div>

        <div class="example">
          <div class="example-row">
            <div class="ex-tile px">P</div>
            <div class="ex-tile px present">I</div>
            <div class="ex-tile px">L</div>
            <div class="ex-tile px">L</div>
            <div class="ex-tile px">S</div>
          </div>
          <p><strong>I</strong> is in the word but in the wrong spot.</p>
        </div>

        <div class="example">
          <div class="example-row">
            <div class="ex-tile px">V</div>
            <div class="ex-tile px">A</div>
            <div class="ex-tile px">G</div>
            <div class="ex-tile px absent">U</div>
            <div class="ex-tile px">E</div>
          </div>
          <p><strong>U</strong> is not in the word in any spot.</p>
        </div>

        <div class="daily-note">
          <p>Play the <strong>Daily Wordle</strong> for a shared community puzzle each day, or switch to <strong>Practice Mode</strong> to play as many games as you like!</p>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(11, 15, 25, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    z-index: 100;
    backdrop-filter: blur(4px);
    animation: fade-in 0.15s ease-out;
  }

  .modal-card {
    background: var(--field);
    border: 2px solid var(--dim);
    color: var(--fg);
    width: 100%;
    max-width: 440px;
    max-height: 90vh;
    overflow-y: auto;
    padding: 24px;
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6);
  }

  .modal-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  h2 {
    margin: 0;
    font-size: 24px;
  }

  .close-btn {
    background: none;
    border: 0;
    color: var(--muted);
    font-size: 20px;
    cursor: var(--cursor-pointer);
    padding: 4px 8px;
    line-height: 1;
  }

  .close-btn:hover {
    color: var(--fg);
  }

  .summary {
    margin-top: 0;
    font-size: 18px;
  }

  .rules {
    padding-left: 20px;
    margin-bottom: 20px;
    color: var(--fg);
    font-size: 16px;
    line-height: 1.5;
  }

  .rules li + li {
    margin-top: 8px;
  }

  .section-title {
    font-size: 17px;
    font-weight: 700;
    margin: 20px 0 12px;
    border-bottom: 1px solid var(--dim);
    padding-bottom: 6px;
  }

  .example {
    margin-bottom: 16px;
  }

  .example-row {
    display: flex;
    gap: 6px;
    margin-bottom: 6px;
  }

  .ex-tile {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: 700;
    background: #111726;
    border: 2px solid var(--dim);
  }

  .ex-tile.correct {
    background: var(--accent);
    border-color: var(--accent);
    color: #080c18;
  }

  .ex-tile.present {
    background: #d69e2e;
    border-color: #d69e2e;
    color: #080c18;
  }

  .ex-tile.absent {
    background: #1f283a;
    border-color: #1f283a;
    color: var(--muted);
  }

  .example p {
    margin: 4px 0 0;
    font-size: 15px;
    color: var(--fg);
  }

  .daily-note {
    margin-top: 22px;
    padding-top: 14px;
    border-top: 1px solid var(--dim);
    font-size: 15px;
    color: var(--muted);
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>
