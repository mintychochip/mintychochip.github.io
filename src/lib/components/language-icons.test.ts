import { describe, expect, it } from 'vitest';
import { resolveLanguageIcon } from './language-icons';

describe('resolveLanguageIcon', () => {
  it('uses light fill for black hex icons (Markdown)', () => {
    const r = resolveLanguageIcon('markdown');
    expect(r).not.toBeNull();
    expect(r!.fill).toBe('#ECE6CC');
  });

  it('keeps brand overrides for Rust and Java', () => {
    expect(resolveLanguageIcon('rust')!.fill).toBe('#DEA584');
    expect(resolveLanguageIcon('java')!.fill).toBe('#ED8B00');
  });
});
