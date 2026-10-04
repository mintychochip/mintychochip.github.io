<script lang="ts">
  import type { TileStatus } from './game';

  let {
    statuses = {},
    disabled = false,
    highContrast = false,
    onKey,
    onEnter,
    onDelete,
  }: {
    statuses: Record<string, TileStatus>;
    disabled?: boolean;
    highContrast?: boolean;
    onKey: (key: string) => void;
    onEnter: () => void;
    onDelete: () => void;
  } = $props();

  const ROW_1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
  const ROW_2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'];
  const ROW_3 = ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DELETE'];

  function handleClick(key: string, event: MouseEvent) {
    (event.currentTarget as HTMLElement)?.blur();
    if (disabled) return;
    if (key === 'ENTER') {
      onEnter();
    } else if (key === 'DELETE') {
      onDelete();
    } else {
      onKey(key);
    }
  }
</script>

<div class="keyboard" role="group" aria-label="Wordle Keyboard">
  <div class="kb-row">
    {#each ROW_1 as key (key)}
      {@const status = statuses[key]}
      <button
        type="button"
        class="key px"
        class:correct={status === 'correct'}
        class:present={status === 'present'}
        class:absent={status === 'absent'}
        class:high-contrast={highContrast}
        {disabled}
        onclick={(e) => handleClick(key, e)}
        aria-label="{key} {status || 'unused'}"
      >
        {key}
      </button>
    {/each}
  </div>

  <div class="kb-row">
    <div class="spacer half"></div>
    {#each ROW_2 as key (key)}
      {@const status = statuses[key]}
      <button
        type="button"
        class="key px"
        class:correct={status === 'correct'}
        class:present={status === 'present'}
        class:absent={status === 'absent'}
        class:high-contrast={highContrast}
        {disabled}
        onclick={(e) => handleClick(key, e)}
        aria-label="{key} {status || 'unused'}"
      >
        {key}
      </button>
    {/each}
    <div class="spacer half"></div>
  </div>

  <div class="kb-row">
    {#each ROW_3 as key (key)}
      {@const isSpecial = key === 'ENTER' || key === 'DELETE'}
      {@const status = statuses[key]}
      <button
        type="button"
        class="key px"
        class:wide={isSpecial}
        class:correct={status === 'correct'}
        class:present={status === 'present'}
        class:absent={status === 'absent'}
        class:high-contrast={highContrast}
        {disabled}
        onclick={(e) => handleClick(key, e)}
        aria-label={key === 'DELETE' ? 'Backspace' : key}
      >
        {#if key === 'DELETE'}
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H7.07L2.4 12l4.66-7H22v14zm-11.59-2L14 13.41 17.59 17 19 15.59 15.41 12 19 8.41 17.59 7 14 10.59 10.41 7 9 8.41 12.59 12 9 15.59z"/>
          </svg>
        {:else}
          {key}
        {/if}
      </button>
    {/each}
  </div>
</div>

<style>
  .keyboard {
    display: flex;
    flex-direction: column;
    gap: 7px;
    width: 100%;
    max-width: 500px;
    margin: 0 auto;
    user-select: none;
  }

  .kb-row {
    display: flex;
    justify-content: center;
    gap: 6px;
    touch-action: manipulation;
  }

  .spacer.half {
    flex: 0.5;
  }

  .key {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 52px;
    padding: 0;
    border: 0;
    background: #1c2638;
    color: var(--fg);
    font-size: 19px;
    font-weight: 700;
    text-transform: uppercase;
    cursor: var(--cursor-pointer);
    transition: background 0.15s ease, transform 0.08s ease;
  }

  .key:hover:not(:disabled) {
    background: #283750;
  }

  .key:active:not(:disabled) {
    transform: scale(0.96);
  }

  .key.wide {
    flex: 1.5;
    font-size: 15px;
  }

  .key:disabled {
    cursor: var(--cursor-default);
    opacity: 0.85;
  }

  /* Letter statuses */
  .key.correct {
    background: var(--accent);
    color: #080c18;
  }
  .key.correct:hover:not(:disabled) {
    background: #9ecc85;
  }

  .key.present {
    background: #d69e2e;
    color: #080c18;
  }
  .key.present:hover:not(:disabled) {
    background: #e6b045;
  }

  .key.absent {
    background: #121824;
    color: var(--dim);
  }
  .key.absent:hover:not(:disabled) {
    background: #151e2e;
  }

  /* High contrast mode */
  .key.correct.high-contrast {
    background: #f97316;
    color: #080c18;
  }
  .key.present.high-contrast {
    background: #0ea5e9;
    color: #080c18;
  }

  @media (max-width: 480px) {
    .key {
      height: 48px;
      font-size: 16px;
    }
    .key.wide {
      font-size: 13px;
    }
    .kb-row {
      gap: 4px;
    }
    .keyboard {
      gap: 5px;
    }
  }

  @media (max-width: 360px) {
    .key {
      height: 42px;
      font-size: 13px;
    }
    .key.wide {
      font-size: 11px;
    }
    .kb-row {
      gap: 3px;
    }
    .keyboard {
      gap: 4px;
    }
  }
</style>
