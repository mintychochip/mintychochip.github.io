<script lang="ts">
  import type { BlogPost } from './posts';
  import BlogArticleBody from './BlogArticleBody.svelte';

  let {
    post,
    open = false,
    onClose,
  }: {
    post: BlogPost;
    open: boolean;
    onClose: () => void;
  } = $props();

  let copied = $state(false);

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      onClose();
    }
  }

  function copyArticleLink() {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(window.location.origin + '/#blog');
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="modal-backdrop" onclick={onClose}>
    <div
      class="modal-card px"
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-modal-title"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
    >
      <header class="post-header">
        <div class="post-meta">
          <span class="meta-tag px">Cross-Reference</span>
          <span class="meta-dot">·</span>
          <time datetime="2026-08-25">{post.date}</time>
          <span class="meta-dot">·</span>
          <span>{post.readTime}</span>
        </div>
        <button
          type="button"
          class="close-btn px"
          aria-label="Close article"
          onclick={onClose}
        >
          ✕
        </button>
      </header>

      <h1 id="post-modal-title">{post.title}</h1>
      <p class="byline">
        {post.author}
        <span class="meta-dot">·</span>
        <a href={post.externalUrl} target="_blank" rel="noopener noreferrer" class="byline-link"
          >Umans AI cross-reference ↗</a
        >
      </p>

      <BlogArticleBody post={post} onNavigate={onClose} />

      <!-- Footer Actions -->
      <footer class="modal-footer">
        <a
          href={post.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="btn px external-btn"
        >
          Read Umans AI’s article ↗
        </a>
        <button
          type="button"
          class="btn px secondary-btn"
          onclick={copyArticleLink}
        >
          {copied ? 'Link Copied! ✓' : 'Share Story 🔗'}
        </button>
      </footer>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(11, 15, 25, 0.88);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px 16px;
    z-index: 150;
    backdrop-filter: blur(6px);
    animation: fade-in 0.15s ease-out;
    overflow-y: auto;
  }

  .modal-card {
    background: var(--field);
    border: 2px solid var(--dim);
    color: var(--fg);
    width: 100%;
    max-width: 760px;
    max-height: 90vh;
    overflow-y: auto;
    padding: 32px 36px;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.7);
    margin: auto;
    -webkit-overflow-scrolling: touch;
  }

  .post-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }

  .post-meta {
    display: flex;
    align-items: center;
    gap: 8px;
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

  .close-btn {
    background: transparent;
    border: 1px solid var(--dim);
    color: var(--muted);
    font-size: 16px;
    cursor: var(--cursor-pointer);
    padding: 4px 10px;
    line-height: 1;
    transition: all 0.15s ease;
  }

  .close-btn:hover {
    color: var(--fg);
    border-color: var(--accent);
    background: var(--field-focus);
  }

  h1 {
    margin: 0;
    font-size: clamp(26px, 5vw, 36px);
    line-height: 1.2;
    color: var(--fg);
  }

  .byline {
    margin: 8px 0 0;
    font-size: 14px;
    color: var(--muted);
  }

  .byline-link {
    color: var(--accent);
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .modal-footer {
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
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .external-btn:hover {
    background: #a3d489;
  }

  .secondary-btn {
    background: transparent;
    color: var(--fg);
    border: 1px solid var(--dim);
  }

  .secondary-btn:hover {
    background: var(--field-focus);
    border-color: var(--accent);
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @media (max-width: 640px) {
    .modal-card {
      padding: 22px 18px;
    }
  }

  @media (max-width: 420px) {
    .post-meta {
      font-size: 13px;
    }
    .modal-footer {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
