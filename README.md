# Mutants Game Data Sync v2.0

Complete refactored parser for syncing Mutants: Genetic Gladiators game data.

## Features

✅ **Full Synchronization** - Fetch localization, parse XML, process stats
✅ **Stats-Only Mode** - Update only stat calculations without re-fetching localization
✅ **Error Handling** - Robust retry logic with exponential backoff
✅ **Type Safety** - Full TypeScript support with type definitions
✅ **Structured Logging** - Detailed performance timing and debug info
✅ **No Backups** - Pure data-driven parsing (no dependency on backup files)

## Installation

```bash
npm install
```

## Usage

### Full Synchronization (Default)

Fetches Russian localization, game definitions XML, parses everything, and generates JSON files for all rating tiers.

```bash
npx tsx scripts/sync-mutants.ts
```

**Time:** ~2.7s
**Output:** 5 JSON files (normal, bronze, silver, gold, platinum)

### Stats-Only Mode

Updates only stat calculations (base_stats, abilities, level formulas) while preserving other data.
Useful for:
- Debugging stat formulas
- Iterating on calculations without re-fetching large files
- Faster updates when only game balance changes

```bash
npx tsx scripts/sync-mutants.ts --stats-only
```

**Time:** ~2.4s (faster than full sync)
**Preserves:** image paths, ability names, lore, bingo data

## Architecture

### Modules

| File | Purpose |
|------|---------|
| `sync-mutants.ts` | Main entry point with CLI handling |
| `config.ts` | Centralized configuration (URLs, paths, multipliers) |
| `types.ts` | TypeScript type definitions |
| `logger.ts` | Structured logging with performance timers |
| `fetcher.ts` | Network requests with retry logic (3 attempts, 1s backoff) |
| `parser.ts` | XML parsing and specimen filtering |
| `processor.ts` | Stats calculation and mutant processing |
| `fileio.ts` | JSON file I/O operations |
| `utils.ts` | Helper utilities (type guards, ID normalization, etc.) |

### Data Flow

```
FULL SYNC:
┌─────────────────┐
│ Fetch Loc & XML │
└────────┬────────┘
         │
┌────────▼────────┐
│  Parse XML      │
│  Find Specimens │
└────────┬────────┘
         │
┌────────▼────────┐
│ Process Ratings │
│  Calculate     │
│   Stats        │
└────────┬────────┘
         │
┌────────▼────────┐
│  Save JSON      │
│  5 Files       │
└─────────────────┘

STATS ONLY:
┌──────────────────┐
│ Load Existing    │
│ JSON Files       │
└────────┬─────────┘
         │
┌────────▼──────────┐
│ Fetch XML         │
│ (new stats only)  │
└────────┬──────────┘
         │
┌────────▼──────────┐
│ Merge Stats       │
│ (preserve image,  │
│  attack names)    │
└────────┬──────────┘
         │
┌────────▼──────────┐
│  Save Updated     │
│  JSON Files       │
└──────────────────┘
```

## Configuration

Edit `config.ts` to customize:

```typescript
urls: {
  localizationRu: 'https://...',      // Russian localization
  gameDefinitions: 'https://...',     // Game XML
}

paths: {
  dataDir: 'src/data/mutants',        // Output directory
  publicDir: 'public',                // Public assets
}

ratings: ['normal', 'bronze', 'silver', 'gold', 'platinum']

multipliers: {                        // Stats multipliers per rating
  normal: 1.0,
  bronze: 1.1,
  silver: 1.3,
  gold: 1.75,
  platinum: 2.0,
}

fetch: {
  timeout: 30000,                     // Request timeout
  retries: 3,                         // Number of retries
  retryDelay: 1000,                   // Delay between retries
}
```

## Stats Calculations

### Base Formula
```
finalStat = base * multiplier * (level / 10 + 0.9)
```

### Attack Stats (with threshold)
```
For level < threshold:  atk = atk1_base
For level >= threshold: atk = atk1p_base (plus version)

Threshold: 10 for attack 1, 15 for attack 2
```

### Abilities
```
ability_value = attack_stat * (ability_pct / 100)
Calculated at level 1 and level 30 for each ability
```

## Error Handling

- **Network errors:** Auto-retry 3 times with 1s exponential backoff
- **XML parsing:** Detailed error messages with line info
- **File I/O:** Graceful handling with fallbacks
- **Type validation:** Safe parsing with fallback values (NaN → 0)

## Logging

```bash
# Standard output
npx tsx scripts/sync-mutants.ts

# Debug mode (includes timing details)
DEBUG=1 npx tsx scripts/sync-mutants.ts

# Example output:
[✓] Fetched Russian localization
[✓] Parsed 20110 localization entries
[✓] fetchLocalization: 1341ms
[✓] Processed 708 mutants for normal rating
[✓] saveAll: 86ms
[✓] ✓ Full synchronization completed successfully!
```

## Performance

### Full Sync Times

| Step | Time |
|------|------|
| Fetch localization | ~1300ms |
| Fetch XML | ~800ms |
| Parse XML | ~400ms |
| Process 5 ratings × 708 mutants | ~80ms |
| Save 5 JSON files | ~90ms |
| **Total** | **~2700ms** |

### Stats-Only Times

| Step | Time |
|------|------|
| Fetch localization | ~1100ms |
| Fetch XML | ~900ms |
| Parse & merge 5 ratings | ~100ms |
| Save 5 JSON files | ~80ms |
| **Total** | **~2400ms** |

## Output Format

Each JSON file contains array of mutants:

```json
{
  "id": "specimen_a_01_bronze",
  "name": "Робот",
  "genes": ["A", "B"],
  "rarity": "default",
  "base_stats": {
    "hp_base": 1819,
    "atk1_base": 274,
    "lvl1": { "hp": 1819, "atk1": 274, ... },
    "lvl30": { "hp": 7094, "atk1": 1611, ... }
  },
  "abilities": [
    { "name": "ability_shield", "pct": 20, ... }
  ],
  "type": "default",
  "orbs": { "normal": 3, "special": 2 },
  "bingo": ["tournament"],
  "name_attack1": "Щит",
  "name_attack2": "Удар",
  "name_lore": "Описание...",
  "star": "bronze",
  "multiplier": 1.1
}
```

## Troubleshooting

### "No specimen descriptors found"
→ XML structure changed or server returned different format
→ Check `CONFIG.urls.gameDefinitions`

### "Failed to fetch after 3 attempts"
→ Network issue or CDN is down
→ Check internet connection and URLs

### Stats calculations incorrect
→ Verify formulas in `processor.ts:calculateLevelScale()`
→ Check multipliers in `config.ts`

### Memory issues with large data
→ Process is single-threaded and memory efficient
→ If issues persist, check Node.js version (v18+ recommended)

## Development

```bash
# Type check
npx tsc --noEmit scripts/*.ts

# Run with DEBUG
DEBUG=1 npx tsx scripts/sync-mutants.ts

# Run stats-only
npx tsx scripts/sync-mutants.ts --stats-only
```

## Version History

**v2.0 (Current)**
- ✅ Complete refactor with modular architecture
- ✅ Removed backup file dependency
- ✅ Added stats-only sync mode
- ✅ Improved error handling with retry logic
- ✅ Full TypeScript support
- ✅ Structured logging with timers

**v1.0 (Legacy)**
- Monolithic script with backup dependency
- No stats-only mode
- Basic error handling

---

**Last Updated:** 2026-01-25
**Maintained by:** Claude Code
