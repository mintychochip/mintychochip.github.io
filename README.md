# mintychochip.dev

My site is [mintychochip.dev](https://mintychochip.dev). I publish as [mintychochip](https://github.com/mintychochip).

It's a Svelte 5 page. I have a night pond, my GitHub activity, token usage, a blog teaser, projects, my resume, contact, and a Wordle.

Posts are their own documents under `/blog/`:

- [mintychochip.dev/blog/](https://mintychochip.dev/blog/) lists both posts.
- [mintychochip.dev/blog/the-token-gap/](https://mintychochip.dev/blog/the-token-gap/) is the cross-reference to Umans AI’s article.
- [mintychochip.dev/blog/bytemill/](https://mintychochip.dev/blog/bytemill/) runs the real Bytemill Rust compiler in WebAssembly so you can check schemas and decode/encode packets in the page.

## Deploy

When I push to `master`, [the Pages workflow](.github/workflows/deploy.yml) installs dependencies, runs the check and the tests, builds, and publishes `dist/` to GitHub Pages. It also runs every day at 00:00 UTC, and I can start it by hand.

## Blog pages

Each page is its own Vite entry with its own HTML file:

| URL | Entry | Mounts |
| --- | --- | --- |
| `/blog/` | `blog/index.html` | `src/blog/main.ts` → `BlogIndex` |
| `/blog/the-token-gap/` | `blog/the-token-gap/index.html` | `src/blog/the-token-gap.ts` → `BlogPostPage` |
| `/blog/bytemill/` | `blog/bytemill/index.html` | `src/bytemill/main.ts` → `BytemillArticle` |

`src/lib/blog/cards.ts` is the single list the home section and the index both render, so a new post is one entry there plus its HTML/Vite entry.

## Bytemill article

Its engine is the
committed `public/blog/bytemill/bytemill.wasm` built from `crates/bytemill-wasm` in
[bytemill](https://github.com/mintychochip/bytemill). Three.js is loaded
dynamically for the sample-frame bitfield, so the main site bundle does not
carry it. To rebuild it after a
compiler change:

```bash
BYTEMILL_DIR=../protoc scripts/build-bytemill-wasm.sh
```

## SEO and AI crawlers

`src/lib/seo.ts` is the only place page metadata is written. It holds the title,
description, canonical URL, Open Graph and Twitter tags, and schema.org JSON-LD
for each page. The `seoHead` plugin in `vite.config.ts` injects that into every
entry's `<head>` at build time and generates `sitemap.xml` from the same table.

Do not add `<svelte:head>` metadata to a page. The app is client-rendered, so
those tags only exist after hydration and link unfurlers never see them. The
test suite fails if a page is missing from the table or the emitted HTML.

Social cards live in `public/images/og/` and are committed; the deploy workflow
has no ImageMagick. Regenerate them after changing titles or descriptions:

```bash
npm run build && node --experimental-strip-types scripts/build-og-images.ts
```

## Public files

I serve these from the site root:

- [robots.txt](https://mintychochip.dev/robots.txt) points at the sitemap
- [sitemap.xml](https://mintychochip.dev/sitemap.xml) is generated at build time
- [llms.txt](https://mintychochip.dev/llms.txt)
- [llms-full.txt](https://mintychochip.dev/llms-full.txt) is the written copy of the public page
- [404.html](https://mintychochip.dev/404.html) is what GitHub Pages serves for unknown paths
- [resume.pdf](https://mintychochip.dev/resume.pdf)

Token totals are JSON at `/v1/usage/models.json` and `/v1/usage/series.json`,
served with `application/json`. The build emits those from the extensionless
`public/v1/usage/*` snapshots that an external tool writes, so the snapshot names
never have to change; the extensionless copies remain served as octet-stream.

Those files are static: GitHub Pages ignores the query string, so `from` and `to`
do not filter anything. Every request returns the whole snapshot, and the client
slices the range it wants (`UsagePanel`). Treat the files as periodic exports, not
a live API.
