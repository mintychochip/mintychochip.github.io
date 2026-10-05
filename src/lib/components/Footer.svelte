<script lang="ts">
  import PondCanvas from '../pond/PondCanvas.svelte';
  import { site } from '../site';
  import SocialIcon from './SocialIcon.svelte';

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
      <a class="icon-link" href={site.github} aria-label="GitHub">
        <SocialIcon name="github" size={18} />
      </a>
      <a class="icon-link" href={site.linkedin} aria-label="LinkedIn">
        <SocialIcon name="linkedin" size={18} />
      </a>
      <a class="icon-link" href="mailto:{site.email}" aria-label="Gmail">
        <SocialIcon name="gmail" size={18} />
      </a>
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
    align-items: center;
    gap: 18px;
  }
  a {
    text-decoration: none;
    padding: 2px 0;
  }
  .icon-link {
    display: inline-flex;
    align-items: center;
    padding: 2px;
  }
  .icon-link:hover {
    opacity: 0.8;
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
