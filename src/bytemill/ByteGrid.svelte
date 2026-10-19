<script lang="ts">
  import { byteRows, toHex } from './wire';

  let { hex, label = 'Wire bytes' }: { hex: string; label?: string } = $props();

  const rows = $derived.by(() => {
    try {
      return byteRows(hex);
    } catch {
      return [];
    }
  });

  function ascii(bytes: number[]): string {
    return bytes.map((byte) => (byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.')).join('');
  }
</script>

{#if rows.length > 0}
  <div class="grid" aria-label={label}>
    {#each rows as row}
      <div class="row">
        <span class="offset">{row.offset.toString(16).padStart(4, '0')}</span>
        <span class="cells">
          {#each row.bytes as byte, index}
            <span class="byte" class:zero={byte === 0} title={`${row.offset + index}: 0x${toHex([byte])} (${byte})`}
              >{toHex([byte])}</span
            >
          {/each}
        </span>
        <span class="ascii">{ascii(row.bytes)}</span>
      </div>
    {/each}
  </div>
{/if}

<style>
  .grid {
    margin: 10px 0;
    padding: 8px 10px;
    background: #080c18;
    border: 1px solid rgba(104, 113, 132, 0.3);
    overflow-x: auto;
    font: 13px/1.6 var(--font-body);
  }

  .row {
    display: flex;
    align-items: baseline;
    gap: 10px;
    min-width: max-content;
  }

  .offset {
    color: var(--dim);
    user-select: none;
  }

  .cells {
    display: inline-flex;
    gap: 4px;
  }

  .byte {
    min-width: 2ch;
    padding: 0 2px;
    color: var(--fg);
    background: #151c2b;
    text-align: center;
  }

  .byte.zero {
    color: var(--dim);
  }

  .ascii {
    color: var(--accent);
    white-space: pre;
  }
</style>
