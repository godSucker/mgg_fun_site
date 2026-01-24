# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Archivist Library (MGG Hub)** - A comprehensive knowledge base and toolset for the game Mutants Genetic Gladiators. Built with Astro SSG, Svelte 5, and Tailwind CSS. The site provides:
- Mutants and skins wiki
- Breeding simulator with genetic compatibility rules
- Multiple roulette simulators (Cash, Lucky, Madness)
- Reactor/Gacha simulator
- Crafting simulator
- Stats calculator and evolution tracker
- Bingo system for mutant collections

## Commands

```bash
# Development
npm run dev              # Start dev server with hot reload

# Build
npm run build            # Build for production
npm run preview          # Preview production build

# Scripts
npx tsx scripts/sync-mutants.ts    # Sync mutant data from game servers
npx tsx scripts/deduplicate-mutants.ts
npx tsx scripts/fix-rarity.ts
```

## Architecture

### Tech Stack
- **Astro 5** - SSG framework with Svelte integration
- **Svelte 5** - Interactive components (all simulators, browsers, modals)
- **Tailwind CSS v4** - Styling via Vite plugin
- **TypeScript** - Type safety throughout
- **Sharp** - Image optimization
- **XLSX** - Excel data parsing

### Directory Structure

```
src/
├── components/        # Svelte & Astro components
│   ├── simulators/   # Game simulators (cash, lucky, madness, reactor, craft)
│   ├── breeding/     # Breeding system UI
│   └── materials/    # Materials tables
├── data/             # Static JSON data
│   ├── mutants/      # normal.json, bronze.json, silver.json, gold.json, platinum.json, skins.json
│   ├── materials/    # charms.json, orbs.json, material.json
│   └── simulators/   # Simulator-specific data
├── lib/              # Core logic & utilities
│   ├── breeding/     # Breeding calculation engine
│   ├── stats/        # Stats formulas and orb calculations
│   └── *-machine.ts  # Simulator logic files
├── pages/            # Astro routes (file-based routing)
└── layouts/          # Base layout templates

public/
├── textures_by_mutant/  # Mutant images
├── boosters/            # Charm/booster icons
├── materials/           # Material icons
└── orbs/               # Orb icons (basic/ and special/)
```

### Key Architecture Patterns

**1. Data Flow: JSON → TypeScript → Svelte**
- Mutant data stored in 5 rating tiers (normal/bronze/silver/gold/platinum)
- Each mutant has: id, name, genes, type, stats, image paths
- Data loaded at build time in Astro pages, passed as props to Svelte components

**2. Breeding System (src/lib/breeding/breeding.ts)**
The breeding logic implements complex genetic rules:
- **Gene Compatibility**: Children inherit genes from parent pool (A, B, C, D, E, F)
- **Single-gene children** (A, B): Only possible if at least one parent is pure-gene
- **Double-same genes** (AA, BB): Both parents must have that gene
- **Type Restrictions**:
  - `FORBIDDEN_TYPES`: Never breed (seasonal, videogame, boss, zodiac, gacha, special, community, event)
  - `RESTRICTED_TYPES`: Only breed if parent is same (pvp, heroic, legend)
  - `LEGEND_WHITELIST`: Legends that breed freely by genes
- **Secret Recipes**: Specific parent combos produce unique children (stored in `secretCombos.ts`)

**3. Simulator Architecture**
Each simulator follows similar pattern:
- Logic file in `src/lib/*-machine.ts` (pure functions)
- Svelte component in `src/components/simulators/*/`
- Data in `src/data/simulators/`
- Implements probability calculations and result generation

**4. Stats Calculation**
- Base stats from game data
- Multipliers per rating: normal (1.0), bronze (1.1), silver (1.3), gold (1.75), platinum (2.0)
- Level scaling: `stat * multiplier * (level/10 + 0.9)`
- Attack stats have thresholds at level 10 and 15

**5. Localization (Russian)**
All UI text is in Russian. Translation dictionaries in `src/lib/mutant-dicts.ts`:
- `GENE_RU`: Gene names (A=Киборг, B=Нежить, etc.)
- `BINGO_RU`: Bingo/morphology translations
- `TYPE_RU`: Mutant type translations
- `ABILITY_RU`: Ability translations

### Data Sync Process

The `scripts/sync-mutants.ts` script:
1. Fetches game data from Kobojo servers (XML + localization)
2. Parses mutant definitions and stats
3. Downloads/optimizes images (WebP format via Sharp)
4. Generates 5 JSON files (one per rating tier)
5. Calculates all stat variations

## Important Conventions

**Image Paths**
- Mutants: `/textures_by_mutant/{mutant_id}.webp`
- Materials: `/materials/{item_id}.webp`
- Orbs: `/orbs/basic/` and `/orbs/special/`
- Use `src/lib/mutant-textures.ts` for path resolution

**Data IDs**
- Mutant IDs often have rating suffixes: `mutant_id_bronze`, `mutant_id_gold`
- Use `baseId()` function to normalize: strips `_normal`, `_bronze`, etc.
- Skins reference base mutant ID

**Component Props**
- Pass full mutant objects, not just IDs
- Include all rating tiers when needed for comparison
- Bingo data requires `bingoIndex` array for filtering

**File Aliases**
- `@/` maps to `src/` (configured in astro.config.ts and vite.config)

## Working with Simulators

When modifying simulators:
1. Update logic in `src/lib/*-machine.ts` first
2. Test probability calculations (should sum to 100%)
3. Update component UI in `src/components/simulators/*/`
4. Verify data files in `src/data/simulators/` are current

## ESLint Configuration

The project uses ESLint flat config with:
- TypeScript-aware parsing for .astro and .svelte files
- Astro-specific rules (no-set-html-directive, no-conflict-set-directives)
- Svelte-specific rules (no-reactive-reassign, no-at-html-tags)
- Unused vars allowed with `_` prefix

Run linting: `npx eslint .`
