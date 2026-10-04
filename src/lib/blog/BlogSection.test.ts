// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { mount, tick } from 'svelte';
import BlogSection from './BlogSection.svelte';

describe('BlogSection component', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders section with DevDay preview and Umans head link', () => {
    mount(BlogSection, {
      target: document.body,
    });

    const header = document.querySelector('#blog-title');
    expect(header).not.toBeNull();
    expect(header?.textContent).toContain('Blog');

    const headLink = document.querySelector('.external-head-link');
    expect(headLink).not.toBeNull();
    const headLogo = headLink?.querySelector('img.head-umans-logo') as HTMLImageElement;
    expect(headLogo?.getAttribute('src')).toBe('/images/umans-logo.svg');

    const devdayThumb = document.querySelector('.card-visual img.thumb-img') as HTMLImageElement;
    expect(devdayThumb).not.toBeNull();
    expect(devdayThumb.getAttribute('src')).toBe('/images/openai-devday-tokens.webp');

    const extLink = document.querySelector('.external-link') as HTMLAnchorElement;
    expect(extLink?.getAttribute('href')).toContain('blog.umans.ai');
  });

  it('opens and closes the modal when clicking read my side', async () => {
    mount(BlogSection, {
      target: document.body,
    });
    await tick();

    const readBtn = document.querySelector('.read-btn') as HTMLButtonElement;
    expect(readBtn).not.toBeNull();
    readBtn.click();
    await tick();

    expect(document.querySelector('.modal-card')).not.toBeNull();

    const closeBtn = document.querySelector('.close-btn') as HTMLButtonElement;
    closeBtn.click();
    await tick();

    expect(document.querySelector('.modal-card')).toBeNull();
  });
});
