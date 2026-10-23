<script lang="ts">
  import type { BlogPost } from './posts';
  import { articleBlocks } from './article-content';
  import { articleHeadings } from './sections';
  import UsagePanel from '../usage/UsagePanel.svelte';

  let { post }: { post: BlogPost } = $props();

  const blocks = $derived(articleBlocks(post.slug));
  const headingIds = $derived(
    new Map(articleHeadings(blocks).map((heading) => [heading.index, heading.id])),
  );
</script>

<div class="prose">
  {#each blocks as block, i (i)}
    {#if block.type === 'h2'}
      <h2 id={headingIds.get(i)}>{block.text}</h2>
    {:else if block.type === 'p'}
      <p>{@html block.html}</p>
    {:else if block.type === 'quote'}
      <blockquote class="inline-quote">
        “{block.text}”
      </blockquote>
    {:else if block.type === 'ul'}
      <ul>
        {#each block.items as item}
          <li><strong>{item.lead}</strong> {item.rest}</li>
        {/each}
      </ul>
    {:else if block.type === 'usage'}
      <div class="usage-embed">
        <UsagePanel />
      </div>
    {:else if block.type === 'figure'}
      {#if block.which === 'discord'}
        <figure class="media-figure px">
          <img
            src={post.discordQuote.image}
            alt="Discord message from mintychochip celebrating 10B tokens in a single day"
            class="media-img"
            loading="lazy"
          />
          <figcaption>
            {post.discordQuote.date}: {post.discordQuote.text.join(' ')}
          </figcaption>
        </figure>
      {:else if block.which === 'devday'}
        <figure class="media-figure px">
          <img
            src={post.devdayImage}
            alt="OpenAI DevDay wall of developers who processed 10B+ lifetime API tokens"
            class="media-img"
            loading="lazy"
          />
          <figcaption>
            OpenAI DevDay: ten billion lifetime tokens earned a spot on the wall; eight months later one
            Umans AI user crossed ~11B in a single day.
          </figcaption>
        </figure>
      {:else}
        <figure class="media-figure px">
          <img
            src={post.telemetryImage}
            alt="Umans AI usage dashboard showing 10,950.8M daily tokens with 99% cache rate"
            class="media-img"
            loading="lazy"
          />
          <figcaption>
            Umans AI production telemetry: 10,950.8M input tokens in 24h, 99% KV cache.
          </figcaption>
        </figure>
      {/if}
    {/if}
  {/each}
</div>

<style>
  .prose {
    font-size: 17px;
    line-height: 1.6;
    color: var(--fg);
  }

  .prose h2 {
    /* Clear the viewport top when the sidebar links jump here. */
    scroll-margin-top: 16px;
    font-size: 22px;
    margin: 28px 0 12px;
    color: var(--fg);
    border-bottom: 1px solid rgba(104, 113, 132, 0.25);
    padding-bottom: 6px;
  }

  .prose p {
    margin: 14px 0;
    color: #ded9c2;
  }

  .prose :global(a) {
    color: var(--accent);
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  .prose ul {
    margin: 14px 0;
    padding-left: 24px;
  }

  .prose li {
    margin: 8px 0;
    color: #ded9c2;
  }

  .inline-quote {
    margin: 16px 0;
    padding: 12px 18px;
    background: #0f1624;
    border-left: 3px solid var(--accent);
    color: var(--fg);
    font-size: 16px;
    font-style: italic;
    line-height: 1.5;
  }

  .media-figure {
    margin: 20px 0 24px;
    background: #080c18;
    border: 1px solid rgba(104, 113, 132, 0.3);
    overflow: hidden;
  }

  .usage-embed {
    margin: 20px 0 24px;
    border: 1px solid rgba(104, 113, 132, 0.3);
    background: var(--bg);
    padding: 16px 18px 8px;
  }

  .media-img {
    display: block;
    width: 100%;
    height: auto;
    image-rendering: auto;
  }

  figcaption {
    padding: 10px 14px;
    font-size: 13px;
    color: var(--muted);
    background: #0d1320;
    border-top: 1px solid rgba(104, 113, 132, 0.25);
    line-height: 1.4;
  }

  @media (max-width: 640px) {
    .prose {
      font-size: 16px;
    }
    .prose h2 {
      font-size: 20px;
    }
  }
</style>
