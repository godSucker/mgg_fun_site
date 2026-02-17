import { defineConfig } from 'astro/config'
import svelte from '@astrojs/svelte'
import vercel from '@astrojs/vercel'
import tailwindcss from '@tailwindcss/vite'
import raw from 'vite-plugin-raw'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'astro/config';

const SRC = fileURLToPath(new URL('./src', import.meta.url))

export default defineConfig({
  site: 'https://archivist-library.com',
  output: 'server',
  adapter: vercel(),
  prefetch: true,
  integrations: [svelte()],
  build: {
    assetsPrefix: 'https://cdn.archivist-library.com',
  },
  alias: {
    '@': SRC,
  },
  vite: {
    plugins: [
      tailwindcss(),
      raw({ match: /\.txt$/ }),
    ],
    resolve: {
      alias: {
        '@': SRC,
      },
    },
    server: {
      host: true,
      allowedHosts: ['.ru.tuna.am', '.nl.tuna.am', '.manus.computer'],
      watch: {
        usePolling: true,
        interval: 1000,
        ignored: ['**/.venv_orb/**', '**/.venv/**'],
      },
    },
  },
})
