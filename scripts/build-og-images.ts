/**
 * Renders the Open Graph / Twitter card PNGs into `public/images/og/`.
 *
 * Text is read from the built entry HTML, so the cards carry exactly the title,
 * description and image path the page ships. Run after `npm run build`:
 *
 *   npm run build && node --experimental-strip-types scripts/build-og-images.ts
 *
 * Cards are committed because the deploy workflow does not install ImageMagick.
 * Requirements: ImageMagick 7 (`magick`) and fontTools for WOFF2 decompression.
 * Colours mirror the tokens in `src/lib/styles/global.css`.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';


const BG = '#0b0f19';
const FG = '#ece6cc';
const MUTED = '#8f98a8';
const ACCENT = '#8bbf73';
const FONT_WOFF2 = join(process.cwd(), 'public/fonts/PixelifySans.woff2');

const ENTRIES = ['dist/index.html', 'dist/blog/index.html', 'dist/blog/the-token-gap/index.html', 'dist/blog/bytemill/index.html'];

const MARGIN = 80;
const HEIGHT = 630;
const WIDTH = 1200;

/** ImageMagick reads TrueType, not WOFF2, so decompress the brand font once. */
function brandFont(dir: string): string {
  const file = join(dir, 'PixelifySans.ttf');
  execFileSync('python3', [
    '-c',
    'import sys\nfrom fontTools.ttLib import TTFont\nf = TTFont(sys.argv[1]); f.flavor = None; f.save(sys.argv[2])',
    FONT_WOFF2,
    file,
  ]);
  return file;
}

function decode(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function meta(html: string, pattern: RegExp): string {
  const match = html.match(pattern);
  if (!match?.[1]) throw new Error(`missing ${pattern}`);
  return decode(match[1]);
}

/**
 * Break text into at most `limit` lines of `max` characters each. A word that
 * would be stranded alone on its final line is pulled onto the previous one, so
 * a heading never leaves one short word orphaned under a long line.
 */
function wrap(text: string, max: number, limit = 3): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);

  const kept = lines.slice(0, limit);
  // Rejoining the overflow lets the caller truncate it with an ellipsis.
  if (lines.length > limit) kept[limit - 1] = lines.slice(limit - 1).join(' ');
  const last = kept.length - 1;
  if (last > 0 && kept[last]!.split(' ').length === 1) {
    kept[last - 1] = `${kept[last - 1]} ${kept[last]}`;
    kept.pop();
  }
  return kept;
}

/**
 * `wrap` can rejoin overflow into a line too long for the card. Cut it back on a
 * word boundary and mark the cut, so text is never silently cropped.
 */
function clip(lines: string[]): string[] {
  return lines.map((line, i) => {
    if (line.length <= 62) return line;
    const cut = line.slice(0, 62);
    const space = cut.lastIndexOf(' ');
    return `${(space > 30 ? cut.slice(0, space) : cut).replace(/[\s,;:.]+$/, '')}…`;
  });
}

function render(file: string, font: string): void {
  const html = readFileSync(file, 'utf8');
  const title = meta(html, /<title>(.*?)<\/title>/s).replace(/ · mintychochip$/, '');
  const description = meta(html, /<meta name="description" content="(.*?)"/s);
  const image = meta(html, /<meta property="og:image" content="(.*?)"/s);
  const path = new URL(meta(html, /<link rel="canonical" href="(.*?)"/s)).pathname;

  // "Justin Lo (mintychochip) · Software engineer" reads better as a headline plus
  // an accent kicker than as one wrapped block with a stranded middot.
  const [headline, ...tail] = title.split(' · ');
  const kicker = tail.join(' · ');
  const headingLines = clip(wrap(headline!, 24));
  const descLines = clip(wrap(description, 58));
  const kind =
    path === '/'
      ? 'PORTFOLIO'
      : path
          .split('/')
          .filter(Boolean)
          .map((part) => part.replaceAll('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
          .join(' · ')
          .toUpperCase();
  const footerPath = path === '/' ? 'HOME' : path;

  const out = ['-size', `${WIDTH}x${HEIGHT}`, `xc:${BG}`, '-font', font, '-fill', ACCENT, '-draw', `rectangle 0,0 ${WIDTH},6`];
  const text = (size: number, color: string, x: number, y: number, body: string, gravity = 'northwest') =>
    out.push('-gravity', gravity, '-pointsize', String(size), '-fill', color, '-annotate', `+${x}+${y}`, body);

  text(30, ACCENT, MARGIN, 100, 'mintychochip.dev');
  text(24, MUTED, MARGIN, 106, kind, 'northeast');
  headingLines.forEach((line, i) => text(66, FG, MARGIN, 186 + i * 76, line));
  let descTop = 190 + headingLines.length * 76;
  if (kicker) {
    text(32, ACCENT, MARGIN, descTop, kicker);
    descTop += 58;
  }
  descLines.forEach((line, i) => text(26, MUTED, MARGIN + 2, descTop + i * 36, line));
  text(24, MUTED, MARGIN, HEIGHT - 66, 'Justin Lo — software engineer');
  text(24, ACCENT, MARGIN, HEIGHT - 66, footerPath, 'northeast');

  const target = join(process.cwd(), 'public', new URL(image).pathname.replace('https://mintychochip.dev', ''));
  mkdirSync(dirname(target), { recursive: true });
  execFileSync('magick', [...out, '-depth', '8', '-strip', target]);
  console.log(`wrote ${target.replace(`${process.cwd()}/`, '')}`);
}

const work = mkdtempSync(join(tmpdir(), 'og-'));
try {
  const font = brandFont(work);
  for (const entry of ENTRIES) render(entry, font);
} finally {
  rmSync(work, { recursive: true, force: true });
}
