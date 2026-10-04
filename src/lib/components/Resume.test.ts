// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from 'svelte';
import Resume from './Resume.svelte';

describe('Resume component', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders resume title, download button, and language stack', () => {
    mount(Resume, {
      target: document.body,
    });

    const title = document.querySelector('#resume-title');
    expect(title).not.toBeNull();
    expect(title?.textContent).toContain('Resume');

    const downloadLink = document.querySelector('.dl-btn') as HTMLAnchorElement;
    expect(downloadLink).not.toBeNull();
    expect(downloadLink.getAttribute('href')).toBe('/resume.pdf');
    expect(downloadLink.getAttribute('download')).toBe('mintychochip-resume.pdf');

    const langCards = document.querySelectorAll('.lang-card');
    expect(langCards.length).toBeGreaterThanOrEqual(8);

    const rustCard = Array.from(langCards).find((c) => c.textContent?.includes('Rust'));
    expect(rustCard).toBeDefined();
    expect(rustCard?.querySelector('.lang-icon')).not.toBeNull();
  });
});
