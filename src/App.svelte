<script lang="ts">
  import Nav from './lib/components/Nav.svelte';
  import Hero from './lib/components/Hero.svelte';
  import About from './lib/components/About.svelte';
  import Footer from './lib/components/Footer.svelte';
  import { site } from './lib/site';
</script>

<div class="page">
  <Nav items={site.nav} />
  <main class="main">
    <Hero />
    <About />
    <Footer content={site.footer} />
  </main>
</div>
