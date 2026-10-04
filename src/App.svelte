<script lang="ts">
  import Hero from './lib/components/Hero.svelte';
  import Resume from './lib/components/Resume.svelte';
  import Footer from './lib/components/Footer.svelte';
  import Contact from './lib/contact/Contact.svelte';
  import Projects from './lib/projects/Projects.svelte';
  import UsageSection from './lib/usage/UsageSection.svelte';
</script>

<div class="page">
  <svelte:boundary>
    <Hero />
    {#snippet failed()}
      <header><h1>mintychochip</h1></header>
    {/snippet}
  </svelte:boundary>
  <main>
    <svelte:boundary>
      <UsageSection />
      {#snippet failed()}
        <p class="broken">The usage chart didn’t load.</p>
      {/snippet}
    </svelte:boundary>
    <svelte:boundary>
      <Projects />
      {#snippet failed()}
        <p class="broken">Projects didn’t load. They’re all on <a href="https://github.com/mintychochip">GitHub</a>.</p>
      {/snippet}
    </svelte:boundary>
    <div class="pair">
      <Resume />
      <Contact />
    </div>
  </main>
  <Footer />
</div>

<style>
  .page {
    width: min(var(--width), calc(100% - 32px));
    margin: 0 auto;
    padding: 24px 0 40px;
  }
  main {
    display: grid;
    gap: 76px;
    margin-top: 76px;
  }
  .pair {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
    gap: 48px;
  }
  .broken {
    color: var(--muted);
  }
  @media (max-width: 720px) {
    .pair {
      grid-template-columns: minmax(0, 1fr);
      gap: 76px;
    }
  }
</style>
