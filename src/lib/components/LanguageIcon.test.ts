// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from 'svelte';
import LanguageIcon from './LanguageIcon.svelte';

describe('LanguageIcon component', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders Rust logo with custom size and title', () => {
    mount(LanguageIcon, {
      target: document.body,
      props: { language: 'Rust', size: 24 },
    });

    const icon = document.querySelector('.lang-icon') as HTMLElement;
    expect(icon).not.toBeNull();
    expect(icon.getAttribute('title')).toBe('Rust');
    expect(icon.style.width).toBe('24px');
    expect(icon.style.height).toBe('24px');

    const svg = icon.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('width')).toBe('24');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');

    const path = svg?.querySelector('path');
    expect(path?.getAttribute('fill')).toBe('#DEA584');
    expect(path?.getAttribute('d')?.startsWith('M23.8346')).toBe(true);
  });

  it('renders Java, TypeScript, Python, and Go icons', () => {
    for (const lang of ['Java', 'TypeScript', 'Python', 'Go', 'Svelte', 'C++', 'Shell', 'Kotlin']) {
      document.body.innerHTML = '';
      mount(LanguageIcon, {
        target: document.body,
        props: { language: lang },
      });
      const icon = document.querySelector('.lang-icon');
      expect(icon).not.toBeNull();
      expect(icon?.querySelector('svg')).not.toBeNull();
    }
  });

  it('renders fallback icon when language is null or unknown', () => {
    mount(LanguageIcon, {
      target: document.body,
      props: { language: null },
    });

    const icon = document.querySelector('.lang-icon');
    expect(icon).not.toBeNull();
    expect(icon?.getAttribute('title')).toBe('Code');
    expect(icon?.querySelector('svg')).not.toBeNull();
  });
});
