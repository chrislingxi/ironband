import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const source = join(root, '.selftest');
const out = join(root, 'docs/screenshots/v4');
const files = [
  ['iphone-portrait-title.png', 'title-portrait.png'],
  ['iphone-portrait-hud.png', 'gameplay-portrait.png'],
  ['iphone-landscape-hud.png', 'gameplay-landscape.png'],
  ['iphone-portrait-combat.png', 'combat-portrait.png'],
  ['iphone-landscape-combat.png', 'combat-landscape.png'],
  ['iphone-portrait-背包装备.png', 'inventory-portrait.png'],
  ['iphone-portrait-技能树.png', 'skills-portrait.png'],
];

mkdirSync(out, { recursive: true });
for (const [from, to] of files) {
  const input = join(source, from);
  if (!existsSync(input)) throw new Error(`Missing QA screenshot: ${input}. Run npm run selftest:ui first.`);
  copyFileSync(input, join(out, to));
}
writeFileSync(join(out, 'README.md'), [
  '# Ironband V4 Visual QA Captures',
  '',
  'These captures are promoted from the deterministic device-matrix UI self-test.',
  'Regenerate with `npm run selftest:ui && npm run assets:v4-screenshots`.',
  '',
  ...files.map(([, to]) => `- \`${to}\``),
  '',
].join('\n'));
console.log(`Published ${files.length} V4 QA screenshots to docs/screenshots/v4`);
