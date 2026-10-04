<script lang="ts">
  import { evaluateGuess, type TileStatus } from './game';

  let {
    guesses,
    currentGuess,
    target,
    isInvalidRow = false,
    isWonRow = false,
    highContrast = false,
  }: {
    guesses: string[];
    currentGuess: string;
    target: string;
    isInvalidRow?: boolean;
    isWonRow?: boolean;
    highContrast?: boolean;
  } = $props();

  const ROWS = 6;
  const COLS = 5;

  interface CellData {
    letter: string;
    status: TileStatus;
    revealed: boolean;
    col: number;
  }

  const rowsData = $derived(
    Array.from({ length: ROWS }, (_, rowIdx): CellData[] => {
      if (rowIdx < guesses.length) {
        // Completed row
        const guess = guesses[rowIdx];
        const statuses = evaluateGuess(guess, target);
        return Array.from({ length: COLS }, (_, colIdx) => ({
          letter: guess[colIdx] || '',
          status: statuses[colIdx] || 'absent',
          revealed: true,
          col: colIdx,
        }));
      } else if (rowIdx === guesses.length) {
        // Active typing row
        return Array.from({ length: COLS }, (_, colIdx) => ({
          letter: currentGuess[colIdx] || '',
          status: currentGuess[colIdx] ? 'tbd' : 'empty',
          revealed: false,
          col: colIdx,
        }));
      } else {
        // Inactive future row
        return Array.from({ length: COLS }, (_, colIdx) => ({
          letter: '',
          status: 'empty',
          revealed: false,
          col: colIdx,
        }));
      }
    })
  );
</script>

<div class="grid-board" role="grid" aria-label="Wordle Grid">
  {#each rowsData as row, rowIdx (rowIdx)}
    <div
      class="grid-row"
      class:shake={rowIdx === guesses.length && isInvalidRow}
      class:won={rowIdx === guesses.length - 1 && isWonRow}
      role="row"
    >
      {#each row as cell, colIdx (colIdx)}
        <div
          class="tile px"
          class:filled={cell.letter !== '' && !cell.revealed}
          class:revealed={cell.revealed}
          class:correct={cell.status === 'correct'}
          class:present={cell.status === 'present'}
          class:absent={cell.status === 'absent'}
          class:high-contrast={highContrast}
          style:--col-delay="{colIdx * 160}ms"
          role="gridcell"
          aria-label="{cell.letter ? cell.letter : 'Empty'} {cell.status}"
        >
          <span class="letter">{cell.letter}</span>
        </div>
      {/each}
    </div>
  {/each}
</div>

<style>
  .grid-board {
    display: grid;
    grid-template-rows: repeat(6, 1fr);
    gap: 8px;
    width: 100%;
    max-width: 320px;
    margin: 0 auto;
    user-select: none;
  }

  .grid-row {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
  }

  .grid-row.shake {
    animation: row-shake 0.5s ease-in-out;
  }

  .grid-row.won .tile {
    animation: tile-bounce 0.6s ease-in-out forwards;
    animation-delay: var(--col-delay);
  }

  .tile {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    font-weight: 700;
    text-transform: uppercase;
    background: var(--field);
    color: var(--fg);
    border: 2px solid var(--dim);
    transition: transform 0.1s ease, border-color 0.15s ease;
  }

  .tile.filled {
    border-color: var(--fg);
    animation: tile-pop 0.12s ease-in-out;
  }

  .tile.revealed {
    animation: tile-flip 0.5s ease-in-out forwards;
    animation-delay: var(--col-delay);
  }

  /* Evaluation colors applied on reveal */
  .tile.correct {
    background: var(--accent);
    border-color: var(--accent);
    color: #080c18;
  }

  .tile.present {
    background: #d69e2e;
    border-color: #d69e2e;
    color: #080c18;
  }

  .tile.absent {
    background: #1c2436;
    border-color: #1c2436;
    color: var(--muted);
  }

  /* High contrast mode colors */
  .tile.correct.high-contrast {
    background: #f97316;
    border-color: #f97316;
    color: #080c18;
  }

  .tile.present.high-contrast {
    background: #0ea5e9;
    border-color: #0ea5e9;
    color: #080c18;
  }

  .letter {
    display: block;
    line-height: 1;
  }

  @keyframes tile-pop {
    0% {
      transform: scale(0.92);
    }
    50% {
      transform: scale(1.1);
    }
    100% {
      transform: scale(1);
    }
  }

  @keyframes tile-flip {
    0% {
      transform: rotateX(0);
    }
    50% {
      transform: rotateX(90deg);
    }
    100% {
      transform: rotateX(0);
    }
  }

  @keyframes row-shake {
    0%, 100% {
      transform: translateX(0);
    }
    20%, 60% {
      transform: translateX(-6px);
    }
    40%, 80% {
      transform: translateX(6px);
    }
  }

  @keyframes tile-bounce {
    0%, 100% {
      transform: translateY(0);
    }
    40% {
      transform: translateY(-16px);
    }
    70% {
      transform: translateY(4px);
    }
  }

  @media (max-width: 480px) {
    .grid-board {
      max-width: 290px;
      gap: 6px;
    }
    .grid-row {
      gap: 6px;
    }
    .tile {
      font-size: 24px;
    }
  }
</style>
