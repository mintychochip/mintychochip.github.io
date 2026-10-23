<script lang="ts">
  import type { Bytemill, StageData } from './wasm';
  import { describeError, type ErrorView } from './errors';
  import ErrorNotice from './ErrorNotice.svelte';
  import RouteTable from './RouteTable.svelte';

  let { engine, source }: { engine: Bytemill | null; source: string } = $props();

  type Phase = 'syntax' | 'semantic' | 'lowered' | 'typed';

  const phaseOrder: Phase[] = ['syntax', 'semantic', 'lowered', 'typed'];
  const phaseNotes: Record<Phase, string> = {
    syntax:
      'The parser’s output. Declarations are grouped; every name is still an unresolved string.',
    semantic:
      'The analyzer’s output. References resolve, symbol tables exist, and every route names a real packet.',
    lowered:
      'The language-neutral IR. Types, decode/encode procedures, explicit frames, and bound routes.',
    typed:
      'The program printers consume. Names, types, codecs, and locals are explicit and unique.',
  };

  let phase = $state<Phase>('syntax');
  let data = $state<StageData | null>(null);
  let error = $state<ErrorView | null>(null);
  let request = 0;

  const counts = $derived(
    data
      ? {
          syntax: `${data.syntax.declarations.length} declarations`,
          semantic: `${data.semantic.encodings.length + data.semantic.enums.length + data.semantic.packets.length + data.semantic.protocols.length} symbols · ${data.semantic.routes.length} routes`,
          lowered: `${data.lowered.types.length} types · ${data.lowered.decode.length + data.lowered.encode.length} procs`,
          typed: `${data.typed.codecs.length} codecs · ${data.typed.types.length} types`,
        }
      : { syntax: '', semantic: '', lowered: '', typed: '' },
  );

  const symbolGroups = $derived(
    data
      ? [
          { label: 'encodings', items: data.semantic.encodings },
          { label: 'enums', items: data.semantic.enums },
          { label: 'packets', items: data.semantic.packets },
          { label: 'protocols', items: data.semantic.protocols },
        ].filter((group) => group.items.length > 0)
      : [],
  );

  $effect(() => {
    if (!engine) return;
    const current = source;
    const timer = window.setTimeout(() => {
      const id = ++request;
      try {
        const next = engine.stages(current);
        if (id !== request) return;
        data = next;
        error = null;
      } catch (cause) {
        if (id !== request) return;
        data = null;
        error = describeError(cause, current);
      }
    }, 180);
    return () => window.clearTimeout(timer);
  });
</script>

