# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Archivist-Library (MGG Hub)** is a Russian-language knowledge base and toolset for the game "Mutants Genetic Gladiators" (MGG). The site provides:
- Wiki for mutants and skins
- Simulators for roulettes, breeding, reactor, and crafting
- Calculators for stats and evolution resources
- Materials database

**Live site:** https://www.archivist-library.com (CDN: https://cdn.archivist-library.com)

## Tech Stack

- **Astro 5** (SSG framework) with TypeScript
- **Svelte 5** for interactive components
- **Tailwind CSS 4** via Vite plugin
- **XLSX** for Excel data parsing
- **Sharp** for image optimization
- **Vercel Analytics & Speed Insights**

## Development Commands

```bash
# Start dev server (accessible on local network)
npm run dev

# Build for production (assets prefixed with CDN URL)
npm run build

# Preview production build
npm run preview

# Run Astro CLI
npm run astro

# Lint code (ESLint with Astro & Svelte support)
npx eslint .
```

The dev server runs with polling enabled and ignores Python venv directories (`.venv_orb`, `.venv`).

## Project Structure

### Entry Points & Layouts
- `src/pages/index.astro` — Homepage with navigation cards
- `src/layouts/BaseLayout.astro` — Global layout with header, mobile menu, and footer (Russian language)

### Core Features

**Mutants Browser** (`/mutants`)
- Tier-based pages: `/mutants/[tier].astro` (bronze, silver, gold, platinum, normal)
- Components: `MutantsBrowser.svelte`, `MutantCard.svelte`, `MutantModal.svelte`
- Data: `src/data/mutants/*.json`, `src/data/mutant_names.json`
- Textures: CDN-based URLs via `src/lib/mutant-textures.ts`

**Breeding Simulator** (`/simulators/breeding`)
- UI: `src/components/breeding/BreedingUI.svelte`
- Logic: `src/lib/breeding/` (engine, logic, breeding)
- XML settings: `src/data/breeding/settings.xml`
- Gene-based prediction algorithm with weighted outcomes

**Reactor/Gacha Simulator** (`/simulators/reactor`)
- Dynamic routes: `/simulators/reactor/[gachaId].astro`
- Component: `src/components/simulators/reactor/ReactorSimulator.svelte`
- Logic: `src/lib/reactor-gacha.ts`
- Data: `src/data/simulators/reactor/gacha.json`, texture mappings

**Roulette Simulators** (`/simulators/roulette`)
- Cash Machine: `src/components/simulators/cash/CashMachineSimulator.svelte` + `src/lib/cash-machine.ts`
- Lucky Slots: `src/components/simulators/lucky/LuckyMachineSimulator.svelte` + `src/lib/lucky-machine.ts`
- Madness: `src/components/simulators/madness/MutantsMadnessSimulator.svelte` + `src/lib/madness-machine.ts`

**Craft Simulator** (`/simulators/craft`)
- Component: `src/components/simulators/craft/CraftSimulator.svelte`
- Logic: `src/lib/craft-simulator.ts`
- Python reference: `src/data/simulators/CRAFT/craft.py`
- Data files: `orb.txt`, `lab.txt`, `star.txt`, `blackhole.txt`, `incentreward.txt`

**Calculators**
- Stats: `/simulators/stats` → `src/components/StatsCalculator.svelte`
  - Logic: `src/lib/stats/unified-calculator.ts`, `calculate-stats.ts`, `orbs.ts`
- Evo: `/evolution/evotech-calculator` → `src/components/EvotechCalculator.svelte`
  - Data: `src/data/evotech-data.js`

**Materials** (`/materials`)
- Pages: `index.astro`, `charms.astro`, `orbs.astro`, `material.astro`
- Component: `src/components/materials/MaterialsTable.astro`
- Data: `src/data/materials/*.json` (material, charms, orbs, buildings, zones, sources)
- Text data: `mut_orbs.txt`

**Other Features**
- Bingo: `/bingo` → data in `src/data/bingos.json`
- Top Evo: `/top-evo` → `src/components/EvoLeaderboard.svelte`, data in `src/data/evo_top.xlsx`
- Credits: `/credits` → `src/components/Developers.svelte`

### Data Layer
- Game data stored in `src/data/` as JSON, TXT, and XLSX files
- Localization: `localisation_ru.txt`, `localisation_en.txt`
- Mutant tier data: `mut_tier.xlsx`
- Base game data: `base.txt`

### Utility Libraries
- `src/lib/breed-map.ts` — Breeding combinations
- `src/lib/orbing-map.ts` — Orb mappings
- `src/lib/mutant-dicts.ts` — Mutant dictionaries
- `src/lib/secretCombos.ts` — Secret breeding combos
- `src/lib/xlsx-loader.ts` — Excel file parsing
- `src/lib/search-normalize.ts` — Search utilities
- `src/lib/bingo-textures.ts` — Bingo image mappings

## Configuration Files

### Astro (`astro.config.ts`)
- Site URL: `https://archivist-library.com`
- Assets prefix: `https://cdn.archivist-library.com`
- Prefetch enabled for faster navigation
- Svelte integration
- Alias: `@` → `./src`
- Raw text plugin for `.txt` files

### Vite (in astro.config.ts)
- Tailwind CSS plugin
- Dev server exposed on network (hosts: `.ru.tuna.am`, `.nl.tuna.am`, `.manus.computer`)
- File watching with polling (1s interval)

### ESLint (`.eslint.config.js`)
- Flat config format
- Astro parser for `.astro` files
- Svelte parser for `.svelte` files
- TypeScript support
- Rules:
  - `astro/no-set-html-directive`: error
  - `svelte/no-reactive-reassign`: error
  - No unused vars (warn, ignore `_` prefix)

### Prettier (`.prettierrc`)
```json
{ "semi": false, "singleQuote": true, "printWidth": 100 }
```

## Architecture Notes

### Component Patterns
- **Astro components** (`.astro`) for static layouts and pages
- **Svelte components** (`.svelte`) for interactive UI (simulators, calculators, browsers)
- Global styles in `src/styles/global.css`
- Component-scoped styles with responsive breakpoints (mobile < 768px, tablet 768-1023px, desktop 1024px+, 2K/4K upscaling)

### Data Flow
- Static data loaded at build time in Astro components
- Client-side data fetched/processed in Svelte components
- Simulators use TypeScript logic modules for game mechanics
- XLSX files parsed with custom loader (`xlsx-loader.ts`)

### Styling Approach
- Custom CSS in BaseLayout for header/footer/navigation
- Tailwind utilities for component styling
- Dark theme (#0d1117 background, #c9d1d9 text)
- Background image overlay with fixed positioning
- Mobile-first responsive design
- Custom font: TT Supermolot Neue

### CDN & Asset Management
- Production assets served from `cdn.archivist-library.com`
- Images: `/mutants/`, `/stars/`, `/materials/`, `/fonts/`
- Texture mappings handle dynamic URLs for mutants/skins

## Important Notes

- All user-facing content is in **Russian**
- No test files in src/ (only in node_modules)
- Python scripts in `src/data/simulators/CRAFT/` are reference implementations
- Telegram bot code in `bot/` directory (separate from web app)
- The site simulates real game mechanics with accurate probabilities
- Git history cleaned with filter-repo (evidence in `.git/filter-repo/`)
