<script lang="ts">
  import { site } from '../site';
</script>

<section class="section" id="about">
  <h2 class="section-title">About</h2>
  <p class="about-paragraph">{site.bio}</p>
</section>

<style>
  .section {
    padding: 36px 0;
  }
  .section-title {
    font-size: var(--text-xs);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: .06em;
    margin: 0;
    font-weight: 600;
  }
  .about-paragraph {
    color: var(--text-secondary);
    font-size: var(--text-lg);
    max-width: 620px;
    margin: 0 0 20px;
    line-height: 1.7;
  }
</style>
