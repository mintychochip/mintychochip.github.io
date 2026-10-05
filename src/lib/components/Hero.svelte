<script lang="ts">
  import PondCanvas from '../pond/PondCanvas.svelte';
  import { clamp } from '../pond/field';
  import { site } from '../site';

  let title: HTMLHeadingElement | undefined = $state();

  /** The title's box as fractions of the pond, so no frog sits behind the name. */
  function titleBox(): [number, number, number, number] | undefined {
    const art = title?.parentElement;
    if (!title || !art) return undefined;
    const a = art.getBoundingClientRect(), t = title.getBoundingClientRect();
    return [(t.left - a.left) / a.width, (t.top - a.top) / a.height, (t.right - a.left) / a.width, (t.bottom - a.top) / a.height];
  }

  const pond = (W: number) => ({
    k: clamp(W / 123, 1.3, 2.6),
    frogs: 2,
    flies: Math.round(clamp(W / 32, 4, 10)),
    horizon: 0.5,
    clear: titleBox(),
  });
</script>

<header class="hero">
  <div class="art">
    <PondCanvas seed="mintychochip-dusk" palette="night" options={pond} interactive />
    <h1 bind:this={title}>
      <span class="who">{site.givenName}</span>
      <span class="handle">({site.name})</span>
    </h1>
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
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    column-gap: 0.32em;
    row-gap: 2px;
    max-width: calc(100% - 48px);
    margin: 0;
    font-size: clamp(34px, 5.5vw, 50px);
    line-height: 1;
    text-shadow: 3px 3px 0 var(--bg);
    pointer-events: none;
  }
  .who,
  .handle {
    white-space: nowrap;
  }
  .handle {
    font-size: 0.56em;
  }
  .links a {
    text-decoration: none;
  }
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
    padding: 2px 0;
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 5px;
  }
  @media (max-width: 640px) {
    .art {
      height: 240px;
    }
    h1 {
      left: 14px;
      bottom: 14px;
      max-width: calc(100% - 24px);
      font-size: clamp(26px, 8vw, 38px);
    }
    .intro {
      margin-top: 16px;
      gap: 8px 16px;
    }
    .links {
      gap: 18px;
    }
  }
  @media (max-width: 380px) {
    .art {
      height: 210px;
    }
    h1 {
      left: 10px;
      bottom: 10px;
      max-width: calc(100% - 16px);
      font-size: clamp(22px, 7.5vw, 30px);
    }
    .links {
      gap: 14px;
    }
  }
</style>
