import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { hideStrings } from './scripts/hide-vault-strings.ts';
import { headTags, noScriptHtml, pageFor, sitemapXml } from './src/lib/seo.ts';

const VAULT_CHUNKS = new Set(['vault', 'vault-seal', 'vault-door']);

/**
 * The app is client-rendered, so anything a page declared in `<svelte:head>` only
 * existed after the bundle ran. Link unfurlers and most LLM fetchers never run
 * it. Inject the static tags for the entry being served instead, and emit the
 * sitemap from the same table so the two cannot drift.
 */
function seoHead(): Plugin {
  return {
    name: 'seo-head',
    transformIndexHtml(html, ctx) {
      const page = pageFor(ctx.path);
      if (!page) return html;
      return {
        html: html.replace(/\n?<\/head>/, `\n    ${headTags(page)}\n  </head>`),
        tags: [{ tag: 'noscript', children: noScriptHtml(page), injectTo: 'body' }],
      };
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] !== '/sitemap.xml') return next();
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.end(sitemapXml());
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemapXml() });
    },
  };
}

/**
 * GitHub Pages picks Content-Type from the file extension, so the extensionless
 * `/v1/usage/models` snapshot is served as application/octet-stream. Something
 * outside this repo writes those exact paths, so they must keep their names.
 * Emit `.json` twins from the same bytes at build time and point the app at
 * them; there is still one source file per dataset.
 */
function usageJson(): Plugin {
  const SOURCES = ['models', 'series'];

  return {
    name: 'usage-json',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = req.url?.split('?')[0]?.match(/^\/v1\/usage\/(\w+)\.json$/)?.[1];
        if (!name || !SOURCES.includes(name)) return next();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=600');
        res.end(readFileSync(join('public/v1/usage', name), 'utf8'));
      });
    },
    generateBundle() {
      for (const name of SOURCES) {
        this.emitFile({
          type: 'asset',
          fileName: `v1/usage/${name}.json`,
          source: readFileSync(join('public/v1/usage', name), 'utf8'),
        });
      }
    },
  };
}

function obfuscateVaultChunks(): Plugin {
  return {
    name: 'obfuscate-vault-chunks',
    apply: 'build',
    enforce: 'post',
    // Vite injects preload paths after generateBundle, so encode the files that were written.
    async writeBundle(options, bundle) {
      const { obfuscateVaultChunk } = await import('./scripts/obfuscate-vault-chunk.ts');
      const dir = options.dir ?? 'dist';
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk' || !VAULT_CHUNKS.has(chunk.name)) continue;
        const file = join(dir, chunk.fileName);
        const hidden = hideStrings(readFileSync(file, 'utf8'));
        // The vault chunk also holds the Svelte runtime the whole site imports.
        // Flattening that control flow would slow every page, so only the door
        // and seal chunks get it. Names are hexadecimal in all three.
        const next = obfuscateVaultChunk(hidden, chunk.name !== 'vault');
        writeFileSync(file, next);
      }
    },
  };
}

function vaultChunk(path: string): string | undefined {
  if (path.includes('.test.')) return;
  if (
    path.includes('/secret/vault-crypto') ||
    path.includes('/secret/vault-sealed') ||
    path.includes('/secret/vault-open')
  ) {
    return 'vault-seal';
  }
  if (path.includes('/src/lib/music/') && !path.includes('/audio-context')) return 'vault';
  if (!path.includes('/src/lib/secret/')) return;
  if (
    path.includes('SecretPage') ||
    path.includes('SecretDenied') ||
    path.includes('GrandLoader') ||
    path.includes('vault-chrome') ||
    path.includes('vault-gate')
  ) {
    return 'vault-door';
  }
  return 'vault';
}

export default defineConfig({
  plugins: [seoHead(), usageJson(), svelte(), obfuscateVaultChunks()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        blog: 'blog/index.html',
        'blog-token-gap': 'blog/the-token-gap/index.html',
        bytemill: 'blog/bytemill/index.html',
      },
      output: {
        manualChunks(id) {
          return vaultChunk(id.replaceAll('\\', '/'));
        },
      },
    },
  },
  resolve: {
    conditions: ['browser'],
  },
});
