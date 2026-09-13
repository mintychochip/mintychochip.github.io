<script lang="ts">
  let { content }: { content: string } = $props();
</script>

<footer class="footer">
  {content}
</footer>

<style>
  .footer {
    color: var(--text-muted);
    font-size: var(--text-xs);
    padding: 40px 0 0;
  }
</style>
