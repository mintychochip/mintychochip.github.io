<script lang="ts">
  import PondCanvas from '../pond/PondCanvas.svelte';
  import { site } from '../site';

  const year = new Date().getFullYear();
</script>

<footer>
  <div class="art">
    <PondCanvas
      seed="footer"
      palette="night"
      options={(W) => ({ k: 1.1, frogs: 2, flies: 4, pads: Math.max(3, Math.round(W / 44)), horizon: 0.3, reeds: false, moon: false })}
    />
  </div>
  <div class="row">
    <span>{site.name}, {year}</span>
    <span class="links">
      <a href={site.github}>GitHub</a>
      <a href="mailto:{site.email}">Email</a>
    </span>
  </div>
</footer>

<style>
  footer {
    margin-top: 88px;
  }
  .art {
    height: 90px;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px 16px;
    margin-top: 14px;
    font-size: 16px;
    color: var(--dim);
  }
  .links {
    display: flex;
    gap: 18px;
  }
  a {
    text-decoration: none;
    padding: 2px 0;
  }
  a:hover {
    color: var(--accent);
  }
  @media (max-width: 640px) {
    footer {
      margin-top: 48px;
    }
    .art {
      height: 64px;
    }
    .row {
      font-size: 15px;
    }
  }
</style>
