/**
 * Every crawler-facing tag for the site: canonical URLs, descriptions, Open Graph,
 * Twitter cards, and JSON-LD.
 *
 * The pages are client-rendered, so tags written with `<svelte:head>` only exist
 * after hydration. Link unfurlers (Discord, Slack, X, LinkedIn, iMessage) never
 * run the bundle, so the HTML that Vite emits must already carry them. The
 * `seoHead` plugin in `vite.config.ts` injects this module's output into each
 * entry HTML at build and dev time; no page mounts its own metadata.
 */
import { POSTS } from './blog/posts.ts';
import { site } from './site.ts';

export const SITE_URL = 'https://mintychochip.dev';
export const SITE_NAME = 'mintychochip';
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

const PERSON_ID = `${SITE_URL}/#person`;
const WEBSITE_ID = `${SITE_URL}/#website`;

/** The only person the site is about. Referenced by `@id` from article nodes. */
export const PERSON: Record<string, unknown> = {
  '@type': 'Person',
  '@id': PERSON_ID,
  name: site.givenName,
  alternateName: site.name,
  url: `${SITE_URL}/`,
  jobTitle: 'Software engineer',
  email: `mailto:${site.email}`,
  sameAs: [site.github, site.linkedin],
};

/**
 * The home page title. `App.svelte` restores this when switching back to the
 * portfolio tab; hydration must not overwrite the title the build injected.
 */
export const PORTFOLIO_TITLE = `${site.givenName} (${site.name}) · Software engineer`;

export const WEBSITE: Record<string, unknown> = {
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  url: `${SITE_URL}/`,
  name: SITE_NAME,
  inLanguage: 'en',
  publisher: { '@id': PERSON_ID },
};

export interface PageSeo {
  /** Canonical path on this site. Every page ends in a slash. */
  path: string;
  title: string;
  description: string;
  /** Social card, site-relative. 1200x630 PNG. */
  image: string;
  imageAlt: string;
  ogType: 'website' | 'article';
  article?: {
    publishedTime?: string;
    section?: string;
    tags?: string[];
  };
  /** Keep the page out of search results and out of the sitemap. */
  noindex?: boolean;
  jsonLd: Record<string, unknown>[];
}

const tokenGap = POSTS.find((post) => post.pageUrl === '/blog/the-token-gap/');
if (!tokenGap) throw new Error('the-token-gap post is missing from POSTS');

const BYTEMILL = {
  path: '/blog/bytemill/',
  title: 'Bytemill: a schema language for binary wire formats',
  description:
    'Interactive article: Bytemill, a schema language and compiler for binary wire formats. Edit BML schemas, decode packets, and encode VarInts with the real Rust compiler in WebAssembly.',
  image: '/images/og/bytemill.png',
  imageAlt: 'Bytemill: a schema language for binary wire formats',
};

function blogPosting(post: (typeof POSTS)[number], image: string): Record<string, unknown> {
  return {
    '@type': 'BlogPosting',
    '@id': `${SITE_URL}${post.pageUrl}#article`,
    headline: post.title,
    description: post.excerpt,
    url: `${SITE_URL}${post.pageUrl}`,
    mainEntityOfPage: `${SITE_URL}${post.pageUrl}`,
    image: `${SITE_URL}${image}`,
    datePublished: post.dateIso,
    inLanguage: 'en',
    author: { '@id': PERSON_ID },
    publisher: { '@id': PERSON_ID },
    keywords: post.tags.join(', '),
    isBasedOn: post.externalUrl,
    citation: post.externalUrl,
  };
}

export const PAGES: PageSeo[] = [
  {
    path: '/',
    title: PORTFOLIO_TITLE,
    description:
      'Portfolio of Justin Lo (mintychochip), a software engineer: GitHub activity, coding-agent token usage, blog, projects, resume, contact, and a Wordle.',
    image: '/images/og/home.png',
    imageAlt: 'Justin Lo (mintychochip), software engineer',
    ogType: 'website',
    jsonLd: [PERSON, WEBSITE],
  },
  {
    path: '/blog/',
    title: `Blog · ${SITE_NAME}`,
    description:
      'Writing by Justin Lo (mintychochip): a first-person cross-reference to Umans AI’s “The Token Gap”, and an interactive article on Bytemill.',
    image: '/images/og/blog.png',
    imageAlt: 'Blog by Justin Lo (mintychochip)',
    ogType: 'website',
    jsonLd: [
      {
        '@type': 'Blog',
        '@id': `${SITE_URL}/blog/#blog`,
        url: `${SITE_URL}/blog/`,
        name: `Blog · ${SITE_NAME}`,
        description:
          'Long-form notes on agentic coding, compilers, and binary formats, by Justin Lo.',
        inLanguage: 'en',
        author: { '@id': PERSON_ID },
        publisher: { '@id': PERSON_ID },
        blogPost: [
          ...POSTS.map((post) => ({
            '@type': 'BlogPosting',
            headline: post.title,
            url: `${SITE_URL}${post.pageUrl}`,
            datePublished: post.dateIso,
            author: { '@id': PERSON_ID },
          })),
          {
            '@type': 'TechArticle',
            headline: BYTEMILL.title,
            url: `${SITE_URL}${BYTEMILL.path}`,
            author: { '@id': PERSON_ID },
          },
        ],
      },
    ],
  },
  {
    path: tokenGap.pageUrl,
    title: `${tokenGap.title} · ${SITE_NAME}`,
    description: tokenGap.excerpt,
    image: '/images/og/the-token-gap.png',
    imageAlt: tokenGap.title,
    ogType: 'article',
    article: {
      publishedTime: tokenGap.dateIso,
      section: 'Agentic coding',
      tags: tokenGap.tags,
    },
    jsonLd: [blogPosting(tokenGap, '/images/og/the-token-gap.png')],
  },
  {
    path: BYTEMILL.path,
    title: `${BYTEMILL.title} · ${SITE_NAME}`,
    description: BYTEMILL.description,
    image: BYTEMILL.image,
    imageAlt: BYTEMILL.imageAlt,
    ogType: 'article',
    article: { section: 'Engineering' },
    jsonLd: [
      {
        '@type': 'TechArticle',
        '@id': `${SITE_URL}${BYTEMILL.path}#article`,
        headline: BYTEMILL.title,
        description: BYTEMILL.description,
        url: `${SITE_URL}${BYTEMILL.path}`,
        mainEntityOfPage: `${SITE_URL}${BYTEMILL.path}`,
        image: `${SITE_URL}${BYTEMILL.image}`,
        inLanguage: 'en',
        author: { '@id': PERSON_ID },
        publisher: { '@id': PERSON_ID },
        about: ['Binary serialization', 'Schema language', 'WebAssembly'],
        keywords: 'Bytemill, BML, binary wire format, protocol buffers, WebAssembly',
      },
    ],
  },
];

