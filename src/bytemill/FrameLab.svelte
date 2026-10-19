<script lang="ts">
  import type { Bytemill, CheckData, DecodeData } from './wasm';
  import { CHAT_SCHEMA } from './schemas';
  import { describeError, type ErrorView } from './errors';
  import ErrorNotice from './ErrorNotice.svelte';
  import ByteGrid from './ByteGrid.svelte';

  let { engine }: { engine: Bytemill | null } = $props();

  const sampleFrame = '21010f68656c6c6f2c20627974656d696c6c00000000000000010000000000000000';

  let frameHex = $state(sampleFrame);
  let routeKey = $state('play.clientbound');
  let check = $state<CheckData | null>(null);
  let result = $state<DecodeData | null>(null);
  let error = $state<ErrorView | null>(null);
  let started = $state(false);

  const routeKeys = $derived(
    check
      ? Array.from(new Set(check.routes.map((route) => `${route.state}.${route.direction}`)))
      : [],
  );
  const stateName = $derived(routeKey.split('.')[0] ?? 'play');
  const direction = $derived(routeKey.split('.')[1] ?? 'clientbound');

  function decodeFrame() {
    if (!engine) return;
    try {
      result = engine.decodeFrame(CHAT_SCHEMA, stateName, direction, frameHex);
      error = null;
    } catch (cause) {
      result = null;
      error = describeError(cause, CHAT_SCHEMA);
    }
  }

  $effect(() => {
    if (!engine || started) return;
    started = true;
    try {
      check = engine.check(CHAT_SCHEMA);
      decodeFrame();
    } catch (cause) {
      error = describeError(cause, CHAT_SCHEMA);
    }
  });
</script>

<div class="lab">
  <div class="lab-head">
    <span class="tag">frame default</span>
    <span class="count">length + id + payload</span>
  </div>

  <div class="frame-diagram" aria-label="Frame layout">
    <div class="seg length">
      <strong>length</strong>
      <span>varint</span>
      <code>0x21</code>
    </div>
    <div class="seg id">
      <strong>id</strong>
      <span>varint</span>
      <code>0x01</code>
    </div>
    <div class="seg payload">
      <strong>payload: rest</strong>
      <span>32 bytes</span>
      <code>player_chat</code>
    </div>
  </div>

  <div class="controls">
    <label class="field">
      <span>route</span>
      <select bind:value={routeKey} aria-label="Connection state and direction">
        {#each routeKeys as key}
          <option value={key}>{key.replace('.', ' · ')}</option>
        {/each}
      </select>
    </label>
  </div>

  <label class="area">
    <span>whole frame (hex)</span>
    <textarea bind:value={frameHex} spellcheck="false" rows="4"></textarea>
  </label>

  <div class="actions">
    <button type="button" class="btn px" onclick={decodeFrame} disabled={!engine}>Decode frame</button>
    <button type="button" class="ghost px" onclick={() => (frameHex = sampleFrame)}>reset sample</button>
    {#if result}
      <span class="ok">route 0x{result.id?.toString(16).padStart(2, '0')} → {result.packet}</span>
    {/if}
  </div>

  {#if error}
    <ErrorNotice {error} />
  {:else if result}
    <ByteGrid hex={result.hex} label="Frame bytes" />
    <pre class="json">{JSON.stringify(result.fields, null, 2)}</pre>
    <p class="meta">
      The frame's <code>id</code> selected <code>{result.packet}</code>; its payload was decoded by
      that packet's fields.
    </p>
  {/if}
</div>

<style>
  .lab {
    margin: 22px 0 30px;
    border: 1px solid rgba(104, 113, 132, 0.42);
    background: var(--field);
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
    color: var(--dim);
  }

  .frame-diagram {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 14px 12px 4px;
  }

  .seg {
    flex: 1 1 120px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    background: #080c18;
    border: 1px solid rgba(104, 113, 132, 0.35);
  }

  .seg strong {
    color: var(--fg);
    font: 14px var(--font);
  }

  .seg span {
    color: var(--muted);
    font-size: 11px;
  }

  .seg code {
    color: var(--accent);
    font: 12px var(--font-body);
  }

  .seg.length {
    border-color: rgba(139, 191, 115, 0.5);
  }

  .seg.id {
    border-color: rgba(244, 140, 184, 0.5);
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    padding: 12px 12px 0;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    color: var(--muted);
    font-size: 12px;
  }

  select {
    min-width: 150px;
    padding: 6px 8px;
    border: 1px solid rgba(104, 113, 132, 0.55);
    background: #080c18;
    color: var(--fg);
    font: 13px var(--font-body);
  }

  .area {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 12px 12px 0;
    color: var(--muted);
    font-size: 13px;
  }

  textarea {
    width: 100%;
    padding: 9px 10px;
    border: 1px solid rgba(104, 113, 132, 0.45);
    background: #080c18;
    color: #ded9c2;
    font: 13px/1.5 var(--font-body);
    resize: vertical;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
  }

  .btn {
    font-size: 14px;
    padding: 7px 12px;
  }

  .btn:disabled {
    opacity: 0.5;
  }

  .ghost {
    padding: 6px 10px;
    border: 1px solid rgba(104, 113, 132, 0.5);
    background: transparent;
    color: var(--muted);
    font: 13px var(--font-body);
  }

  .ghost:hover {
    border-color: var(--accent);
    color: var(--fg);
  }

  .ok {
    color: var(--accent);
    font-size: 13px;
  }

  .json {
    margin: 0 12px 8px;
    padding: 10px;
    background: #080c18;
    border: 1px solid rgba(104, 113, 132, 0.3);
    overflow-x: auto;
    color: #ded9c2;
    font: 13px/1.5 var(--font-body);
  }

  .meta {
    margin: 0 12px 14px;
    color: var(--dim);
    font-size: 12px;
    line-height: 1.5;
  }

  .meta code {
    color: var(--accent);
    font-family: var(--font-body);
  }
</style>
