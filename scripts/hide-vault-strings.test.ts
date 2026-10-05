import { describe, expect, it } from 'vitest';
import { hideStrings } from './hide-vault-strings';

const SAMPLE = `
import kept from "./keep.js";
export function run(n) {
  const o = { "secret": "hello" };
  const nested = \`a\${\`b\${n}c\`}d\`;
  const load = () => import("./mod.js");
  switch (n) {
    case "Z":
      return nested;
    default:
      return load && o["secret"];
  }
}
`;

describe('hideStrings', () => {
  it('encodes string literals and template text, and keeps module paths', async () => {
    const out = hideStrings(SAMPLE);

    expect(out).toContain('from "./keep.js"');
    expect(out).toContain('import("./mod.js")');
    expect(out).not.toMatch(/["'`]hello["'`]/);
    expect(out).not.toMatch(/["'`]secret["'`]/);
    expect(out).not.toMatch(/["'`]Z["'`]/);
    expect(out).not.toContain('`a');
    expect(out).not.toContain('case"');
    expect(out).not.toContain('case$');

    const runnable = hideStrings(SAMPLE.replace('import kept from "./keep.js";\n', ''));
    const mod = await import(`data:text/javascript,${encodeURIComponent(runnable)}`);
    expect(mod.run('Z')).toBe('abZcd');
    expect(mod.run('no')).toBe('hello');
  });

  it('leaves code without strings untouched', () => {
    const code = 'import x from "./a.js";\nexport const n = 1;\n';
    expect(hideStrings(code)).toBe(code);
  });
});
