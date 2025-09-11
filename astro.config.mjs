import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import rawPlugin from 'vite-plugin-raw';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  integrations: [svelte()],

  // 1) Алиас на уровне Astro (используем абсолютный путь)
  alias: {
    '@': fileURLToPath(new URL('./src', import.meta.url)),
  },

  vite: {
    // 2) И дублируем алиас на уровне Vite (SSR любит это)
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: true,
      allowedHosts: ['.ngrok-free.app'],
    },
    plugins: [rawPlugin({ match: /\.txt$/ })],
  },
});
