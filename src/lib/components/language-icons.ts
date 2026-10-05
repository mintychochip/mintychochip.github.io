import type { SimpleIcon } from 'simple-icons';
import {
  siAstro,
  siC,
  siCplusplus,
  siCss,
  siGnubash,
  siGo,
  siHtml5,
  siJavascript,
  siKotlin,
  siMarkdown,
  siOpenjdk,
  siPython,
  siReact,
  siRust,
  siSvelte,
  siTypescript,
  siVuedotjs,
} from 'simple-icons';

/** Simple Icons slug → icon (official brand SVG paths from https://simpleicons.org). */
const ICON_BY_KEY: Record<string, SimpleIcon> = {
  rust: siRust,
  java: siOpenjdk,
  astro: siAstro,
  typescript: siTypescript,
  ts: siTypescript,
  javascript: siJavascript,
  js: siJavascript,
  python: siPython,
  py: siPython,
  react: siReact,
  vue: siVuedotjs,
  'vue.js': siVuedotjs,
  go: siGo,
  golang: siGo,
  svelte: siSvelte,
  'c++': siCplusplus,
  cpp: siCplusplus,
  cplusplus: siCplusplus,
  c: siC,
  shell: siGnubash,
  bash: siGnubash,
  kotlin: siKotlin,
  kt: siKotlin,
  html: siHtml5,
  html5: siHtml5,
  css: siCss,
  css3: siCss,
  markdown: siMarkdown,
  md: siMarkdown,
};

/** Readable fills on the site's dark theme when the icon's default hex is black. */
const FILL_OVERRIDE: Record<string, string> = {
  rust: '#DEA584',
  java: '#ED8B00',
};

export function resolveLanguageIcon(langKey: string): { icon: SimpleIcon; fill: string } | null {
  const icon = ICON_BY_KEY[langKey];
  if (!icon) return null;

  const override = FILL_OVERRIDE[langKey];
  if (override) return { icon, fill: override };

  if (icon.hex && icon.hex.toLowerCase() !== '000000') {
    return { icon, fill: `#${icon.hex}` };
  }

  return { icon, fill: '#ECE6CC' };
}
