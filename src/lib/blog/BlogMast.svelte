<script lang="ts">
  let {
    links = [],
  }: {
    links?: { label: string; href: string; external?: boolean }[];
  } = $props();
</script>

<nav class="mast" aria-label="Blog navigation">
  <a class="brand" href="/">mintychochip</a>
  <div class="links">
    {#each links as link (link.href)}
      <a
        href={link.href}
        target={link.external ? '_blank' : undefined}
        rel={link.external ? 'noopener noreferrer' : undefined}>{link.label}</a
      >
    {/each}
  </div>
</nav>

<style>
  .mast {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px 28px;
    padding-bottom: 12px;
    margin-bottom: 34px;
    border-bottom: 1px solid rgba(104, 113, 132, 0.28);
  }

  .brand {
    color: var(--fg);
    font: 700 22px/1 var(--font);
    text-decoration: none;
  }

  .brand:hover {
    color: var(--accent);
  }

  .links {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    font-size: 15px;
  }

  .links a {
    color: var(--muted);
    text-decoration: none;
  }

  .links a:hover {
    color: var(--accent);
  }
</style>