<div class="lab">
  <div class="lab-head">
    <span class="tag">compiler stages</span>
    <span class="count">same schema, four views</span>
  </div>

  {#if error}
    <ErrorNotice {error} />
  {:else if !data}
    <p class="loading">building the compiler phases…</p>
  {:else}
    <div class="pipeline" role="tablist" aria-label="Compiler phase">
      {#each phaseOrder as item, index}
        <button
          type="button"
          id={`stage-tab-${item}`}
          role="tab"
          aria-selected={phase === item}
          aria-controls="stage-panel"
          class:active={phase === item}
          class="stage"
          onclick={() => (phase = item)}
        >
          <span class="index">{index + 1}</span>
          <span class="name">{item}</span>
          <span class="count">{counts[item]}</span>
        </button>
        {#if index < phaseOrder.length - 1}<span class="arrow" aria-hidden="true">→</span>{/if}
      {/each}
    </div>

    <p class="note">{phaseNotes[phase]}</p>

    <div class="details" id="stage-panel" role="tabpanel" aria-labelledby={`stage-tab-${phase}`}>
      {#if phase === 'syntax'}
        <div class="groups">
          <section>
            <h4>imports</h4>
            {#if data.syntax.imports.length === 0}
              <p class="none">none: a self-contained file</p>
            {:else}
              <ul class="chips">
                {#each data.syntax.imports as item}<li>{item}</li>{/each}
              </ul>
            {/if}
          </section>
          <section>
            <h4>declarations</h4>
            <ul class="chips">
              {#each data.syntax.declarations as decl}
                <li class={decl.kind}><span class="kind">{decl.kind}</span>{decl.name}</li>
              {/each}
            </ul>
          </section>
        </div>
      {:else if phase === 'semantic'}
        <div class="groups">
          <section>
            <h4>symbol tables</h4>
            {#each symbolGroups as group}
              <div class="symbol-row">
                <span class="label">{group.label}</span>
                <ul class="chips">
                  {#each group.items as item}<li>{item}</li>{/each}
                </ul>
              </div>
            {/each}
          </section>
          <section>
            <h4>checked routes</h4>
            <RouteTable routes={data.semantic.routes} />
          </section>
        </div>
      {:else if phase === 'lowered'}
        <div class="groups">
          <section>
            <h4>types</h4>
            <ul class="chips">
              {#each data.lowered.types as ty}
                <li class={ty.kind}><span class="kind">{ty.kind}</span>{ty.name}</li>
              {/each}
            </ul>
          </section>
          <section>
            <h4>procedures</h4>
            <div class="proc-counts">
              <span><b>{data.lowered.decode.length}</b> decode</span>
              <span><b>{data.lowered.encode.length}</b> encode</span>
              <span><b>{data.lowered.frames.length}</b> frames</span>
            </div>
            {#each data.lowered.frames as frame}
              <div class="frame">
                <code>{frame.type_id}</code>
                <span>{frame.name}</span>
              </div>
            {/each}
            <details>
              <summary>decode procedure names</summary>
              <ul class="chips">
                {#each data.lowered.decode as proc}
                  <li>{proc.name}{#if proc.params.length}<span class="params">({proc.params.join(', ')})</span>{/if}</li>
                {/each}
              </ul>
            </details>
          </section>
          <section>
            <h4>routes</h4>
            <RouteTable routes={data.lowered.routes} />
          </section>
        </div>
      {:else}
        <div class="groups">
          <section>
            <h4>types</h4>
            <ul class="chips">
              {#each data.typed.types as ty}
                <li class={ty.kind}><span class="kind">{ty.kind}</span>{ty.name}</li>
              {/each}
            </ul>
          </section>
          <section>
            <h4>codecs</h4>
            <div class="codec-wrap">
              <table>
                <thead>
                  <tr><th>codec</th><th>kind</th><th>value</th><th>locals</th><th>stmts</th></tr>
                </thead>
                <tbody>
                  {#each data.typed.codecs as codec}
                    <tr>
                      <td>
                        <code>{codec.name}</code>
                        {#if codec.params.length}<span class="params">({codec.params.join(', ')})</span>{/if}
                      </td>
                      <td>{codec.kind}</td>
                      <td><code>{codec.value}</code></td>
                      <td>{codec.locals}</td>
                      <td>{codec.statements}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </section>
          <section>
            <h4>routes</h4>
            <RouteTable routes={data.typed.routes} />
          </section>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .lab {
    margin: 20px 0 26px;
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

  .count,
  .loading {
    color: var(--dim);
  }

  .loading {
    margin: 0;
    padding: 14px 12px;
    font-size: 13px;
  }

  .pipeline {
    display: flex;
    flex-wrap: wrap;
    align-items: stretch;
    gap: 6px;
    padding: 12px;
  }

  .stage {
    flex: 1 1 135px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding: 8px 10px;
    border: 1px solid rgba(104, 113, 132, 0.4);
    background: #080c18;
    color: var(--muted);
    text-align: left;
    font: inherit;
  }

  .stage:hover {
    border-color: var(--accent);
    color: var(--fg);
  }

  .stage.active {
    border-color: var(--accent);
    background: #151c2b;
    color: var(--fg);
  }

  .index {
    color: var(--dim);
    font: 11px var(--font);
  }

  .stage.active .index {
    color: var(--accent);
  }

  .name {
    font: 16px var(--font);
  }

  .stage .count {
    font-size: 11px;
    color: var(--dim);
  }

  .arrow {
    align-self: center;
    color: var(--dim);
  }

  .note {
    margin: 0 12px 12px;
    color: var(--muted);
    font-size: 14px;
    line-height: 1.5;
  }

  .details {
    padding: 0 12px 12px;
    border-top: 1px solid rgba(104, 113, 132, 0.25);
  }

  .groups {
    display: grid;
    gap: 16px;
  }

  section {
    min-width: 0;
  }

  h4 {
    margin: 12px 0 6px;
    color: var(--dim);
    font: 13px var(--font);
    font-weight: 400;
    text-transform: lowercase;
  }

  .none {
    margin: 0;
    color: var(--dim);
    font-size: 13px;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .chips li {
    padding: 2px 6px;
    background: #151c2b;
    color: var(--fg);
    font: 12px var(--font-body);
    overflow-wrap: anywhere;
  }

  .chips .kind {
    margin-right: 5px;
    color: var(--dim);
    font-size: 10px;
    text-transform: uppercase;
  }

  .chips li.encoding .kind {
    color: var(--accent);
  }

  .chips li.packet .kind {
    color: var(--love);
  }

  .chips li.protocol .kind {
    color: var(--fg);
  }

  .chips li.scalar .kind {
    color: var(--accent);
  }

  .chips li.record .kind {
    color: var(--love);
  }

  .chips li.sum .kind {
    color: var(--accent);
  }

  .symbol-row {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 6px;
    margin-bottom: 6px;
  }

  .label {
    min-width: 72px;
    color: var(--dim);
    font-size: 11px;
  }

  .params {
    color: var(--dim);
  }

  .proc-counts {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    margin-bottom: 8px;
    color: var(--muted);
    font-size: 13px;
  }

  .proc-counts b {
    color: var(--fg);
  }

  .frame {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 8px;
    padding: 4px 0;
    border-bottom: 1px solid rgba(104, 113, 132, 0.18);
    font-size: 13px;
  }

  .frame code {
    color: var(--accent);
    font-family: var(--font-body);
  }

  .frame span {
    color: var(--muted);
  }

  details {
    margin-top: 8px;
  }

  summary {
    color: var(--muted);
    font-size: 13px;
    cursor: var(--cursor-pointer);
  }

  summary:hover {
    color: var(--accent);
  }

  details .chips {
    margin-top: 8px;
  }

  .codec-wrap {
    max-height: 280px;
    overflow: auto;
    border: 1px solid rgba(104, 113, 132, 0.25);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }

  th,
  td {
    padding: 5px 7px;
    border-bottom: 1px solid rgba(104, 113, 132, 0.2);
    text-align: left;
    white-space: nowrap;
  }

  th {
    position: sticky;
    top: 0;
    background: #0d1320;
    color: var(--dim);
    font-weight: 400;
  }

  td code {
    color: var(--accent);
    font-family: var(--font-body);
  }

  @media (max-width: 640px) {
    .arrow {
      display: none;
    }

    .stage {
      flex-basis: calc(50% - 3px);
    }

    .label {
      min-width: 100%;
    }
  }
</style>
