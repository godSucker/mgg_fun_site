import { defineConfig } from 'vite';
import rawPlugin from 'vite-plugin-raw';

export default defineConfig({
  plugins: [
    rawPlugin({
      match: /\.txt$/, // файлы, которые будут импортироваться как строки
    }),
  ],
});

