# MGG Hub — MiMo Code Instructions

## Quick Start

```bash
npm run dev        # Dev server (local network)
npm run build      # Production build (CDN prefix)
npm run preview    # Preview production build
npx eslint .       # Lint (Astro + Svelte + TS)
```

Dev server uses polling (1s), ignores `.venv*` dirs.

## Architecture (30-sec)

- **Astro 5** (SSG) + **Svelte 5** (interactive) + **Tailwind 4** (Vite plugin)
- **XLSX** for Excel parsing, **Sharp** for images, **Vercel Analytics**
- Site: `archivist-library.com` | CDN: `cdn.archivist-library.com`
- All UI text in **Russian**

```
src/
  pages/          # Astro routes (*.astro)
  layouts/        # BaseLayout.astro (global shell)
  components/     # UI (Svelte for interactive, Astro for static)
    simulators/   # craft/, reactor/, cash/, lucky/, madness/
    breeding/     # BreedingUI.svelte
    materials/    # MaterialsTable.astro
  lib/            # Shared logic, NO UI
  data/           # Static data: JSON, TXT, XLSX
  styles/         # global.css
```

Alias: `@` → `./src`

## File Conventions

- **`.astro`** — pages, layouts, static components (MaterialsTable)
- **`.svelte`** — interactive UI (simulators, calculators, browsers)
- **`.ts` in `lib/`** — pure logic, types, parsers (no DOM)
- **`?raw` import** — `.txt` files loaded as strings

Simulator pattern: `src/components/simulators/{name}/{Name}.svelte` + `src/lib/{name}.ts`
Data pattern: `src/data/simulators/{name}/` or `src/data/{feature}/`

## Code Style

```json
// .prettierrc
{ "semi": false, "singleQuote": true, "printWidth": 100 }
```

- No semicolons, single quotes, 100 char width
- Follow existing style in each file (some files differ)
- `@const` blocks in Svelte for derived values
- Responsive: mobile < 768px, tablet 768-1023px, desktop 1024px+, QHD 1921px+
- Dark theme: `#0d1117` bg, `#c9d1d9` text
- Font: TT Supermolot Neue

## Rules

1. **Never add comments** unless explicitly asked
2. **Never add error handling** for impossible scenarios
3. **Check `package.json`** before assuming a library exists
4. **Run `npx eslint .`** after changes
5. **No test files** in `src/` (project has none)
6. **Don't create documentation** unless asked
7. **Don't commit** unless asked
8. **Use existing patterns** — check neighboring files before writing new code

## Key Modules

| Module | Location | Purpose |
|--------|----------|---------|
| Breeding | `src/lib/breeding/` | Gene prediction, weighted outcomes |
| Reactor | `src/lib/reactor-gacha.ts` | Gacha simulation |
| Craft | `src/lib/craft-simulator.ts` | Recipe parsing, simulation |
| Cash Machine | `src/lib/cash-machine.ts` | Roulette logic |
| Lucky Slots | `src/lib/lucky-machine.ts` | Slots logic |
| Madness | `src/lib/madness-machine.ts` | Madness roulette |
| Stats | `src/lib/stats/` | Stat calculators, orbs |
| Mutants | `src/lib/mutant-textures.ts` | Texture resolution |
| Bingo | `src/lib/bingo-textures.ts` | Bingo texture mappings |
| Search | `src/lib/search-normalize.ts` | Text normalization |
| XLSX | `src/lib/xlsx-loader.ts` | Excel file parsing |

## Data Files

- `src/data/mutants/*.json` — mutant definitions by tier
- `src/data/mutant_names.json` — specimen ID → Russian name
- `src/data/materials/*.json` — orbs, charms, materials, buildings, zones, sources
- `src/data/bingos.json` — bingo grid definitions (~6000 lines)
- `src/data/simulators/CRAFT/*.txt` — XML recipe files (Python ref: `craft.py`)
- `src/data/simulators/reactor/` — gacha configs, texture maps
- `src/data/breeding/settings.xml` — breeding rules
- `src/data/localisation_ru.txt` — Russian translations

## Configuration

- `astro.config.ts` — site URL, CDN prefix, aliases, Svelte/Tailwind plugins
- `.eslint.config.js` — flat config, Astro + Svelte parsers
  - `astro/no-set-html-directive`: error
  - `svelte/no-reactive-reassign`: error
  - No unused vars: warn (ignore `_` prefix)

## What NOT to Do

- Don't assume a library is installed — check `package.json` first
- Don't add features beyond what's asked
- Don't refactor working code unless asked
- Don't create new files unless necessary
- Don't add `console.log` or debug statements
- Don't change the dark theme colors or fonts
- Don't modify `public/` assets without reason
- Don't touch Python scripts in `src/data/simulators/CRAFT/` (reference only)

## Current Context

> Update this section as the project evolves.

- No active blockers
- No known critical bugs
