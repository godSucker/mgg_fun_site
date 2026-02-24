import { defineConfig } from 'vite';
import rawPlugin from 'vite-plugin-raw';
import svelte from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [
    svelte(),
    rawPlugin({
      match: /\.txt$/, // файлы, которые будут импортироваться как строки
    }),
  ],
  server: {
    allowedHosts: ['4321-ia309369isrgz2n7iwbsj-18e8148a.manus.computer'],
    watch: {
      ignored: [
        '**/textures_by_mutant/**',
        '**/public/textures/**',
        '**/*.webp',
        '**/*.png',
        '**/*.jpg',
      ],
    },
  },
});
