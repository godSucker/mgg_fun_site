import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import rawPlugin from 'vite-plugin-raw';

export default defineConfig({
  integrations: [svelte()],
  vite: {
    server: {
      host: true, // позволяет принимать запросы со всех адресов
      allowedHosts: ['.ngrok-free.app'], // разрешённый домен
    },
    plugins: [
      rawPlugin({ match: /\.txt$/ }), // разрешаем импортировать .txt как строки
      ],
  },
});
