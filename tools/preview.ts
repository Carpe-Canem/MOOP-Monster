// Renders every sprite to an enlarged review sheet: assets/preview/sprites.png
// Run: npm run art:preview
import { mkdirSync } from 'node:fs';
import { Raster } from './lib/raster';
import { validateSprite, type SpriteSet } from '../src/view/sprites';
import { PROPS } from '../src/art/props';
import { OBJECTS } from '../src/art/objects';
import { LOGO } from '../src/art/logo';
import { DAD, SON, FX } from '../src/art/characters';

const SETS: [string, SpriteSet][] = [['DAD', DAD], ['SON', SON], ['FX', FX], ['LOGO', LOGO], ['OBJECTS', OBJECTS], ['PROPS', PROPS]];

const S = 4; // pixel scale
const PAD = 12;
const SHEET_W = 1400;

// lay out
type Cell = { key: string; x: number; y: number };
const cells: Cell[] = [];
let x = PAD;
let y = PAD + 24;
let rowH = 0;
for (const [, set] of SETS) {
  for (const [key, def] of Object.entries(set)) {
    const w = Math.max(def.rows[0].length * S, key.length * 12);
    const h = def.rows.length * S + 22;
    if (x + w > SHEET_W - PAD) {
      x = PAD;
      y += rowH + PAD;
      rowH = 0;
    }
    cells.push({ key, x, y });
    x += w + PAD * 2;
    rowH = Math.max(rowH, h);
  }
}
const H = y + rowH + PAD;
const r = new Raster(SHEET_W, H, 0x202028ff);
r.text('MOOP SPRITES', PAD, PAD, 2, 0xf8d838);

const all = Object.assign({}, ...SETS.map(([, s]) => s)) as SpriteSet;
let problems = 0;
for (const c of cells) {
  const def = all[c.key];
  const w = def.rows[0].length;
  const h = def.rows.length;
  r.rect(c.x - 1, c.y - 1, w * S + 2, h * S + 2, 0x000000);
  r.sprite(def, c.x, c.y, S);
  r.text(c.key, c.x, c.y + h * S + 6, 2, 0xbcbcc4);
  for (const issue of validateSprite(c.key, def)) {
    console.warn('WARN', issue);
    problems++;
  }
}

mkdirSync('assets/preview', { recursive: true });
await r.save('assets/preview/sprites.png');
console.log(`wrote assets/preview/sprites.png (${cells.length} sprites${problems ? `, ${problems} rule problems` : ''})`);
