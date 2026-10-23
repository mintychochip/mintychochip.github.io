<script lang="ts">
  import Footer from '../components/Footer.svelte';
  import BlogMast from './BlogMast.svelte';
  import BlogSidebar from './BlogSidebar.svelte';
  import BlogArticleBody from './BlogArticleBody.svelte';
  import type { BlogPost } from './posts';
  import { articleBlocks } from './article-content';
  import { articleHeadings } from './sections';

  let {
    post,
  }: {
    post: BlogPost;
  } = $props();

  let copied = $state(false);

  const headings = $derived(
    articleHeadings(articleBlocks(post.slug)).map((heading) => ({
      label: heading.label,
      id: heading.id,
      href: `#${heading.id}`,
    })),
  );

  async function copyArticleLink() {
    if (!navigator?.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      return;
    }
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 2000);
  }
</script>

<div class="page">
  <BlogMast
    links={[
      { label: 'blog', href: '/blog/' },
      { label: 'home', href: '/' },
      { label: post.externalSource, href: post.externalUrl, external: true },
    ]}
  />

  <div class="page-layout">
    <BlogSidebar title="Contents" items={headings} ariaLabel="Article sections" />

    <div class="page-content">
      <main class="article">
        <header class="post-header">
          <p class="post-meta">
            {#if post.kindLabel}
              <span class="meta-tag px">{post.kindLabel}</span>
              <span class="meta-dot">·</span>
            {/if}
            <time datetime={post.dateIso}>{post.date}</time>
            <span class="meta-dot">·</span>
            <span>{post.readTime}</span>
          </p>

          <h1>{post.title}</h1>
          <p class="subtitle">{post.subtitle}</p>
          <p class="byline">
            {post.author}
            <span class="meta-dot">·</span>
            <a href={post.externalUrl} target="_blank" rel="noopener noreferrer" class="byline-link"
              >{post.externalSource} cross-reference ↗</a
            >
          </p>
        </header>

        <BlogArticleBody {post} />

        <footer class="post-footer">
          <a
            href={post.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="btn px external-btn"
          >
            {post.externalCta}
          </a>
          <button type="button" class="btn px secondary-btn" onclick={copyArticleLink}>
            {copied ? 'Link Copied! ✓' : 'Share Story 🔗'}
          </button>
        </footer>
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
    width: min(var(--width), 100%);
    margin: 0 auto;
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

  .article {
    width: min(760px, 100%);
    margin: 0 auto;
  }

  .post-header {
    margin-bottom: 8px;
  }

  .post-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin: 0 0 14px;
    font-size: 14px;
    color: var(--muted);
  }

  .meta-tag {
    background: rgba(139, 191, 115, 0.15);
    color: var(--accent);
    padding: 3px 8px;
    font-weight: 700;
    font-size: 13px;
    border: 1px solid rgba(139, 191, 115, 0.3);
  }

  .meta-dot {
    color: var(--dim);
  }

  h1 {
    margin: 0;
    font-size: clamp(30px, 5.5vw, 44px);
    line-height: 1.15;
    letter-spacing: -0.01em;
  }

  .subtitle {
    margin: 14px 0 0;
    max-width: 660px;
    color: var(--muted);
    font-size: clamp(16px, 3vw, 18px);
    line-height: 1.5;
  }

  .byline {
    margin: 14px 0 0;
    padding-bottom: 18px;
    border-bottom: 1px solid rgba(104, 113, 132, 0.25);
    font-size: 14px;
    color: var(--muted);
  }

  .byline-link {
    color: var(--accent);
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .post-footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 14px;
    margin-top: 32px;
    padding-top: 20px;
    border-top: 1px solid rgba(104, 113, 132, 0.25);
  }

  .external-btn {
    background: var(--accent);
    color: #080c18;
    font-size: 15px;
    padding: 7px 14px;
  }

  .external-btn:hover {
    background: #a3d489;
  }

  .secondary-btn {
    background: transparent;
    color: var(--fg);
    border: 1px solid var(--dim);
    font-size: 15px;
    padding: 7px 14px;
  }

  .secondary-btn:hover {
    background: var(--field-focus);
    border-color: var(--accent);
  }

  @media (max-width: 640px) {
    .page {
      width: min(var(--width), calc(100% - 24px));
    }
    .post-meta {
      font-size: 13px;
    }
    .post-footer {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
