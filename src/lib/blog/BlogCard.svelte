<script lang="ts">
  import type { BlogCard } from './cards';

  let {
    card,
    showVisual = true,
  }: {
    card: BlogCard;
    showVisual?: boolean;
  } = $props();

  const isWire = $derived(card.visual.kind === 'wire');
</script>

<article class="featured-card px" class:interactive={isWire}>
  <div class="card-content" class:no-visual={!showVisual}>
    <div class="card-text">
      <p class="card-meta">
        {#if card.kindLabel}
          <span>{card.kindLabel}</span>
          <span class="meta-sep">·</span>
        {/if}
        <span>{card.date}</span>
        <span class="meta-sep">·</span>
        <span>{card.readTime}</span>
      </p>
      <h3>
        <a class="title-link" href={card.href}>{card.title}</a>
      </h3>
      <p class="card-excerpt">{card.excerpt}</p>
      <div class="actions">
        <a class="btn px primary-btn" href={card.href}>{card.action}</a>
        {#if card.external}
          <a
            class="external-link"
            href={card.external.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {card.external.label}
          </a>
        {/if}
      </div>
    </div>

    {#if showVisual}
      <a
        class="card-visual px"
        class:wire={isWire}
        href={card.href}
        aria-label="Open article: {card.title}"
      >
        {#if card.visual.kind === 'image'}
          <img
            src={card.visual.src}
            alt={card.visual.alt}
            class="thumb-img"
            loading="lazy"
          />
        {:else}
          <div class="wire-art" aria-hidden="true">
            {#each card.visual.lines as line}
              <span
                class="wire-line"
                class:dim={line.tone === 'dim'}
                class:accent={line.tone === 'accent'}>{line.text}</span
              >
            {/each}
          </div>
        {/if}
      </a>
    {/if}
  </div>
</article>

<style>
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

  .interactive {
    border-color: rgba(139, 191, 115, 0.35);
  }

  .card-content {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
    gap: 24px;
    align-items: center;
  }

  .card-content.no-visual {
    grid-template-columns: minmax(0, 1fr);
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

  .title-link {
    color: var(--fg);
    text-decoration: none;
    text-decoration-color: transparent;
    transition: color 0.15s ease, text-decoration-color 0.15s ease;
  }

  .title-link:hover {
    color: var(--accent);
    text-decoration: underline;
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

  .primary-btn {
    background: var(--fg);
    color: var(--bg);
    font-size: 15px;
    padding: 7px 14px;
  }

  .primary-btn:hover {
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
    display: block;
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

  .card-visual.wire {
    display: flex;
    align-items: center;
    min-height: 168px;
    padding: 16px 18px;
    text-decoration: none;
  }

  .thumb-img {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 2000 / 733;
    object-fit: cover;
    object-position: center;
  }

  .wire-art {
    display: flex;
    flex-direction: column;
    gap: 7px;
    min-width: 0;
    color: var(--fg);
    font: 13px/1.4 var(--font-body);
  }

  .wire-line {
    overflow-wrap: anywhere;
  }

  .wire-line.dim {
    color: var(--dim);
  }

  .wire-line.accent {
    color: var(--accent);
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
