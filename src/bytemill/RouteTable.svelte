<script lang="ts">
  import type { StageRoute } from './wasm';

  let { routes }: { routes: StageRoute[] } = $props();
</script>

{#if routes.length > 0}
  <div class="wrap">
    <table>
      <thead>
        <tr><th>state</th><th>direction</th><th>id</th><th>packet</th><th>frame</th></tr>
      </thead>
      <tbody>
        {#each routes as route}
          <tr>
            <td>{route.state}</td>
            <td>{route.direction}</td>
            <td><code>0x{route.id.toString(16).padStart(2, '0')}</code></td>
            <td><code>{route.packet}</code></td>
            <td>{route.frame ?? 'default'}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{:else}
  <p class="empty">No routes.</p>
{/if}

<style>
  .wrap {
    margin-top: 10px;
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
    white-space: nowrap;
  }

  th {
    color: var(--dim);
    font-weight: 400;
  }

  td {
    color: var(--fg);
  }

  td code {
    color: var(--accent);
    font-family: var(--font-body);
  }

  .empty {
    margin: 8px 0 0;
    color: var(--dim);
    font-size: 13px;
  }
</style>
