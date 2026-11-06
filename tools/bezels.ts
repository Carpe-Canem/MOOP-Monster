// Renders a still game frame (no browser needed) and bezel-art mockups around it.
// Run: npm run art:bezels  ->  assets/preview/frame.png, assets/preview/bezel-*.png
import { mkdirSync } from 'node:fs';
import { Raster } from './lib/raster';
import { P } from '../src/view/palette';
import { T } from '../src/config/tuning';
import { house } from '../src/levels/house';
import { Level, surfaceY } from '../src/sim/level';
import { PROPS } from '../src/art/props';
import { OBJECTS } from '../src/art/objects';
import { DAD, SON } from '../src/art/characters';
import type { SpriteDef } from '../src/view/sprites';

const ALL: Record<string, SpriteDef> = { ...PROPS, ...OBJECTS, ...DAD, ...SON };

/** Draw a sprite bottom-centred at (x, y), like the game's SpriteLayer. */
function put(r: Raster, key: string, x: number, y: number, s = 1): void {
  const d = ALL[key];
  r.sprite(d, Math.round(x - (d.rows[0].length * s) / 2), Math.round(y - d.rows.length * s), s);
}

// ---------------------------------------------------------------- a game frame (224x256)
function gameFrame(): Raster {
  const r = new Raster(T.W, T.H, 0x000000ff);
  const level = new Level(house);
  for (const l of level.ladders) {
    const lad = (y0: number, y1: number) => {
      y0 = Math.round(y0);
      y1 = Math.round(y1);
      r.rect(l.x - 4, y0, 1, y1 - y0, P.tan);
      r.rect(l.x + 3, y0, 1, y1 - y0, P.tan);
      r.rect(l.x - 3, y0, 1, y1 - y0, P.brown);
      for (let y = y1 - 3; y > y0; y -= 4) {
        r.rect(l.x - 3, y, 6, 1, P.tan);
        r.rect(l.x - 3, y + 1, 6, 1, P.brown);
      }
    };
    if (l.broken) {
      lad(l.yBottom - T.ladder.brokenClimb - 8, l.yBottom);
      lad(l.yTop, l.yTop + 7);
    } else lad(l.yTop, l.yBottom);
  }
  for (const s of level.segs) {
    if (s.goal) {
      const y = Math.round(s.y0);
      for (const x of [s.x0, s.x1 - 2]) {
        r.rect(x, y - 14, 2, 26, P.purple);
        r.rect(x, y - 16, 2, 2, P.lavender);
      }
    }
    for (let x = s.x0, i = 0; x < s.x1; x += 8, i++) {
      const y = Math.round(surfaceY(s, x + 4));
      r.sprite(ALL[s.goal ? 'bed' : 'shelf'], x, y, 1);
      if (!s.goal && i % 4 === 1) r.sprite(ALL.bracket, x + 2, y + 6, 1);
    }
  }
  put(r, 'suitcase', 72, 56);
  put(r, 'sonThrow', 104, 56);
  put(r, 'shampooV', 121.5, 28); // held up in his fist, as in the game
  const f = (fl: string, x: number) => level.floorSurface(fl, x)!;
  put(r, 'trashEmpty', 128, f('F1', 128) - 14);
  put(r, 'trashEmpty', 56, f('F4', 56) - 14);
  put(r, 'lotionH', 150, f('F3', 150));
  put(r, 'shampooD', 60, f('F5', 60));
  put(r, 'soap', 170, f('F2', 170) - 6);
  put(r, 'shadesFront', 120, f('F4', 112) + 16);
  put(r, 'dadWalk1', 92, f('F1', 92));
  r.text('1UP', 6, 1, 1, P.red);
  r.text('004300', 6, 10, 1, P.white);
  r.text('HIGH SCORE', 82, 1, 1, P.red);
  r.text('020000', 94, 10, 1, P.white);
  r.text('BONUS', 186, 1, 1, P.cyan);
  r.text('3900', 189, 10, 1, P.cyan);
  r.text('L=01', 192, 24, 1, P.white);
  r.rect(6, 24, 5, 2, P.grey2);
  r.rect(6, 26, 5, 4, P.skin);
  return r;
}

// ---------------------------------------------------------------- mockup helpers
const Z = 3; // zoom used in the mockups (game pixel = 3 screen pixels)
const W = 1600;
const H = 800;
const GX = Math.round((W - T.W * Z) / 2);
const GY = Math.round((H - T.H * Z) / 2);

