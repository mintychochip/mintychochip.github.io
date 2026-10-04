/// <reference lib="dom" />
import { site } from '../site';

export interface Project {
  name: string;
  description: string;
  /** Where the card links: the live site if there is one, otherwise the repo. */
  url: string;
  /** Domain shown for projects with a live site. */
  live: string | null;
  language: string | null;
  stars: number;
  /** ISO timestamp of the last push. */
  pushed: string;
}

export const PER_PAGE = 6;
/** Max words shown on project cards; longer GitHub descriptions get an ellipsis. */
export const DESCRIPTION_MAX_WORDS = 20;
const MAX_PAGES = 10;

export function truncateWords(text: string, maxWords = DESCRIPTION_MAX_WORDS): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const words = trimmed.split(/\s+/);
  if (words.length <= maxWords) return trimmed;
  return `${words.slice(0, maxWords).join(' ')}…`;
}

function project(name: string, description: string, fields: Partial<Project> & { pushed: string }): Project {
  const live = site.projectUrls[name] ?? null;
  return {
    name,
    description,
    url: live ?? `${site.github}/${name}`,
    live: live ? new URL(live).host : null,
    language: null,
    stars: 0,
    ...fields,
  };
}

/** Shown until the GitHub API answers, and kept if it never does. */
export const FALLBACK: Project[] = [
  project('toktally', 'Cross-harness token-usage store. Plugins sync Claude Code, Codex, Grok, Hermes and other coding agents into a Rust API.', { language: 'Rust', pushed: '2026-09-02T00:00:00Z' }),
  project('kitsune', 'AI semantic search for Minecraft. Natural-language item finder using DJL and Hugging Face.', { language: 'Java', pushed: '2026-08-29T00:00:00Z' }),
  project('Alchemica', 'Custom potion brewing for Minecraft. Cauldron-based alchemy with flexible recipes.', { language: 'Java', stars: 1, pushed: '2026-08-29T00:00:00Z' }),
  project('dungeon-generator', 'Paper plugin that generates deterministic, graph-first 3D dungeons.', { language: 'Java', pushed: '2026-08-27T00:00:00Z' }),
  project('ModularJobs', 'Modular job system for Minecraft Paper servers with skill trees and RPG progression.', { language: 'Java', stars: 1, pushed: '2026-08-26T00:00:00Z' }),
  project('guildpost', 'Game server browser with 2000+ Minecraft servers. Live status, player counts, community rankings.', { language: 'Astro', pushed: '2026-05-08T00:00:00Z' }),
];

/** Maps one entry of the GitHub repos API, skipping forks, this site's repo and the profile README repo. */
export function toProject(raw: unknown, user = site.githubUser): Project | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.name !== 'string' || !r.name || r.fork === true) return null;
  const lower = r.name.toLowerCase();
  if (lower === user.toLowerCase() || lower === `${user}.github.io`.toLowerCase()) return null;
  const pushed = typeof r.pushed_at === 'string' ? r.pushed_at : typeof r.updated_at === 'string' ? r.updated_at : '';
  const p = project(r.name, typeof r.description === 'string' ? r.description.trim() : '', {
    language: typeof r.language === 'string' ? r.language : null,
    stars: typeof r.stargazers_count === 'number' ? r.stargazers_count : 0,
    pushed,
  });
  if (!site.projectUrls[r.name] && typeof r.html_url === 'string' && r.html_url.startsWith('https://')) p.url = r.html_url;
  return p;
}

export function sortProjects(list: Project[]): Project[] {
  return [...list].sort((a, b) => (b.pushed > a.pushed ? 1 : b.pushed < a.pushed ? -1 : a.name.localeCompare(b.name)));
}

export async function fetchProjects(user = site.githubUser, signal?: AbortSignal): Promise<Project[]> {
  const out: Project[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(`https://api.github.com/users/${user}/repos?sort=updated&per_page=100&page=${page}`, {
      headers: { Accept: 'application/vnd.github+json' },
      signal,
    });
    if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
    const batch: unknown = await res.json();
    if (!Array.isArray(batch)) throw new Error('unexpected GitHub response');
    for (const raw of batch) {
      const p = toProject(raw, user);
      if (p) out.push(p);
    }
    if (batch.length < 100) break;
  }
  return sortProjects(out);
}

export function metaParts(p: Project, now = new Date()): { language: string | null; otherParts: string[] } {
  const d = new Date(p.pushed);
  const otherParts: string[] = [];
  if (p.stars) otherParts.push(`${p.stars} ${p.stars === 1 ? 'star' : 'stars'}`);
  if (!Number.isNaN(d.getTime())) {
    const sameYear = d.getUTCFullYear() === now.getUTCFullYear();
    otherParts.push(
      `updated ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: sameYear ? undefined : 'numeric', timeZone: 'UTC' })}`,
    );
  }
  if (p.live) otherParts.push(p.live);
  return { language: p.language, otherParts };
}

export function metaLine(p: Project, now = new Date()): string {
  const { language, otherParts } = metaParts(p, now);
  const parts: string[] = [];
  if (language) parts.push(language);
  parts.push(...otherParts);
  return parts.join(' · ');
}
