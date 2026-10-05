import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { hideStrings } from './scripts/hide-vault-strings.ts';

const VAULT_CHUNKS = new Set(['vault', 'vault-seal', 'vault-door']);

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
  if (path.includes('node_modules/three')) return 'three';
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
    path.includes('vault-chrome')
  ) {
    return 'vault-door';
  }
  return 'vault';
}

export default defineConfig({
  plugins: [svelte(), obfuscateVaultChunks()],
  build: {
    outDir: 'dist',
    rollupOptions: {
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