function blit(dst: Raster, src: Raster, x0: number, y0: number, s: number): void {
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      const i = (y * src.w + x) * 4;
      const c = (src.data[i] << 16) | (src.data[i + 1] << 8) | src.data[i + 2];
      dst.rect(x0 + x * s, y0 + y * s, s, s, c);
    }
}

function dim(c: number, f: number): number {
  return (Math.round(((c >> 16) & 255) * f) << 16) | (Math.round(((c >> 8) & 255) * f) << 8) | Math.round((c & 255) * f);
}

/** A sprite drawn darkened (for background decals). */
function decal(r: Raster, key: string, x: number, y: number, s: number, f: number): void {
  const d = ALL[key];
  const layer = (colors: SpriteDef['colors'], rows: string[]) =>
    rows.forEach((row, ry) => [...row].forEach((ch, rx) => ch !== '.' && r.rect(x + rx * s, y + ry * s, s, s, dim(P[colors[ch]], f))));
  layer(d.colors, d.rows);
  if (d.layer2) layer(d.layer2.colors, d.layer2.rows);
}

function screenFrame(r: Raster): void {
  // dark bezel lip around the picture
  const pad = 14;
  r.rect(GX - pad, GY - pad, T.W * Z + pad * 2, T.H * Z + pad * 2, 0x101014);
  r.rect(GX - 4, GY - 4, T.W * Z + 8, T.H * Z + 8, 0x26262e);
}

// ---------------------------------------------------------------- A: bathroom tiles
function bezelTiles(frame: Raster): Raster {
  const r = new Raster(W, H, 0x000000ff);
  const tile = 16 * Z;
  for (let y = 0; y < H; y += tile)
    for (let x = 0; x < W; x += tile) {
      const shade = ((x / tile + y / tile) % 2 === 0 ? 0.42 : 0.36);
      r.rect(x, y, tile, tile, dim(P.cyanDark, shade));
      r.rect(x, y, tile, Z, dim(P.navy, 0.6));
      r.rect(x, y, Z, tile, dim(P.navy, 0.6));
      r.rect(x + Z * 2, y + Z * 2, Z * 3, Z, dim(P.cyan, 0.45)); // glaze highlight
    }
  const items: [string, number, number][] = [
    ['shampooV', 120, 90], ['soap', 300, 210], ['lotionD', 150, 420], ['shadesFront', 330, 560], ['trashFull', 110, 640],
    ['lotionV', 1420, 110], ['shampooD', 1290, 300], ['shadesSide', 1440, 450], ['soap', 1300, 610], ['shampooH', 1460, 690],
  ];
  for (const [k, x, y] of items) decal(r, k, x, y, Z * 2, 0.55);
  screenFrame(r);
  blit(r, frame, GX, GY, Z);
  return r;
}

// ---------------------------------------------------------------- B: arcade cabinet side art
function bezelCabinet(frame: Raster): Raster {
  const r = new Raster(W, H, 0x000000ff);
  r.rect(0, 0, W, H, 0x120a24);
  const stripes = [P.red, P.yellow, P.cyan];
  for (const side of [0, 1]) {
    const x0 = side === 0 ? GX - 70 : GX + T.W * Z + 40;
    stripes.forEach((c, i) => r.rect(x0 + i * 10, 0, 6, H, dim(c, 0.8)));
  }
  // vertical MOOP logos
  const logo = (x: number) =>
    [...'MOOP'].forEach((ch, i) => {
      r.text(ch, x + 4, 92 + i * 150, 18, 0x8c1810);
      r.text(ch, x, 88 + i * 150, 18, P.yellow);
    });
  logo(150);
  logo(W - 150 - 90);
  decal(r, 'dadStand', 60, H - 16 * 7 - 30, 7, 1);
  decal(r, 'sonCalm', W - 48 * 4 - 40, H - 32 * 4 - 30, 4, 1);
  screenFrame(r);
  blit(r, frame, GX, GY, Z);
  return r;
}

mkdirSync('assets/preview', { recursive: true });
const frame = gameFrame();
const big = new Raster(T.W * 3, T.H * 3, 0x000000ff);
blit(big, frame, 0, 0, 3);
await big.save('assets/preview/frame.png');
await bezelTiles(frame).save('assets/preview/bezel-a-tiles.png');
await bezelCabinet(frame).save('assets/preview/bezel-b-cabinet.png');
console.log('wrote assets/preview/frame.png, bezel-a-tiles.png, bezel-b-cabinet.png');
