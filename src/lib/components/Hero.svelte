<script lang="ts">
  import { site } from '../site';
</script>

<section class="hero" id="profile">
  <p class="hero-role">{site.role}</p>
  <h1 class="hero-name">{site.name}</h1>
  <p class="hero-tagline">{site.tagline}</p>
</section>

<style>
  .hero {
    padding: 24px 0 40px;
  }
  .hero-role {
    color: var(--text-muted);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin: 0 0 12px;
    font-weight: 600;
  }
  .hero-name {
    font-size: var(--text-display);
    letter-spacing: -0.04em;
    margin: 0 0 20px;
    font-weight: 500;
    line-height: 1.05;
    color: var(--text);
  }
  .hero-tagline {
    color: var(--text-secondary);
    font-size: var(--text-lg);
    max-width: 520px;
    margin: 0;
    line-height: 1.55;
  }
</style>
