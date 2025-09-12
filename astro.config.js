import { defineConfig } from 'astro/config'
import svelte from '@astrojs/svelte'
import tailwindcss from '@tailwindcss/vite'
import raw from 'vite-plugin-raw'
import { fileURLToPath } from 'node:url'

const SRC = fileURLToPath(new URL('./src', import.meta.url))

export default defineConfig({
  integrations: [svelte()],
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
      allowedHosts: ['.ru.tuna.am'],
    },
  },
})
