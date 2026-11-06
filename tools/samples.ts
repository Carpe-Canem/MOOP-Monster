// Renders a side-by-side review sheet of current sprites vs. proposed revisions.
// Run: npm run art:samples   ->  assets/preview/samples.png
import { mkdirSync } from 'node:fs';
import { Raster } from './lib/raster';
import { validateSprite, type SpriteDef, type SpriteSet } from '../src/view/sprites';
import { PROPS } from '../src/art/props';
import { OBJECTS } from '../src/art/objects';
import { DAD, SON } from '../src/art/characters';
import { SAMPLES } from '../src/art/samples';

const ALL: SpriteSet = { ...PROPS, ...OBJECTS, ...DAD, ...SON, ...SAMPLES };

interface Group {
  label: string;
  keys: string[];
}
interface Section {
  title: string;
  scale: number;
  groups: Group[];
}


// Nothing is waiting for review right now: this sheet shows what is in the game.
// For the next revision round, add proposed sprites to src/art/samples.ts and list them here.
const objs = Object.keys(OBJECTS);
const dadKeys = ['dadStand', 'dadWalk1', 'dadWalk2', 'dadJump', 'dadClimb1', 'dadCarry1', 'dadKO'];

const SECTIONS: Section[] = [
  { title: 'OBJECTS (IN GAME)', scale: 8, groups: [{ label: 'TOILETRIES + RECYCLING BAG', keys: objs }] },
  {
    title: 'CHARACTERS (IN GAME)',
    scale: 6,
    groups: [
      { label: 'DAD', keys: dadKeys },
      { label: 'SON', keys: ['sonCalm', 'sonThrow', 'sonFlee'] },
    ],
  },
  { title: 'AT GAME SIZE (3X)', scale: 3, groups: [{ label: 'OBJECTS', keys: objs }, { label: 'DAD', keys: dadKeys }] },
];

const W = 1400;
const PAD = 14;
const TEXT = 2;

// measure + draw in one pass
const r = new Raster(W, 2600, 0x202028ff);
let y = PAD;
r.text('MOOP MONSTER - REVISION SAMPLES', PAD, y, 3, 0xf8d838);
y += 36;
let problems = 0;
for (const sec of SECTIONS) {
  r.text(sec.title, PAD, y, TEXT, 0x68d8f0);
  y += 26;
  let x = PAD;
  let rowH = 0;
  for (const grp of sec.groups) {
    const defs = grp.keys.map((k) => {
      const d = ALL[k];
      if (!d) throw new Error('missing sprite ' + k);
      return d as SpriteDef;
    });
    const gw = Math.max(defs.reduce((a, d) => a + d.rows[0].length * sec.scale + 6, 0), grp.label.length * 12);
    const gh = Math.max(...defs.map((d) => d.rows.length * sec.scale)) + 26;
    if (x + gw > W - PAD) {
      x = PAD;
      y += rowH + PAD;
      rowH = 0;
    }
    r.text(grp.label, x, y, TEXT, 0xbcbcc4);
    let sx = x;
    defs.forEach((d, i) => {
      const w = d.rows[0].length * sec.scale;
      const h = d.rows.length * sec.scale;
      r.rect(sx - 1, y + 20 - 1, w + 2, h + 2, 0x000000);
      r.sprite(d, sx, y + 20, sec.scale);
      for (const issue of validateSprite(grp.keys[i], d)) {
        console.warn('WARN', issue);
        problems++;
      }
      sx += w + 6;
    });
    x += gw + PAD * 3;
    rowH = Math.max(rowH, gh);
  }
  y += rowH + PAD * 2;
}

// crop to used height
const out = new Raster(W, y, 0x202028ff);
out.data.set(r.data.subarray(0, W * y * 4));
mkdirSync('assets/preview', { recursive: true });
await out.save('assets/preview/samples.png');
console.log(`wrote assets/preview/samples.png${problems ? ` (${problems} rule problems)` : ''}`);
