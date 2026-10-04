import { describe, expect, it } from 'vitest';
import { mailto, validate } from './mail';

describe('validate', () => {
  it('accepts a complete draft', () => {
    expect(validate({ name: 'Ada', email: 'ada@example.com', message: 'Hi' })).toEqual({});
  });

  it('flags each missing or malformed field', () => {
    const e = validate({ name: ' ', email: 'ada@example', message: '' });
    expect(Object.keys(e).sort()).toEqual(['email', 'message', 'name']);
    expect(validate({ name: 'a', email: '', message: 'b' }).email).toMatch(/email/);
  });
});

describe('mailto', () => {
  it('drafts a message to the site address', () => {
    const href = mailto('justincarllo@gmail.com', { name: ' Ada ', email: 'ada@example.com', message: 'Hello & bye' });
    const url = new URL(href);
    expect(url.protocol).toBe('mailto:');
    expect(url.pathname).toBe('justincarllo@gmail.com');
    expect(url.searchParams.get('subject')).toBe('Portfolio inquiry from Ada');
    expect(url.searchParams.get('body')).toBe('Hello & bye\n\nAda\nada@example.com');
  });
});