/** `/blog/index.html` and `/blog/` both resolve to the `/blog/` page. */
export function pagePath(path: string): string {
  const clean = path.split(/[?#]/)[0]!.replace(/\\/g, '/');
  if (clean.endsWith('/index.html')) return clean.slice(0, -'index.html'.length);
  return clean || '/';
}

export function pageFor(path: string): PageSeo | undefined {
  const wanted = pagePath(path);
  return PAGES.find((page) => page.path === wanted);
}

export function canonical(page: PageSeo): string {
  return `${SITE_URL}${page.path}`;
}

function attr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** `<` is escaped so post text can never close the JSON-LD script element. */
function jsonLdScript(node: Record<string, unknown>): string {
  const json = JSON.stringify({ '@context': 'https://schema.org', ...node }).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">${json}</script>`;
}

/** The tags injected into the entry HTML's `<head>`. */
export function headTags(page: PageSeo): string {
  const url = canonical(page);
  const image = `${SITE_URL}${page.image}`;
  const lines = [
    `<title>${attr(page.title)}</title>`,
    `<meta name="description" content="${attr(page.description)}" />`,
    `<meta name="author" content="${attr(site.givenName)}" />`,
    `<link rel="canonical" href="${attr(url)}" />`,
    page.noindex
      ? '<meta name="robots" content="noindex, follow" />'
      : '<meta name="robots" content="index, follow, max-image-preview:large" />',
    `<meta property="og:site_name" content="${attr(SITE_NAME)}" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta property="og:type" content="${page.ogType}" />`,
    `<meta property="og:title" content="${attr(page.title)}" />`,
    `<meta property="og:description" content="${attr(page.description)}" />`,
    `<meta property="og:url" content="${attr(url)}" />`,
    `<meta property="og:image" content="${attr(image)}" />`,
    `<meta property="og:image:type" content="image/png" />`,
    `<meta property="og:image:width" content="${OG_IMAGE_WIDTH}" />`,
    `<meta property="og:image:height" content="${OG_IMAGE_HEIGHT}" />`,
    `<meta property="og:image:alt" content="${attr(page.imageAlt)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${attr(page.title)}" />`,
    `<meta name="twitter:description" content="${attr(page.description)}" />`,
    `<meta name="twitter:image" content="${attr(image)}" />`,
    `<meta name="twitter:image:alt" content="${attr(page.imageAlt)}" />`,
  ];

  if (page.article?.publishedTime) {
    lines.push(`<meta property="article:published_time" content="${attr(page.article.publishedTime)}" />`);
  }
  if (page.article?.section) {
    lines.push(`<meta property="article:section" content="${attr(page.article.section)}" />`);
  }
  for (const tag of page.article?.tags ?? []) {
    lines.push(`<meta property="article:tag" content="${attr(tag)}" />`);
  }

  lines.push(...page.jsonLd.map(jsonLdScript));
  return lines.join('\n    ');
}

/**
 * Without JS the Svelte app never mounts, so crawlers and readers with scripting
 * off would see an empty body. The tags above already make the page indexable;
 * this gives it something to read and a link onward.
 */
export function noScriptHtml(page: PageSeo): string {
  const links =
    page.path === '/'
      ? '<li><a href="/blog/">Blog</a></li>'
      : '<li><a href="/">Home</a></li><li><a href="/blog/">Blog</a></li>';
  return [
    '<style>body{background:#0b0f19;color:#ece6cc;font:16px/1.55 ui-monospace,monospace;margin:0}',
    'main{max-width:640px;padding:48px 20px}a{color:#8bbf73}</style>',
    `<main><h1>${attr(page.title)}</h1>`,
    `<p>${attr(page.description)}</p>`,
    `<p>This page needs JavaScript to render. Reach Justin Lo at <a href="mailto:${attr(site.email)}">${attr(site.email)}</a>.</p>`,
    `<ul>${links}</ul>`,
    `<p><a href="${attr(canonical(page))}">${attr(canonical(page))}</a></p></main>`,
  ].join('');
}

export function sitemapXml(pages: PageSeo[] = PAGES): string {
  const urls = pages
    .filter((page) => !page.noindex)
    .map((page) => `  <url>\n    <loc>${attr(canonical(page))}</loc>\n  </url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
