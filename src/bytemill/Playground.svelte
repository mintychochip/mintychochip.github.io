<script lang="ts">
  import type { Bytemill, CheckData, DecodeData, EncodeData } from './wasm';
  import { PRESETS, SAMPLE_VALUES } from './schemas';
  import { describeError, type ErrorView } from './errors';
  import ErrorNotice from './ErrorNotice.svelte';
  import ByteGrid from './ByteGrid.svelte';

  let {
    engine,
    source = $bindable(PRESETS[0].source),
  }: { engine: Bytemill | null; source?: string } = $props();

  type Mode = 'decode' | 'encode' | 'routes';

  let presetId = $state(PRESETS[0].id);
  let mode = $state<Mode>('decode');
  let check = $state<CheckData | null>(null);
  let checkError = $state<ErrorView | null>(null);
  let checking = $state(false);
  let lastChecked = $state('');
  let initialized = $state(false);
  let checkId = 0;
  let sampleId = 0;

  let packet = $state('player_chat');
  let decodeHex = $state('');
  let decodeResult = $state<DecodeData | null>(null);
  let decodeError = $state<ErrorView | null>(null);
  let encodeJson = $state('{}');
  let encodeResult = $state<EncodeData | null>(null);
  let encodeError = $state<ErrorView | null>(null);
  let sampleNote = $state('');
  let copied = $state('');

  const selected = $derived(check?.packets.find((item) => item.name === packet));
  const preset = $derived(PRESETS.find((item) => item.id === presetId));

  function useSample(name: string) {
    const current = source;
    const sample = SAMPLE_VALUES[name];
    const id = ++sampleId;

    if (!engine || !name || !sample) {
      sampleNote = 'No sample for this packet. Paste hex, or write a JSON object by hand.';
      encodeJson = '{}';
      encodeResult = null;
      decodeHex = '';
      decodeResult = null;
      decodeError = null;
      return;
    }

    try {
      const encoded = engine.encode(current, name, sample);
      if (id !== sampleId || current !== source) return;
      encodeJson = JSON.stringify(sample, null, 2);
      encodeResult = encoded;
      encodeError = null;
      decodeHex = encoded.hex;
      decodeResult = {
        packet: name,
        fields: encoded.fields,
        bytes: encoded.bytes,
        hex: encoded.hex,
        reencoded: encoded.hex,
        roundtrip: encoded.roundtrip,
      };
      decodeError = null;
      sampleNote = '';
    } catch (cause) {
      if (id !== sampleId || current !== source) return;
      sampleNote = 'The schema no longer accepts the sample shape for this packet.';
      encodeResult = null;
      decodeResult = null;
      encodeError = describeError(cause, current);
    }
  }

  async function runCheck(resetSamples: boolean) {
    if (!engine) return;
    const current = source;
    const id = ++checkId;
    checking = true;

    try {
      const data = engine.check(current);
      if (id !== checkId || current !== source) return;
      check = data;
      checkError = null;
      lastChecked = current;
      const names = data.packets.map((item) => item.name);
      if (!names.includes(packet)) packet = names[0] ?? '';
      if (resetSamples) useSample(packet);
    } catch (cause) {
      if (id !== checkId) return;
      check = null;
      checkError = describeError(cause, current);
      lastChecked = current;
    } finally {
      if (id === checkId) checking = false;
    }
  }

  function choosePreset(id: string) {
    const next = PRESETS.find((item) => item.id === id);
    if (!next) return;
    presetId = id;
    source = next.source;
    check = null;
    checkError = null;
    decodeResult = null;
    decodeError = null;
    encodeResult = null;
    encodeError = null;
    sampleNote = '';
    packet = '';
    decodeHex = '';
    encodeJson = '{}';
    void runCheck(true);
  }

  function choosePacket(name: string) {
    packet = name;
    useSample(name);
  }

  function decodePacket() {
    decodeError = null;
    if (!engine || !packet) return;
    try {
      decodeResult = engine.decode(source, packet, decodeHex);
    } catch (cause) {
      decodeResult = null;
      decodeError = describeError(cause, source);
    }
  }

  function encodePacket() {
    encodeError = null;
    if (!engine || !packet) return;

    let value: unknown;
    try {
      value = JSON.parse(encodeJson);
    } catch (cause) {
      encodeResult = null;
      encodeError = describeError(cause, source);
      return;
    }
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      encodeResult = null;
      encodeError = {
        kind: 'EncodeError',
        message: 'The encoder needs a JSON object at the top level.',
        location: null,
        wireOffset: null,
      };
      return;
    }

    try {
      const encoded = engine.encode(source, packet, value as Record<string, unknown>);
      encodeResult = encoded;
      decodeHex = encoded.hex;
      decodeResult = {
        packet,
        fields: encoded.fields,
        bytes: encoded.bytes,
        hex: encoded.hex,
        reencoded: encoded.hex,
        roundtrip: encoded.roundtrip,
      };
      decodeError = null;
    } catch (cause) {
      encodeResult = null;
      encodeError = describeError(cause, source);
    }
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      copied = label;
      window.setTimeout(() => {
        if (copied === label) copied = '';
      }, 1600);
    } catch {
      copied = 'copy failed';
    }
  }

  $effect(() => {
    if (!engine || initialized) return;
    initialized = true;
    void runCheck(true);
  });

  $effect(() => {
    if (!engine || !initialized) return;
    const current = source;
    if (current === lastChecked) return;
    const timer = window.setTimeout(() => {
      if (current === source && current !== lastChecked) void runCheck(false);
    }, 650);
    return () => window.clearTimeout(timer);
  });
