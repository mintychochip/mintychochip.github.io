import type { ArticleBlock } from './article-content';

export interface BlogNavItem {
  label: string;
  /** Element id for an in-page section; omit for a plain link. */
  id?: string;
  href: string;
}

export interface ArticleHeading {
  /** Index of the block in the article, so the renderer can attach the same id. */
  index: number;
  id: string;
  label: string;
}

export function headingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Heading ids for the article's h2s, de-duplicated in document order. */
export function articleHeadings(blocks: ArticleBlock[]): ArticleHeading[] {
  const used = new Map<string, number>();
  const headings: ArticleHeading[] = [];

  blocks.forEach((block, index) => {
    if (block.type !== 'h2') return;
    const base = headingId(block.text) || `section-${index}`;
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    headings.push({
      index,
      id: seen === 0 ? base : `${base}-${seen + 1}`,
      label: block.text,
    });
  });

  return headings;
}
