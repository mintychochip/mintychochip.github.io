<script lang="ts">
  import { POSTS, type BlogPost } from './posts';
  import BlogPostModal from './BlogPostModal.svelte';

  let selectedPost = $state<BlogPost | null>(null);

  function openPost(post: BlogPost) {
    selectedPost = post;
  }

  function closePost() {
    selectedPost = null;
  }
</script>

<section id="blog" aria-labelledby="blog-title">
  <div class="head">
    <h2 id="blog-title">Blog</h2>
    <a
      href="https://blog.umans.ai/blog/the-token-gap/"
      target="_blank"
      rel="noopener noreferrer"
      class="external-head-link"
    >
      <img src="/images/umans-logo.svg" alt="" class="head-umans-logo" width="18" height="18" />
      <span>Umans AI — The Token Gap ↗</span>
    </a>
  </div>

  <div class="posts-list">
    {#each POSTS as post (post.id)}
      <article class="featured-card px">
        <div class="card-content">
          <div class="card-text">
            <p class="card-meta">
              <span>{post.date}</span>
              <span class="meta-sep">·</span>
              <span>{post.readTime}</span>
            </p>
            <h3>
              <button type="button" class="title-btn" onclick={() => openPost(post)}>
                {post.title}
              </button>
            </h3>
            <p class="card-excerpt">{post.excerpt}</p>
            <div class="actions">
              <button type="button" class="btn px read-btn" onclick={() => openPost(post)}>
                Read my side
              </button>
              <a
                href={post.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="external-link"
              >
                Their article ↗
              </a>
            </div>
          </div>

          <button
            type="button"
            class="card-visual px"
            onclick={() => openPost(post)}
            aria-label="Open article: {post.title}"
          >
            <img
              src={post.devdayImage}
              alt="OpenAI DevDay — developers who processed 10B+ lifetime API tokens"
              class="thumb-img"
              loading="lazy"
            />
          </button>
        </div>
      </article>
    {/each}
  </div>
</section>

{#if selectedPost}
  <BlogPostModal post={selectedPost} open={Boolean(selectedPost)} onClose={closePost} />
{/if}

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

  .external-head-link {
    color: var(--muted);
    text-decoration: none;
    font-size: 15px;
    padding: 4px 0;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .head-umans-logo {
    display: block;
    width: 18px;
    height: 18px;
    border-radius: 3px;
    object-fit: contain;
  }

  .external-head-link:hover {
    color: var(--accent);
  }

  .posts-list {
    margin-top: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .featured-card {
    background: var(--field);
    border: 1px solid rgba(104, 113, 132, 0.35);
    padding: 20px 24px;
    transition: border-color 0.15s ease, background 0.15s ease;
  }

  .featured-card:hover {
    border-color: rgba(139, 191, 115, 0.45);
    background: #172032;
  }

  .card-content {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
    gap: 24px;
    align-items: center;
  }

  .card-text {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .card-meta {
    margin: 0;
    font-size: 14px;
    color: var(--dim);
  }

  .meta-sep {
    margin: 0 6px;
  }

  h3 {
    margin: 0;
    font-size: clamp(19px, 4vw, 24px);
    line-height: 1.25;
  }

  .title-btn {
    padding: 0;
    border: 0;
    background: none;
    color: var(--fg);
    font: inherit;
    font-weight: 700;
    text-align: left;
    cursor: var(--cursor-pointer);
    text-decoration: underline;
    text-decoration-color: transparent;
    transition: color 0.15s ease, text-decoration-color 0.15s ease;
  }

  .title-btn:hover {
    color: var(--accent);
    text-decoration-color: var(--accent);
  }

  .card-excerpt {
    margin: 0;
    font-size: 15px;
    line-height: 1.5;
    color: var(--muted);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 14px;
    margin-top: 4px;
  }

  .read-btn {
    background: var(--fg);
    color: var(--bg);
    font-size: 15px;
    padding: 7px 14px;
  }

  .read-btn:hover {
    background: var(--accent);
    color: #080c18;
  }

  .external-link {
    font-size: 14px;
    color: var(--muted);
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  .external-link:hover {
    color: var(--accent);
  }

  .card-visual {
    margin: 0;
    padding: 0;
    border: 1px solid rgba(104, 113, 132, 0.35);
    background: #080c18;
    overflow: hidden;
    cursor: var(--cursor-pointer);
    transition: border-color 0.15s ease, transform 0.15s ease;
    font: inherit;
    color: inherit;
    text-align: left;
    width: 100%;
  }

  .card-visual:hover {
    border-color: var(--accent);
    transform: translateY(-2px);
  }

  .thumb-img {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 2000 / 733;
    object-fit: cover;
    object-position: center;
  }

  @media (max-width: 768px) {
    .card-content {
      grid-template-columns: minmax(0, 1fr);
      gap: 16px;
    }
    .card-visual {
      order: -1;
    }
    .featured-card {
      padding: 16px 18px;
    }
  }
</style>
