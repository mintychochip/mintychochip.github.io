<script lang="ts">
  import type { ErrorView } from './errors';

  let { error }: { error: ErrorView } = $props();
</script>

<div class="error" role="alert">
  <span class="kind">{error.kind}</span>
  <p>{error.message}</p>
  {#if error.location}
    <pre class="frame"><span class="line">{error.location.line}</span> {error.location.text}
<span class="line">{' '.repeat(String(error.location.line).length)}</span> {' '.repeat(Math.max(0, error.location.column - 1))}^</pre>
  {:else if error.wireOffset !== null}
    <p class="hint">Wire byte {error.wireOffset} of the payload.</p>
  {/if}
</div>

<style>
  .error {
    margin: 12px 0;
    padding: 10px 12px;
    border: 1px solid color-mix(in srgb, var(--error) 55%, transparent);
    background: color-mix(in srgb, var(--error) 10%, transparent);
    font-size: 14px;
    line-height: 1.45;
  }

  .kind {
    display: inline-block;
    margin-bottom: 4px;
    color: var(--error);
    font-family: var(--font);
    font-size: 15px;
    font-weight: 700;
  }

  p {
    margin: 0;
    overflow-wrap: anywhere;
  }

  .frame {
    margin: 8px 0 0;
    padding: 8px;
    overflow-x: auto;
    background: #080c18;
    border: 1px solid rgba(104, 113, 132, 0.35);
    color: var(--fg);
    font: 13px/1.5 var(--font-body);
    white-space: pre;
  }

  .line {
    color: var(--dim);
    user-select: none;
  }

  .hint {
    margin-top: 6px;
    color: var(--muted);
  }
</style>
