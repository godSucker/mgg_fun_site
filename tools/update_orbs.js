import fs from 'fs';
import path from 'path';

const inputFile = path.join(process.cwd(), 'src/data/materials/mut_orbs.txt');
const outputFile = path.join(process.cwd(), 'src/lib/orbing-map.ts');

const mapOrb = (ruName, isLastInRow) => {
  const name = ruName.toLowerCase().trim();
  
  // Special orbs logic
  if (isLastInRow) {
    if (name.includes('спец. скорость')) return 'special/orb_special_speed_04.webp';
    if (name.includes('спец. усиление')) return 'special/orb_special_addstrengthen_04.webp';
    if (name.includes('спец.усиление')) return 'special/orb_special_addstrengthen_04.webp';
    if (name.includes('спец. щит')) return 'special/orb_special_addshield_04.webp';
    if (name.includes('спец. контратака')) return 'special/orb_special_addretaliate_04.webp';
    if (name.includes('спец.контратака')) return 'special/orb_special_addretaliate_04.webp';
    if (name.includes('спец. регенерация') || name.includes('спец. вытягивание')) return 'special/orb_special_addregenerate_04.webp';
    if (name.includes('спец. рана')) return 'special/orb_special_addslash_04.webp';
    if (name.includes('спец. ослабление')) return 'special/orb_special_addweaken_04.webp';
    if (name.includes('спец. отражение')) return 'special/orb_special_addretaliate_04.webp';
  }

  // Basic orbs (if it's not last or if it doesn't match special criteria)
  if (name.includes('атака')) return 'basic/orb_basic_attack_04.webp';
  if (name.includes('здоровье')) return 'basic/orb_basic_life_04.webp';
  if (name.includes('усиление')) return 'basic/orb_basic_strengthen_04.webp';
  if (name.includes('щит')) return 'basic/orb_basic_shield_04.webp';
  if (name.includes('контратака')) return 'basic/orb_basic_retaliate_04.webp';
  if (name.includes('вытягивание жизни')) return 'basic/orb_basic_regenerate_04.webp';
  if (name.includes('регенерация')) return 'basic/orb_basic_regenerate_04.webp';
  if (name.includes('рана') || name.includes('кровотечение')) return 'basic/orb_basic_slash_04.webp';
  if (name.includes('крит')) return 'basic/orb_basic_critical_04.webp';
  if (name.includes('ослабление') || name.includes('проклятие')) return 'basic/orb_basic_weaken_04.webp';
  if (name.includes('опыт')) return 'basic/orb_basic_xp_04.webp';
  if (name.includes('отражение')) return 'basic/orb_basic_retaliate_04.webp';

  return 'basic/orb_slot.webp';
};

const content = fs.readFileSync(inputFile, 'utf8');
const mutants = [];

// Split by block markers
const blocks = content.split(/\]\s*\[/);

blocks.forEach((block, idx) => {
    let cleanBlock = block;
    if (!cleanBlock.startsWith('[')) cleanBlock = '[' + cleanBlock;
    if (!cleanBlock.endsWith(']')) cleanBlock = cleanBlock + ']';

    const idMatch = cleanBlock.match(/id:\s*(.*?)\r?\n/);
    const row1Match = cleanBlock.match(/row1:\s*(.*?)\r?\n/);
    const row2Match = cleanBlock.match(/row2:\s*(.*?)\r?\n/);
    const row3Match = cleanBlock.match(/row3:\s*(.*?)\r?\n/);

    if (idMatch) {
        const id = idMatch[1].toLowerCase().trim();
        const parseRow = (match) => {
            if (!match || !match[1] || match[1].trim() === '') return null;
            const parts = match[1].split(',').map(s => s.trim()).filter(Boolean);
            if (parts.length === 0) return null;
            return parts.map((orbName, index) => mapOrb(orbName, index === parts.length - 1));
        };

        const rows = [parseRow(row1Match), parseRow(row2Match), parseRow(row3Match)].filter(Boolean);
        mutants.push({ id, rows });
    }
});

let tsContent = `export interface OrbingData {
  rows: string[][];
}

export const orbingMap: Record<string, OrbingData> = {
`;

mutants.forEach(m => {
  tsContent += `  '${m.id}': {
    rows: ${JSON.stringify(m.rows, null, 2).split('\n').map((line, i) => i === 0 ? line : '    ' + line).join('\n')}
  },
`;
});

tsContent += '};\n';

fs.writeFileSync(outputFile, tsContent);
console.log('Successfully updated src/lib/orbing-map.ts');
