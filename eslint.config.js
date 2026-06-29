// eslint.config.js (flat config)
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import astro from 'eslint-plugin-astro'
import astroParser from 'astro-eslint-parser'
import svelte from 'eslint-plugin-svelte'
import svelteParser from 'svelte-eslint-parser'

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Astro files
  {
    files: ['**/*.astro'],
    languageOptions: {
      parser: astroParser,
      parserOptions: {
        // чтобы скриптовые блоки в .astro разбирались как TS/JS
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.astro']
      }
    },
    plugins: { astro },
    rules: {
      // базовые “разумные” правила для Astro
      'astro/no-set-html-directive': 'error',
      'astro/no-conflict-set-directives': 'error',
      'astro/no-unused-css-selector': 'warn'
    }
  },

  // Svelte files
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module', extraFileExtensions: ['.svelte'] }
    },
    plugins: { svelte },
    rules: {
      // безопасные и полезные правила для Svelte
      'svelte/no-reactive-reassign': 'error',
      'svelte/no-dupe-else-if-blocks': 'error',
      'svelte/no-at-html-tags': 'error'
    }
  },

  // Общие мелкие придирки, чтобы шум не мешал
  {
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error'
    }
  }
]
