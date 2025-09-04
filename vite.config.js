import { defineConfig } from 'vite';
import rawPlugin from 'vite-plugin-raw';
import svelte from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [
    svelte()
    rawPlugin({
      match: /\.txt$/, // файлы, которые будут импортироваться как строки
    }),
  ],
});
