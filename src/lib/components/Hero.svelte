<script lang="ts">
  import PondCanvas from '../pond/PondCanvas.svelte';
  import { clamp } from '../pond/field';
  import { site } from '../site';

  const pond = (W: number) => ({
    k: clamp(W / 123, 1.3, 2.6),
    frogs: W < 200 ? 2 : 3,
    flies: Math.round(clamp(W / 32, 4, 10)),
    horizon: 0.5,
  });
</script>

<header class="hero">
  <div class="art">
    <PondCanvas seed="mintychochip-dusk" palette="night" options={pond} interactive />
    <h1>{site.name}</h1>
    <nav aria-label="Sections">
      {#each site.nav as item (item.href)}
        <a href={item.href}>{item.label}</a>
      {/each}
    </nav>
  </div>
  <div class="intro">
    <p>{site.intro}</p>
    <p class="links">
      <a href={site.github}>GitHub</a>
      <a href="mailto:{site.email}">Email</a>
    </p>
  </div>
</header>

<style>
  .art {
    position: relative;
    height: 330px;
  }
  h1 {
    position: absolute;
    left: 27px;
    bottom: 21px;
    margin: 0;
    font-size: 50px;
    line-height: 1;
    text-shadow: 3px 3px 0 var(--bg);
    pointer-events: none;
  }
  nav {
    position: absolute;
    top: 18px;
    right: 24px;
    display: flex;
    gap: 24px;
    text-shadow: 2px 2px 0 var(--bg);
  }
  nav a,
  .links a {
    text-decoration: none;
  }
  nav a:hover,
  .links a:hover {
    color: var(--accent);
  }
  .intro {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px 32px;
    margin-top: 22px;
  }
  .intro p {
    margin: 0;
  }
  .links {
    display: flex;
    gap: 24px;
  }
  .links a {
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 5px;
  }
  @media (max-width: 640px) {
    .art {
      height: 240px;
    }
    h1 {
      left: 15px;
      bottom: 15px;
      font-size: 38px;
    }
    nav {
      top: 12px;
      right: 15px;
      gap: 14px;
      font-size: 17px;
    }
  }
</style>
