
import fs from 'fs';
import path from 'path';

const orbsData = JSON.parse(fs.readFileSync('src/data/materials/orbs.json', 'utf8'));
const normalData = JSON.parse(fs.readFileSync('src/data/mutants/normal.json', 'utf8'));

const orbsMap = new Map(orbsData.map(orb => [orb.name, orb.id]));

const mutantOrbs = {
  "Гидридра": {
    rows: [
      ['Здоровье 25%', 'Здоровье 25%', 'Атака 14%', 'Спец. Скорость 18%'],
      ['Здоровье 25%', 'Здоровье 25%', 'Атака 14%', 'Спец. Усиление 26%'],
      ['Здоровье 25%', 'Здоровье 25%', 'Здоровье 25%', 'Спец. Усиление 26%']
    ]
  },
  "Док Живодер": {
    rows: [
        ['Здоровье 25%', 'Здоровье 25%', 'Атака 14%', 'Спец. Скорость 18%'],
        ['Здоровье 25%', 'Здоровье 25%', 'Атака 14%', 'Спец. Усиление 26%'],
        ['Здоровье 25%', 'Здоровье 25%', 'Здоровье 25%', 'Спец. Усиление 26%']
    ]
  },
  "Архитектор": {
    rows: [
        ['Здоровье 25%', 'Здоровье 25%', 'Атака 14%', 'Спец. Скорость 18%'],
        ['Здоровье 25%', 'Здоровье 25%', 'Атака 14%', 'Спец. Усиление 26%'],
        ['Здоровье 25%', 'Здоровье 25%', 'Здоровье 25%', 'Спец. Усиление 26%']
    ]
  },
  "Оскверненный священник": {
    rows: [
        ['Здоровье 25%', 'Здоровье 25%', 'Атака 14%', 'Спец. Скорость 18%'],
        ['Здоровье 25%', 'Здоровье 25%', 'Атака 14%', 'Спец. Усиление 26%'],
        ['Здоровье 25%', 'Здоровье 25%', 'Здоровье 25%', 'Спец. Усиление 26%']
    ]
  },
  "Владыка Свечей": {
    rows: [
        ['Здоровье 25%', 'Здоровье 25%', 'Атака 14%', 'Спец. Скорость 18%'],
        ['Здоровье 25%', 'Здоровье 25%', 'Атака 14%', 'Спец. Усиление 26%'],
        ['Здоровье 25%', 'Здоровье 25%', 'Здоровье 25%', 'Спец. Усиление 26%']
    ]
  }
};

const output = [];
output.push("export interface OrbingData {");
output.push("  rows: string[][];");
output.push("}");
output.push("");
output.push("export const orbingMap: Record<string, OrbingData> = {");

for (const name in mutantOrbs) {
  const mutant = normalData.find(m => m.name === name);
  if (mutant) {
    const orbConfig = mutantOrbs[name];
    const newRows = orbConfig.rows.map(row => {
      return row.map(orbName => {
        const orbId = orbsMap.get(orbName);
        if (orbId) {
          const type = orbId.includes('special') ? 'special' : 'basic';
          return `${type}/${orbId}.webp`;
        }
        return '';
      });
    });

    const rowsString = JSON.stringify(newRows, null, 2).replace(/"/g, "'").replace(/\n/g, "\n    ");
    output.push(`  // ${name}`);
    output.push(`  '${mutant.id}': {`);
    output.push(`    rows: ${rowsString}`);
    output.push(`  },`);
  }
}

output.push("};");

fs.writeFileSync('src/lib/orbing-map.ts', output.join('\n'));

console.log('orbing-map.ts generated successfully.');
