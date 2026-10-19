<script lang="ts">
  import type { TargetCompat } from './wasm';

  let { targets, loading = false }: { targets: TargetCompat[]; loading?: boolean } = $props();
</script>

<div class="matrix">
  {#if targets.length === 0}
    <p class="loading">
      {loading ? 'loading the compatibility matrix…' : 'The matrix needs the compiler engine.'}
    </p>
  {:else}
    <div class="wrap">
      <table>
        <thead>
          <tr>
            <th>target</th>
            <th>default</th>
            <th>standards accepted</th>
          </tr>
        </thead>
        <tbody>
          {#each targets as entry}
            <tr>
              <td class="name">
                <code>{entry.target}</code>
                <span>{entry.language}</span>
              </td>
              <td class="default"><code>{entry.default}</code></td>
              <td>
                <div class="versions">
                  {#each entry.versions as version}
                    <span class:current={version === entry.default}>{version}</span>
                  {/each}
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class="note">
      Read from the compiler’s own target table (<code>compat::TARGETS</code>). Output layouts,
      idiomatic types, and per-language gates are in the
      <a
        href="https://github.com/mintychochip/bytemill#code-generation"
        target="_blank"
        rel="noopener noreferrer">README matrix</a
      >.
    </p>
  {/if}
</div>

<style>
  .matrix {
    margin: 16px 0 24px;
    border: 1px solid rgba(104, 113, 132, 0.42);
    background: var(--field);
  }

  .loading {
    margin: 0;
    padding: 14px 12px;
    color: var(--dim);
    font-size: 13px;
  }

  .wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  th,
  td {
    padding: 8px 12px;
    border-bottom: 1px solid rgba(104, 113, 132, 0.22);
    text-align: left;
    vertical-align: top;
  }

  th {
    background: #0d1320;
    color: var(--dim);
    font: 12px var(--font);
    font-weight: 400;
  }

  tr:last-child td {
    border-bottom: 0;
  }

  td.name {
    white-space: nowrap;
  }

  td.name code {
    color: var(--accent);
    font-family: var(--font-body);
  }

  td.name span {
    display: block;
    margin-top: 2px;
    color: var(--dim);
    font-size: 11px;
  }

  td.default code {
    color: var(--love);
    font-family: var(--font-body);
  }

  .versions {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .versions span {
    padding: 2px 6px;
    background: #151c2b;
    color: var(--muted);
    font: 11px var(--font-body);
    white-space: nowrap;
  }

  .versions span.current {
    background: #1d2639;
    color: var(--fg);
    outline: 1px solid rgba(139, 191, 115, 0.5);
  }

  .note {
    margin: 0;
    padding: 9px 12px;
    border-top: 1px solid rgba(104, 113, 132, 0.25);
    color: var(--dim);
    font-size: 12px;
    line-height: 1.5;
  }

  .note code {
    color: var(--muted);
    font-family: var(--font-body);
  }

  .note a {
    color: var(--muted);
    text-underline-offset: 3px;
  }

  .note a:hover {
    color: var(--accent);
  }

  @media (max-width: 640px) {
    th,
    td {
      padding: 7px 9px;
    }
  }
</style>