</script>

<div class="playground">
  <div class="top">
    <div class="presets" role="group" aria-label="Schema presets">
      {#each PRESETS as item}
        <button
          type="button"
          class="preset px"
          class:active={presetId === item.id}
          onclick={() => choosePreset(item.id)}
        >{item.label}</button>
      {/each}
    </div>
    <span class="engine-status" aria-live="polite">
      {checking ? 'checking…' : check ? `${check.packets.length} packets · ${check.routes.length} routes` : ''}
    </span>
  </div>

  <div class="grid">
    <section class="editor" aria-label="Schema editor">
      <div class="pane-head">
        <span>schema.bml</span>
        <span class="hint">⌘/Ctrl + Enter</span>
      </div>
      <textarea
        bind:value={source}
        spellcheck="false"
        autocomplete="off"
        autocapitalize="off"
        wrap="off"
        aria-label="BML schema source"
        onkeydown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault();
            void runCheck(false);
          }
        }}
      ></textarea>
      <div class="editor-foot">
        <button type="button" class="btn px" onclick={() => void runCheck(false)} disabled={!engine}>
          {checking ? 'Checking…' : 'Check schema'}
        </button>
        <span class="note">{preset?.note ?? ''}</span>
      </div>
      {#if checkError}
        <ErrorNotice error={checkError} />
      {:else if check}
        <div class="summary">
          <div class="chips">
            {#each check.encodings as name}<span class="pill">{name}</span>{/each}
            {#each check.enums as item}<span class="pill enum">{item.name}</span>{/each}
          </div>
          {#each check.protocols as protocol}
            <p class="protocol">
              protocol <strong>{protocol.name}</strong> @ {protocol.version} · id {protocol.id} ·
              frame{protocol.frames.length === 1 ? '' : 's'} {protocol.frames.join(', ')}
            </p>
          {/each}
        </div>
      {/if}
    </section>

    <section class="inspector" aria-label="Packet inspector">
      <div class="pane-head tabs" role="tablist" aria-label="Inspector mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'decode'}
          class:active={mode === 'decode'}
          onclick={() => (mode = 'decode')}
        >decode</button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'encode'}
          class:active={mode === 'encode'}
          onclick={() => (mode = 'encode')}
        >encode</button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'routes'}
          class:active={mode === 'routes'}
          onclick={() => (mode = 'routes')}
        >routes</button>
      </div>

      {#if mode !== 'routes'}
        <div class="packet-row">
          <label class="field">
            <span>packet</span>
            <select
              value={packet}
              onchange={(event) => choosePacket(event.currentTarget.value)}
              aria-label="Packet"
            >
              {#each check?.packets ?? [] as item}
                <option value={item.name}>{item.name}</option>
              {/each}
            </select>
          </label>
          <button type="button" class="ghost px" onclick={() => useSample(packet)}>load sample</button>
        </div>
        {#if selected}
          <p class="fields">fields: {selected.fields.join(', ') || 'none (empty packet)'}</p>
        {/if}
      {/if}

      {#if mode === 'decode'}
        <label class="area">
          <span>frame/packet bytes (hex)</span>
          <textarea bind:value={decodeHex} spellcheck="false" rows="4" placeholder="02 68 69 …"></textarea>
        </label>
        <div class="actions">
          <button type="button" class="btn px" onclick={decodePacket} disabled={!engine || !packet}>
            Decode
          </button>
          <button type="button" class="ghost px" onclick={() => copy(decodeHex, 'hex')}>
            {copied === 'hex' ? 'copied ✓' : 'copy hex'}
          </button>
          {#if decodeResult}
            <span class="ok" class:bad={decodeResult.roundtrip === false}>
              {decodeResult.roundtrip === false ? 're-encode differs' : 'round-trip ✓'}
            </span>
          {/if}
        </div>
        {#if decodeError}
          <ErrorNotice error={decodeError} />
        {:else if decodeResult}
          <ByteGrid hex={decodeResult.hex} label="Decoded bytes" />
          <pre class="json">{JSON.stringify(decodeResult.fields, null, 2)}</pre>
          <p class="meta">
            {decodeResult.bytes} bytes · packet <code>{decodeResult.packet}</code>
            {#if decodeResult.reencoded && decodeResult.reencoded !== decodeResult.hex}
              · re-encoded as <code>{decodeResult.reencoded}</code>
            {/if}
          </p>
        {/if}
      {:else if mode === 'encode'}
        <label class="area">
          <span>value (JSON)</span>
          <textarea bind:value={encodeJson} spellcheck="false" rows="7"></textarea>
        </label>
        <div class="actions">
          <button type="button" class="btn px" onclick={encodePacket} disabled={!engine || !packet}>
            Encode
          </button>
          {#if encodeResult}
            <button
              type="button"
              class="ghost px"
              onclick={() => encodeResult && copy(encodeResult.hex, 'encoded')}
            >
              {copied === 'encoded' ? 'copied ✓' : 'copy bytes'}
            </button>
            <span class="ok" class:bad={!encodeResult.roundtrip}>
              {encodeResult.roundtrip ? 'round-trip ✓' : 'round-trip differs'}
            </span>
          {/if}
        </div>
        {#if encodeError}
          <ErrorNotice error={encodeError} />
        {:else if encodeResult}
          <div class="hex-out"><code>{encodeResult.hex}</code></div>
          <ByteGrid hex={encodeResult.hex} label="Encoded bytes" />
          <pre class="json">{JSON.stringify(encodeResult.fields, null, 2)}</pre>
          <p class="meta">
            {encodeResult.bytes} bytes · decoded back to the object above before re-encoding.
          </p>
        {/if}
      {:else}
        <div class="routes-wrap">
          <table>
            <thead><tr><th>state</th><th>direction</th><th>id</th><th>packet</th></tr></thead>
            <tbody>
              {#each check?.routes ?? [] as route}
                <tr>
                  <td>{route.state}</td>
                  <td>{route.direction}</td>
                  <td><code>0x{route.id.toString(16).padStart(2, '0')}</code></td>
                  <td>
                    <button type="button" class="route-link" onclick={() => { choosePacket(route.packet); mode = 'decode'; }}>
                      {route.packet}
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
          {#if !check}
            <p class="meta">Check a schema to see its routes.</p>
          {/if}
        </div>
      {/if}

      {#if sampleNote}
        <p class="note">{sampleNote}</p>
      {/if}
    </section>
  </div>
</div>

<style>
  .playground {
    margin: 22px 0 30px;
    border: 1px solid rgba(104, 113, 132, 0.42);
    background: var(--field);
  }

  .top {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 10px 16px;
    padding: 9px 12px;
    background: #0d1320;
    border-bottom: 1px solid rgba(104, 113, 132, 0.3);
  }

  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .preset {
    padding: 5px 9px;
    border: 1px solid rgba(104, 113, 132, 0.45);
    background: #151c2b;
    color: var(--muted);
    font: 13px var(--font);
  }

  .preset:hover,
  .preset.active {
    border-color: var(--accent);
    color: var(--fg);
  }

  .engine-status {
    color: var(--muted);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  }

  .grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: stretch;
  }

  .editor,
  .inspector {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .editor {
    border-right: 1px solid rgba(104, 113, 132, 0.3);
  }

  .pane-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    padding: 7px 12px;
    border-bottom: 1px solid rgba(104, 113, 132, 0.25);
    color: var(--muted);
    font-size: 13px;
  }

  .pane-head.tabs {
    justify-content: flex-start;
    gap: 18px;
    padding: 0 12px;
  }

  .tabs button {
    padding: 9px 0 7px;
    border: 0;
    border-bottom: 2px solid transparent;
    background: none;
    color: var(--muted);
    font: 14px var(--font);
  }

  .tabs button:hover {
    color: var(--fg);
  }

  .tabs button.active {
    border-bottom-color: var(--accent);
    color: var(--fg);
  }

  .hint {
    color: var(--dim);
    font-size: 12px;
  }

  textarea {
    width: 100%;
    min-height: 360px;
    flex: 1;
    resize: vertical;
    padding: 12px;
    border: 0;
    border-bottom: 1px solid rgba(104, 113, 132, 0.25);
    background: #080c18;
    color: #ded9c2;
    font: 13px/1.55 var(--font-body);
    tab-size: 4;
  }

  .area textarea {
    min-height: 0;
    height: 130px;
    border-bottom: 1px solid rgba(104, 113, 132, 0.25);
  }

  .area {
    display: flex;
    flex-direction: column;
    padding: 10px 12px 0;
    gap: 5px;
    color: var(--muted);
    font-size: 13px;
  }

  .editor textarea {
    white-space: pre;
    overflow-x: auto;
  }

  .editor-foot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 14px;
    padding: 10px 12px;
  }

  .btn {
    font-size: 14px;
    padding: 7px 12px;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

  .note {
    flex: 1;
    min-width: 180px;
    color: var(--dim);
    font-size: 12px;
    line-height: 1.4;
  }

  .summary {
    padding: 0 12px 12px;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-bottom: 8px;
  }

  .pill {
    padding: 1px 6px;
    background: #1d2639;
    color: var(--muted);
    font: 11px var(--font-body);
  }

  .pill.enum {
    color: var(--love);
  }

  .protocol {
    margin: 0;
    color: var(--muted);
    font-size: 12px;
  }

  .protocol strong {
    color: var(--accent);
  }

  .packet-row {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    gap: 10px;
    padding: 10px 12px 4px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    color: var(--muted);
    font-size: 12px;
  }

  select {
    min-width: 170px;
    padding: 6px 8px;
    border: 1px solid rgba(104, 113, 132, 0.55);
    background: #080c18;
    color: var(--fg);
    font: 14px var(--font-body);
  }

  .fields {
    margin: 0;
    padding: 2px 12px 4px;
    color: var(--dim);
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
  }

  .ok {
    color: var(--accent);
    font-size: 13px;
  }

  .ok.bad {
    color: var(--error);
  }

  .json,
  .hex-out {
    margin: 0 12px 8px;
    padding: 10px;
    background: #080c18;
    border: 1px solid rgba(104, 113, 132, 0.3);
    overflow-x: auto;
    color: #ded9c2;
    font: 13px/1.5 var(--font-body);
  }

  .hex-out code {
    color: var(--accent);
    overflow-wrap: anywhere;
  }

  .meta {
    margin: 0 12px 12px;
    color: var(--dim);
    font-size: 12px;
  }

  .meta code {
    color: var(--accent);
    font-family: var(--font-body);
  }

  .routes-wrap {
    padding: 6px 12px 12px;
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  th,
  td {
    padding: 5px 7px;
    border-bottom: 1px solid rgba(104, 113, 132, 0.22);
    text-align: left;
  }

  th {
    color: var(--dim);
    font-weight: 400;
  }

  td code {
    color: var(--accent);
    font-family: var(--font-body);
  }

  .route-link {
    padding: 0;
    border: 0;
    background: none;
    color: var(--fg);
    font: inherit;
    text-decoration: underline;
    text-decoration-color: transparent;
  }

  .route-link:hover {
    color: var(--accent);
    text-decoration-color: var(--accent);
  }

  @media (max-width: 840px) {
    .grid {
      grid-template-columns: minmax(0, 1fr);
    }
    .editor {
      border-right: 0;
      border-bottom: 1px solid rgba(104, 113, 132, 0.3);
    }
    textarea {
      min-height: 300px;
    }
  }
</style>
