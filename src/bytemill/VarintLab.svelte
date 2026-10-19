<script lang="ts">
  import type { Bytemill, EncodeData } from './wasm';
  import { VARINT_SCHEMA } from './schemas';
  import { binary, parseBytes, varintBytes } from './wire';
  import { describeError, type ErrorView } from './errors';
  import ErrorNotice from './ErrorNotice.svelte';

  let { engine }: { engine: Bytemill | null } = $props();

  const sampleValues = [0, 1, 127, 128, 300, 25565, 2_097_151, 268_435_455, -1];

  let value = $state(300);
  let result = $state<EncodeData | null>(null);
  let error = $state<ErrorView | null>(null);
  let pending = $state(false);
  let request = 0;

  const bytes = $derived(result ? parseBytes(result.hex) : []);
  const groups = $derived(varintBytes(bytes));
  const canonical = $derived(result?.fields.value);

  function choose(next: number) {
    value = Math.trunc(next);
  }

  $effect(() => {
    if (!engine) return;
    const requested = value;

    if (!Number.isInteger(requested) || requested < -2_147_483_648 || requested > 2_147_483_647) {
      result = null;
      pending = false;
      error = {
        kind: 'RangeError',
        message: 'This VarInt is a signed 32-bit value. Pick a number from -2147483648 to 2147483647.',
        location: null,
        wireOffset: null,
      };
      return;
    }

    pending = true;
    const timer = window.setTimeout(() => {
      const id = ++request;
      try {
        const data = engine.encode(VARINT_SCHEMA, 'echo', { value: requested });
        if (id !== request) return;
        result = data;
        error = null;
      } catch (cause) {
        if (id !== request) return;
        result = null;
        error = describeError(cause, VARINT_SCHEMA);
      } finally {
        if (id === request) pending = false;
      }
    }, 40);

    return () => window.clearTimeout(timer);
  });
</script>

<div class="lab">
  <div class="lab-head">
    <span class="tag">live · varint.bml</span>
    <span class="count" aria-live="polite">
      {pending ? 'encoding…' : result ? `${result.bytes} byte${result.bytes === 1 ? '' : 's'}` : ''}
    </span>
  </div>

  <div class="controls">
    <label class="field">
      <span>signed 32-bit value</span>
      <input
        type="number"
        min="-2147483648"
        max="2147483647"
        step="1"
        bind:value
        aria-label="VarInt value"
      />
    </label>
    <div class="chips" aria-label="Example values">
      {#each sampleValues as sample}
        <button type="button" class="chip px" class:active={value === sample} onclick={() => choose(sample)}>
          {sample}
        </button>
      {/each}
    </div>
  </div>

  {#if error}
    <ErrorNotice {error} />
  {:else if result}
    <div class="readout">
      <div class="hex" aria-label="Encoded bytes">
        {#each groups as group}
          <span class="octet" class:last={!group.continuation}>
            <span class="hex-byte">{group.value.toString(16).padStart(2, '0')}</span>
            <span class="bits">{binary(group.value)}</span>
          </span>
        {/each}
      </div>

      <div class="formula">
        <span class="equals">{value} →</span>
        <code>{result.hex.replace(/(..)/g, '$1 ').trim()}</code>
        <span class="back">→ {canonical}</span>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>byte</th>
              <th>binary</th>
              <th>continuation</th>
              <th>7-bit payload</th>
            </tr>
          </thead>
          <tbody>
            {#each groups as group}
              <tr>
                <td>{group.index}</td>
                <td>0x{group.value.toString(16).padStart(2, '0')}</td>
                <td><code>{binary(group.value)}</code></td>
                <td class:yes={group.continuation}>{group.continuation ? '1 · more' : '0 · last'}</td>
                <td><code>{binary(group.payload, 7)}</code> ({group.payload})</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <p class="footnote">
        {#if value < 0}
          Negative values are written as the 32-bit two's-complement pattern, so they always take
          five bytes.
        {:else if groups.length === 1}
          Every byte after the first carries the next seven bits. One byte holds 0–127.
        {:else}
          The high bit says “read another byte.” {groups.length} bytes carry {groups.length * 7}
          payload bits; only the low 32 matter.
        {/if}
      </p>
    </div>
  {/if}
</div>

<style>
  .lab {
    margin: 20px 0 26px;
    background: var(--field);
    border: 1px solid rgba(104, 113, 132, 0.4);
  }

  .lab-head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 7px 12px;
    background: #0d1320;
    border-bottom: 1px solid rgba(104, 113, 132, 0.3);
    font-size: 13px;
  }

  .tag {
    color: var(--accent);
    font-family: var(--font);
  }

  .count {
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    gap: 14px 22px;
    padding: 14px 14px 4px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-size: 13px;
    color: var(--muted);
  }

  input {
    width: 190px;
    padding: 6px 8px;
    background: #080c18;
    border: 1px solid rgba(104, 113, 132, 0.55);
    color: var(--fg);
    font: 15px var(--font-body);
  }

  input:focus-visible {
    border-color: var(--accent);
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding-bottom: 4px;
  }

  .chip {
    padding: 3px 8px;
    background: #1d2639;
    border: 1px solid rgba(104, 113, 132, 0.45);
    color: var(--muted);
    font: 12px var(--font-body);
  }

  .chip:hover,
  .chip.active {
    border-color: var(--accent);
    color: var(--fg);
  }

  .readout {
    padding: 8px 14px 16px;
  }

  .hex {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 8px 0 12px;
  }

  .octet {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 6px 8px 5px;
    background: #080c18;
    border: 1px solid rgba(139, 191, 115, 0.5);
  }

  .octet:not(.last) {
    border-color: rgba(244, 140, 184, 0.55);
  }

  .hex-byte {
    color: var(--fg);
    font: 17px/1 var(--font-body);
  }

  .bits {
    color: var(--muted);
    font: 11px/1 var(--font-body);
    letter-spacing: 0.03em;
  }

  .formula {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 10px;
    padding: 9px 11px;
    background: #080c18;
    border: 1px solid rgba(104, 113, 132, 0.3);
    font-size: 14px;
  }

  .equals {
    color: var(--muted);
  }

  .formula code {
    color: var(--accent);
    font-family: var(--font-body);
  }

  .back {
    color: var(--muted);
  }

  .table-wrap {
    margin-top: 12px;
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  th,
  td {
    padding: 5px 8px;
    border-bottom: 1px solid rgba(104, 113, 132, 0.22);
    text-align: left;
  }

  th {
    color: var(--dim);
    font-weight: 400;
  }

  td {
    color: var(--fg);
  }

  td.yes {
    color: var(--love);
  }

  td code {
    color: var(--accent);
    font-family: var(--font-body);
  }

  .footnote {
    margin: 12px 0 0;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.5;
  }
</style>
