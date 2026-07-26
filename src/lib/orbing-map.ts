import orbingData from '@/data/mutants/orbing.json';

export interface OrbingData {
  rows: string[][];
}

// Данные лежат в orbing.json (обновляется через ".сфера" в telegram-webhook.ts
// через GitHub Contents API - коммитить кусок TS оттуда сильно хрупче JSON).
export const orbingMap: Record<string, OrbingData> = orbingData as Record<string, OrbingData>;
