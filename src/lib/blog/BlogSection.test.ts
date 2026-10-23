// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from 'svelte';
import BlogSection from './BlogSection.svelte';

describe('BlogSection component', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('links cards to their own pages instead of opening a modal', () => {
    mount(BlogSection, { target: document.body });

    const headings = [...document.querySelectorAll('.featured-card .title-link')].map((a) =>
      a.getAttribute('href'),
    );
    expect(headings).toEqual(['/blog/the-token-gap/', '/blog/bytemill/']);
    expect(document.querySelector('.modal-card')).toBeNull();
  });

  it('shows the Umans post with its preview image and external link', () => {
    mount(BlogSection, { target: document.body });

    const card = document.querySelector('.featured-card');
    expect(card?.querySelector('.card-meta')?.textContent).toContain('August 2026');

    const thumb = card?.querySelector('img.thumb-img') as HTMLImageElement | null;
    expect(thumb?.getAttribute('src')).toBe('/images/openai-devday-tokens.webp');

    const external = [...(card?.querySelectorAll('.external-link') ?? [])].map((a) =>
      a.getAttribute('href'),
    );
    expect(external).toContain('https://blog.umans.ai/blog/the-token-gap/');
  });

  it('offers a link to the full blog index', () => {
    mount(BlogSection, { target: document.body });

    const all = document.querySelector('.all-link') as HTMLAnchorElement | null;
    expect(all?.getAttribute('href')).toBe('/blog/');
  });
});
