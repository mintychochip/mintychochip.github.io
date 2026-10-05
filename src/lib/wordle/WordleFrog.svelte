<script lang="ts">
  import { playFrogCroak } from './sound';

  let {
    mood = 'idle',
    message = '',
  }: {
    mood?: 'idle' | 'thinking' | 'happy' | 'sad' | 'hop';
    message?: string;
  } = $props();

  let isHovered = $state(false);

  function handleClick() {
    playFrogCroak();
  }

  // 13 columns x 9 rows
  const SIT_PIXELS = [
    '...oo...oo...',
    '..owwo.owwo..',
    '..owkooowkoo.',
    '.ogoogggoogo.',
    '.ohgpggmmgpgo',
    'ogggoggbbbbgo',
    'odddgobbbbbgo',
    'oDddogoggobgo',
    '.oooooooooooo',
  ];

  // Palette matching mintychochip retro theme
  const COLOR_MAP: Record<string, string> = {
    o: '#080c18',
    m: '#080c18',
    k: '#080c18',
    w: '#f3eab5',
    g: '#8bbf73',
    h: '#a8cc5c',
    d: '#2f7a66',
    D: '#1f4a5e',
    b: '#ece6cc',
    p: '#e8977c',
  };

  const padPixels = [
    '..oooooooooo..',
    '.oggggggggggo.',
    'oggggggggggggo',
    'oggggggggggggo',
    '.oddddddddddo.',
    '..oooooooooo..',
  ];

  const PAD_COLORS: Record<string, string> = {
    o: '#080c18',
    g: '#2f7a66',
    d: '#1f4a5e',
  };
</script>

<button
  type="button"
  class="frog-container clickable"
  class:hop={mood === 'hop' || mood === 'happy'}
  class:sad={mood === 'sad'}
  aria-label="Bumpy the Frog"
  onclick={handleClick}
  onpointerenter={() => (isHovered = true)}
  onpointerleave={() => (isHovered = false)}
>
  <div class="speech-bubble" class:visible={Boolean(message) || isHovered}>
    {message || 'Ribbit!'}
  </div>

  <svg class="frog-svg" viewBox="0 0 16 16" width="68" height="68" shape-rendering="crispEdges">
    <!-- Lilypad -->
    <g transform="translate(1, 10)">
      {#each padPixels as row, y}
        {#each row.split('') as ch, x}
          {#if ch !== '.' && PAD_COLORS[ch]}
            <rect x={x} y={y} width="1" height="1" fill={PAD_COLORS[ch]} />
          {/if}
        {/each}
      {/each}
    </g>

    <!-- Frog -->
    <g transform="translate(1.5, 3)">
      {#each SIT_PIXELS as row, y}
        {#each row.split('') as ch, x}
          {#if ch !== '.' && COLOR_MAP[ch]}
            <!-- Change pupil or mouth depending on mood -->
            {#if ch === 'k' && mood === 'thinking'}
              <rect x={x} y={y - 0.5} width="1" height="1" fill="#080c18" />
            {:else if ch === 'm' && mood === 'sad'}
              <rect x={x} y={y + 0.3} width="1" height="1" fill="#080c18" />
            {:else}
              <rect x={x} y={y} width="1" height="1" fill={COLOR_MAP[ch]} />
            {/if}
          {/if}
        {/each}
      {/each}
    </g>
  </svg>
</button>

<style>
  .frog-container {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    user-select: none;
    background: transparent;
    border: none;
    padding: 0;
    font: inherit;
    color: inherit;
    transition: transform 0.15s ease;
  }

  .frog-container.clickable {
    cursor: var(--cursor-pointer);
  }

  .frog-container.clickable:hover .frog-svg {
    transform: scale(1.08) translateY(-2px);
    filter: drop-shadow(0 4px 10px rgba(139, 191, 115, 0.4));
  }

  .speech-bubble {
    position: absolute;
    bottom: calc(100% - 6px);
    background: var(--fg);
    color: var(--bg);
    font-size: 13px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 4px;
    white-space: normal;
    max-width: 240px;
    text-align: center;
    opacity: 0;
    transform: translateY(4px);
    transition: opacity 0.15s ease, transform 0.15s ease;
    pointer-events: none;
    z-index: 5;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  }

  .speech-bubble::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-width: 4px;
    border-style: solid;
    border-color: var(--fg) transparent transparent transparent;
  }

  .speech-bubble.visible {
    opacity: 1;
    transform: translateY(0);
  }

  .frog-svg {
    display: block;
    filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.5));
    transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  .hop .frog-svg {
    animation: frog-leap 0.6s ease-in-out infinite alternate;
  }

  .sad .frog-svg {
    transform: scale(0.95) translateY(2px);
    filter: grayscale(0.2) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
  }

  @keyframes frog-leap {
    0% {
      transform: translateY(0) scale(1);
    }
    50% {
      transform: translateY(-8px) scale(1.08, 0.95);
    }
    100% {
      transform: translateY(0) scale(0.96, 1.04);
    }
  }
</style>
