<script lang="ts">
  import { BLOG_CARDS } from './cards';
  import BlogCard from './BlogCard.svelte';
</script>

<section id="blog" aria-labelledby="blog-title">
  <div class="head">
    <h2 id="blog-title">Blog</h2>
    <a href="/blog/" class="all-link">All posts →</a>
  </div>

  <div class="posts-list">
    {#each BLOG_CARDS as card (card.id)}
      <BlogCard {card} />
    {/each}
  </div>
</section>

<style>
  section {
    margin: 0;
  }

  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px 24px;
  }

  h2 {
    margin: 0;
    font-size: clamp(24px, 5vw, 30px);
    line-height: 1.2;
  }

  .all-link {
    color: var(--muted);
    font-size: 15px;
    text-decoration: none;
    padding: 4px 0;
  }

  .all-link:hover {
    color: var(--accent);
  }

  .posts-list {
    margin-top: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
</style>
