# Archivist Library (MGG Hub) - Project Context

## Project Overview

This is an Astro-based static site generator project called "Archivist Library" (MGG Hub) - a comprehensive knowledge base and toolset for the game "Mutants Genetic Gladiators". The site provides:

- **Mutant Wiki**: Database of mutants and skins
- **Simulators**: Roulette, breeding, reactor, and crafting simulators with real odds
- **Calculators**: Stats calculator and evolution resource calculator
- **Materials**: Resources, tokens, boosters, spheres, buildings, and zones
- **Bingo**: Complete list of in-game bingo events

The project uses modern web technologies including Astro, Svelte 5, Tailwind CSS, and is deployed on Vercel.

## Technology Stack

- **Framework**: [Astro](https://astro.build/) (v5.13.5) - Static Site Generator
- **UI Components**: [Svelte 5](https://svelte.dev/) - Interactive components
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with custom configurations
- **Deployment**: [Vercel](https://vercel.com/) with analytics and speed insights
- **Image Processing**: [Sharp](https://sharp.pixelplumbing.com/) for image optimization
- **Data Handling**: Excel files (xlsx), JSON, and text files for game data

## Project Structure

```
mutants_site/
├── public/                 # Static assets (images, fonts, textures)
├── src/
│   ├── assets/            # Source assets
│   ├── components/        # Reusable UI components (Astro & Svelte)
│   ├── data/              # Game data (JSON, Excel, text files)
│   ├── layouts/           # Page layouts
│   ├── lib/               # Utility functions
│   ├── pages/             # Route definitions
│   ├── styles/            # Global styles and CSS
│   └── workers/           # Web workers
├── astro.config.ts        # Astro configuration
├── package.json           # Dependencies and scripts
└── vercel.json            # Vercel deployment configuration
```

### Key Directories

- **`src/pages/`**: Contains route definitions for all major sections (mutants, simulators, evolution, materials, etc.)
- **`src/components/`**: Reusable UI elements including breeding tools, calculators, and data tables
- **`src/data/`**: Game-related data organized by category (breeding, materials, mutants, simulators)
- **`public/textures_by_mutant/`**: Image assets organized by mutant ID

## Building and Running

### Development
```bash
npm run dev
# Runs Astro development server with hot reload
```

### Production Build
```bash
npm run build
# Generates static site in dist/ directory
```

### Preview Production Build
```bash
npm run preview
# Locally preview production build
```

### Additional Scripts
```bash
npm run astro    # Direct access to Astro CLI
```

## Development Conventions

### File Naming
- Pages: Use kebab-case for routes (e.g., `evotech-calculator.astro`)
- Components: PascalCase for Svelte components, kebab-case for Astro components
- Data files: Descriptive names with appropriate extensions

### Styling
- Primary: Tailwind CSS utility classes
- Custom properties defined in `src/styles/global.css`
- Responsive design using Tailwind's breakpoints
- Dark theme as default with carefully chosen color palette

### Component Architecture
- Astro pages for static content and layout
- Svelte components for interactive elements
- Shared components in `src/components/`
- Data fetching done via Astro's static generation

### Internationalization
- Russian as primary language (with some English localization)
- Localization files in `src/data/` (localisation_ru.txt, localisation_en.txt)

## Deployment Configuration

- Deployed on Vercel with CDN asset prefixing
- Caching headers configured for static assets (1 year cache)
- CORS headers enabled for cross-origin requests
- Analytics and speed insights integration

## Special Features

- **3D Card Effects**: Interactive mutant cards with 3D tilt effects
- **Real-time Calculators**: Evolution and stats calculators
- **Simulators**: Accurate game simulation tools
- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **High-DPI Support**: Automatic scaling for 2K/4K displays
- **Image Fallbacks**: Smart image format fallback (PNG → JPG)

## Data Sources

The application pulls data from multiple sources:
- Excel files (.xlsx) for complex game data
- JSON files for structured information
- Text files for localization and base data
- Static image assets organized by game entity

## Key Integrations

- **Vercel Analytics**: Usage tracking
- **Vercel Speed Insights**: Performance monitoring
- **Tailwind CSS**: Styling framework
- **dom-to-image-more**: Image generation capabilities
