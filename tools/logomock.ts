// Title-screen mockups for the MOOP Monster logo options (review only).
// Reads the pixelized logos in assets/pixel/logo/*.ts.txt and lays each one out on the
// title screen at real game size. Run: npm run art:logomock -> assets/preview/logo-options.png
import { readdirSync, readFileSync, mkdirSync } from 'node:fs';
import { Raster } from './lib/raster';
import { P, type ColorName } from '../src/view/palette';
import type { SpriteDef } from '../src/view/sprites';

const DIR = 'assets/pixel/logo';
const files = readdirSync(DIR).filter((f) => f.endsWith('.ts.txt')).sort();

function parse(txt: string): SpriteDef {
  const colors: Record<string, ColorName> = {};
  const cm = /colors: \{([^}]*)\}/.exec(txt)!;
  for (const m of cm[1].matchAll(/(\w): '(\w+)'/g)) colors[m[1]] = m[2] as ColorName;
  const rows = [...txt.matchAll(/^\s+'([^']+)',$/gm)].map((m) => m[1]);
  return { colors, rows, maxColors: 8 };
}

function titleMock(logo: SpriteDef): Raster {
  const r = new Raster(224, 256, 0x000000ff);
  const w = logo.rows[0].length;
  r.sprite(logo, Math.round((224 - w) / 2), 6, 1);
  const cardY = 6 + logo.rows.length + 6;
  r.rect(26, cardY, 172, 20, P.navy);
  r.rect(26, cardY, 172, 1, P.cyan);
  r.rect(26, cardY + 19, 172, 1, P.cyan);
  r.rect(26, cardY, 1, 20, P.cyan);
  r.rect(197, cardY, 1, 20, P.cyan);
  const ctr = (s: string, y: number, c: number) => r.text(s, Math.round(112 - (s.length * 6) / 2), y, 1, c);
  ctr('MATTER OUT OF PLACE', cardY + 6, P.white);
  ctr('PRESS ENTER', cardY + 30, P.white);
  ctr('HIGH SCORES', cardY + 48, P.red);
  ['1ST  MOP  020000', '2ND  SUD  017500', '3RD  TUB  015000'].forEach((s, i) => ctr(s, cardY + 60 + i * 10, i === 0 ? P.yellow : P.white));
  ctr('ARROWS/WASD MOVE  SPACE JUMP', 236, P.grey1);
  ctr('P PAUSE  M MUTE  T SOUND TEST', 246, P.grey1);
  return r;
}

const S = 2;
const gap = 24;
const sheet = new Raster(files.length * (224 * S + gap) + gap, 256 * S + 60, 0x202028ff);
files.forEach((f, i) => {
  const mock = titleMock(parse(readFileSync(`${DIR}/${f}`, 'utf8')));
  const x0 = gap + i * (224 * S + gap);
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 224; x++) {
      const k = (y * 224 + x) * 4;
      sheet.rect(x0 + x * S, 44 + y * S, S, S, (mock.data[k] << 16) | (mock.data[k + 1] << 8) | mock.data[k + 2]);
    }
  sheet.text(f.replace('logo_', '').replace('.ts.txt', ''), x0, 16, 2, 0xf8d838);
});
mkdirSync('assets/preview', { recursive: true });
await sheet.save('assets/preview/logo-options.png');
console.log(`wrote assets/preview/logo-options.png (${files.length} options)`);
