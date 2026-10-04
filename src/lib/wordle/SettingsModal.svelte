<script lang="ts">
  import type { GameSettings } from './game';

  let {
    open = false,
    settings,
    canToggleHardMode = true,
    onUpdateSettings,
    onClose,
  }: {
    open: boolean;
    settings: GameSettings;
    canToggleHardMode?: boolean;
    onUpdateSettings: (newSettings: GameSettings) => void;
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

  function toggle(key: keyof GameSettings) {
    if (key === 'hardMode' && !canToggleHardMode && !settings.hardMode) {
      return;
    }
    const updated = {
      ...settings,
      [key]: !settings[key],
    };
    onUpdateSettings(updated);
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
  <div class="modal-backdrop" onclick={handleBackdrop}>
    <div class="modal-card px" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div class="modal-head">
        <h2 id="settings-title">Settings</h2>
        <button type="button" class="close-btn" onclick={onClose} aria-label="Close modal">✕</button>
      </div>

      <div class="settings-list">
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">Hard Mode</span>
            <span class="setting-desc">Any revealed hints must be used in subsequent guesses</span>
            {#if !canToggleHardMode && !settings.hardMode}
              <span class="setting-warn">Can only be enabled at the start of a round</span>
            {/if}
          </div>
          <button
            type="button"
            role="switch"
            aria-label="Toggle hard mode"
            aria-checked={settings.hardMode}
            class="switch px"
            class:active={settings.hardMode}
            disabled={!canToggleHardMode && !settings.hardMode}
            onclick={() => toggle('hardMode')}
          >
            <span class="switch-handle px"></span>
          </button>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">Sound Effects</span>
            <span class="setting-desc">Retro 8-bit synthesizer audio beeps and fanfares</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-label="Toggle sound effects"
            aria-checked={settings.soundEnabled}
            class="switch px"
            class:active={settings.soundEnabled}
            onclick={() => toggle('soundEnabled')}
          >
            <span class="switch-handle px"></span>
          </button>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">High Contrast Mode</span>
            <span class="setting-desc">Contrast colors for improved color vision (orange / blue)</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-label="Toggle high contrast mode"
            aria-checked={settings.highContrast}
            class="switch px"
            class:active={settings.highContrast}
            onclick={() => toggle('highContrast')}
          >
            <span class="switch-handle px"></span>
          </button>
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
    padding: 24px;
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6);
  }

  .modal-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
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

  .settings-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(104, 113, 132, 0.3);
  }

  .setting-item:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .setting-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .setting-label {
    font-size: 17px;
    font-weight: 700;
  }

  .setting-desc {
    font-size: 14px;
    color: var(--muted);
  }

  .setting-warn {
    font-size: 12px;
    color: var(--error);
  }

  /* Pixel toggle switch */
  .switch {
    width: 52px;
    height: 30px;
    background: #111726;
    border: 2px solid var(--dim);
    padding: 2px;
    display: flex;
    align-items: center;
    cursor: var(--cursor-pointer);
    flex-shrink: 0;
    transition: background 0.15s ease, border-color 0.15s ease;
  }

  .switch:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .switch.active {
    background: var(--accent);
    border-color: var(--accent);
  }

  .switch-handle {
    width: 22px;
    height: 22px;
    background: var(--fg);
    transition: transform 0.15s ease;
  }

  .switch.active .switch-handle {
    transform: translateX(22px);
    background: #080c18;
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
