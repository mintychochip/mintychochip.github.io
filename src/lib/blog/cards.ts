import { POSTS } from './posts';

export type BlogCardVisual =
  | { kind: 'image'; src: string; alt: string }
  | { kind: 'wire'; lines: { text: string; tone?: 'dim' | 'accent' }[] };

export interface BlogCard {
  id: string;
  href: string;
  title: string;
  /** Short label for nav lists. */
  navLabel: string;
  date: string;
  readTime: string;
  /** Shown before the date when the piece is not a plain dated post. */
  kindLabel?: string;
  excerpt: string;
  action: string;
  external?: { href: string; label: string };
  visual: BlogCardVisual;
}

const tokenGap = POSTS.find((post) => post.slug === 'the-token-gap-10b-day');
if (!tokenGap) throw new Error('the-token-gap-10b-day is missing from POSTS');

/** Every public post, in display order. The home page section and /blog/ both read this. */
export const BLOG_CARDS: BlogCard[] = [
  {
    id: tokenGap.id,
    href: tokenGap.pageUrl,
    title: tokenGap.title,
    navLabel: 'The Token Gap',
    date: tokenGap.date,
    readTime: tokenGap.readTime,
    excerpt: tokenGap.excerpt,
    action: 'Read my side',
    external: { href: tokenGap.externalUrl, label: 'Their article ↗' },
    visual: {
      kind: 'image',
      src: tokenGap.devdayImage,
      alt: 'OpenAI DevDay: developers who processed 10B+ lifetime API tokens',
    },
  },
  {
    id: 'bytemill',
    href: '/blog/bytemill/',
    title: 'Bytemill: a schema language for the bytes Protobuf can’t say',
    navLabel: 'Bytemill',
    date: 'October 2026',
    readTime: '4 min read',
    kindLabel: 'Interactive article',
    excerpt:
      'Edit BML schemas, decode packets, and encode VarInts with the real Rust compiler running in WebAssembly. No server, no upload.',
    action: 'Open the article',
    external: { href: 'https://github.com/mintychochip/bytemill', label: 'Compiler source ↗' },
    visual: {
      kind: 'wire',
      lines: [
        { text: 'packet player_chat', tone: 'dim' },
        { text: '0f 68 65 6c 6c 6f 2c 20 62 79 74 65 6d 69 6c 6c' },
        { text: '00 00 00 00 00 00 00 01', tone: 'dim' },
        { text: '→ message, timestamp, sender', tone: 'accent' },
      ],
    },
  },
];
