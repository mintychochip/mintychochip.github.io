<script lang="ts">
  import Footer from '../components/Footer.svelte';
  import BlogMast from './BlogMast.svelte';
  import BlogCard from './BlogCard.svelte';
  import BlogSidebar from './BlogSidebar.svelte';
  import { BLOG_CARDS } from './cards';
</script>

<div class="page">
  <BlogMast links={[{ label: 'home', href: '/' }, { label: 'wordle', href: '/#wordle' }]} />

  <div class="page-layout">
    <BlogSidebar
      title="Posts"
      ariaLabel="Blog posts"
      items={BLOG_CARDS.map((card) => ({ label: card.navLabel, href: card.href }))}
    />

    <div class="page-content">
      <main class="blog">
        <header class="hero">
          <h1>Blog</h1>
          <p class="subtitle">Long-form notes on agentic coding, compilers, and binary formats.</p>
        </header>

        <div class="posts-list">
          {#each BLOG_CARDS as card (card.id)}
            <BlogCard {card} />
          {/each}
        </div>
      </main>
    </div>
  </div>

  <Footer />
</div>

<style>
  .page {
    /* Wide enough for the 168px sidebar plus the text column. */
    width: min(calc(var(--width) + 140px), calc(100% - 32px));
    margin: 0 auto;
    padding: 16px 0 40px;
  }

  .page-layout {
    display: flex;
    align-items: stretch;
    gap: 28px;
  }

  .page-content {
    flex: 1;
    min-width: 0;
  }

  @media (max-width: 960px) {
    .page-layout {
      flex-direction: column;
      gap: 0;
    }
  }

  .blog {
    width: min(860px, 100%);
    margin: 0 auto;
  }

  .hero {
    margin-bottom: 8px;
  }

  h1 {
    margin: 0;
    font-size: clamp(40px, 7vw, 56px);
    line-height: 1;
    letter-spacing: -0.02em;
  }

  .subtitle {
    max-width: 640px;
    margin: 14px 0 0;
    color: var(--muted);
    font-size: clamp(16px, 3vw, 18px);
    line-height: 1.5;
  }

  .posts-list {
    margin-top: 26px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  @media (max-width: 640px) {
    .page {
      width: min(var(--width), calc(100% - 24px));
    }
  }
</style>
