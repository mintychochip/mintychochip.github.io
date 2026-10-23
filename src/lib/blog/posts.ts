export interface BlogPost {
  id: string;
  slug: string;
  /** Canonical page for the post. */
  pageUrl: string;
  title: string;
  subtitle: string;
  /** Human date shown in bylines. */
  date: string;
  /** Machine date for <time datetime>. */
  dateIso: string;
  readTime: string;
  /** Shown next to the date when the piece is not a plain dated post. */
  kindLabel?: string;
  tags: string[];
  externalUrl: string;
  externalSource: string;
  /** Call to action for the source article, e.g. "Read Umans AI’s article ↗". */
  externalCta: string;
  excerpt: string;
  summary: string;
  featuredQuote: {
    text: string;
    author: string;
    source: string;
    url: string;
  };
  metrics: {
    label: string;
    value: string;
    detail: string;
  }[];
  discordQuote: {
    user: string;
    badge: string;
    date: string;
    text: string[];
    image: string;
  };
  telemetryImage: string;
  devdayImage: string;
  author: string;
}

export const POSTS: BlogPost[] = [
  {
    id: 'the-token-gap-10b-day',
    slug: 'the-token-gap-10b-day',
    pageUrl: '/blog/the-token-gap/',
    title: 'Yes, That Was Me: Inside Umans AI’s "The Token Gap"',
    subtitle:
      'When Umans AI wrote about a single developer running 11 billion tokens in 24 hours, they were looking at my telemetry. Here’s the story from my side of the terminal.',
    date: 'August 2026',
    dateIso: '2026-08-25',
    readTime: '5 min read',
    kindLabel: 'Cross-Reference',
    tags: ['tokenomics', 'agentic-ai', 'umans-ai', 'cross-reference'],
    author: 'mintychochip',
    externalUrl: 'https://blog.umans.ai/blog/the-token-gap/',
    externalSource: 'Umans AI Blog',
    externalCta: 'Read Umans AI’s article ↗',
    excerpt:
      'When Umans AI published "The Token Gap", they cited a developer running 10.95B tokens in 24 hours. That developer is me. Here is the first-person perspective behind that record run.',
    summary:
      'A personal cross-reference to Umans AI’s flagship article "The Token Gap". While Umans analyzed the macro compute bottleneck, this piece shares the client-side story of pushing 10.95 billion tokens in a single day across 53,248 autonomous agent requests.',
    featuredQuote: {
      text: 'Last October we were in the audience at OpenAI’s DevDay. At one point Sam Altman stepped out in front of a wall of names: the developers who had processed the most tokens through the API. Ten billion tokens over a lifetime of building earned your name on that wall and a public tribute from Sam Altman himself. Eight months later, this June, we watched a single user on Umans AI run nearly eleven billion tokens in a single day.',
      author: 'Umans AI Engineering',
      source: 'The token gap: AI token demand vs compute supply',
      url: 'https://blog.umans.ai/blog/the-token-gap/',
    },
    metrics: [
      { label: 'Single-Day Peak', value: '10.95B', detail: 'Tokens processed on June 29, 2026' },
      { label: 'Cache Hit Rate', value: '99%', detail: 'Crucial for viable agentic prefill' },
      { label: 'Daily Requests', value: '53,248', detail: 'Autonomous agent API calls in 24h' },
      { label: 'DevDay Wall Comparison', value: '1 Lifetime → 1 Day', detail: '10B milestone compressed from years to 24h' },
    ],
    discordQuote: {
      user: 'mintychochip',
      badge: 'NVDA',
      date: '6/29/26, 3:06 PM',
      text: [
        'guyhs',
        'i beat my record yesterday guys',
        '10b in one day',
        'BUST',
      ],
      image: '/images/discord-10b-record.png',
    },
    telemetryImage: '/images/umans-10b-usage.png',
    devdayImage: '/images/openai-devday-tokens.webp',
  },
];
