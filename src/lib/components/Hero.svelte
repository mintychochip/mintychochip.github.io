<script lang="ts">
  import PondCanvas, { clearBoxOf } from '../pond/PondCanvas.svelte';
  import { clamp } from '../pond/field';
  import { site } from '../site';
  import SocialIcon from './SocialIcon.svelte';

  let title: HTMLHeadingElement | undefined = $state();

  const pond = (W: number) => ({
    k: clamp(W / 123, 1.3, 2.6),
    frogs: 2,
    flies: Math.round(clamp(W / 32, 4, 10)),
    horizon: 0.5,
    clear: [clearBoxOf(title, title?.parentElement?.querySelector('.scene'))].filter((box) => box !== undefined),
  });
</script>

<header class="hero">
  <div class="art">
    <div class="scene">
      <PondCanvas seed="mintychochip-dusk" palette="night" options={pond} interactive />
    </div>
    <h1 bind:this={title}>
      <span class="who">{site.givenName}</span>
      <span class="handle">({site.name})</span>
    </h1>
  </div>
  <div class="intro">
    <p>{site.intro}</p>
    <p class="links">
      <a class="icon-link" href={site.github} aria-label="GitHub">
        <SocialIcon name="github" />
      </a>
      <a class="icon-link" href={site.linkedin} aria-label="LinkedIn">
        <SocialIcon name="linkedin" />
      </a>
      <a class="icon-link" href="mailto:{site.email}" aria-label="Gmail">
        <SocialIcon name="gmail" />
      </a>
    </p>
  </div>
</header>

<style>
  .art {
    position: relative;
    height: 330px;
  }
  .scene {
    height: 100%;
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
    align-items: center;
    gap: 24px;
  }
  .icon-link {
    display: inline-flex;
    align-items: center;
    text-decoration: none;
    padding: 2px;
  }
  .icon-link:hover {
    opacity: 0.8;
  }
  @media (max-width: 640px) {
    .art {
      height: auto;
    }
    .scene {
      height: 220px;
    }
    h1 {
      position: static;
      max-width: 100%;
      margin-top: 12px;
      text-shadow: none;
      font-size: clamp(28px, 8vw, 40px);
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
    .scene {
      height: 190px;
    }
    h1 {
      font-size: clamp(26px, 8vw, 34px);
    }
    .links {
      gap: 14px;
    }
  }
</style>
