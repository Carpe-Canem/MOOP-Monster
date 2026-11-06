// Turns a Leonardo concept image into a starting-point pixel sprite on the MOOP palette.
//
//   npm run art:pixelize -- <image> --w 16 --h 16 [--colors 3] [--name dadIdle] [--out assets/pixel] [--bg black]
//   --bg <palette colour>: treat that colour as background too (e.g. a black backdrop)
//
// Steps: key out a flat background (if the image has no transparency) -> trim -> fit into
// w×h (bottom-centred) -> each target pixel takes the most common palette colour in its
// source block -> keep the N most-used colours -> write a SpriteDef snippet + a preview PNG.
// The result is a STARTING POINT: final pixels are placed by hand.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { Raster, luminance, nearest } from './lib/raster';
import type { SpriteDef } from '../src/view/sprites';
import type { ColorName } from '../src/view/palette';

const args = process.argv.slice(2);
const opt = (k: string, d?: string) => {
  const i = args.indexOf('--' + k);
  return i >= 0 ? args[i + 1] : d;
};
const input = args.find((a) => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--'));
if (!input) {
  console.error('usage: npm run art:pixelize -- <image> --w 16 --h 16 [--colors 3] [--name key] [--out dir]');
  process.exit(1);
}
const TW = Number(opt('w', '16'));
const TH = Number(opt('h', '16'));
const NCOL = Number(opt('colors', '3'));
const name = opt('name', path.basename(input, path.extname(input)).replace(/\W+/g, '_'))!;
const outDir = opt('out', 'assets/pixel')!;
const bgColor = opt('bg');

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const px = (x: number, y: number) => data.subarray((y * W + x) * 4, (y * W + x) * 4 + 4);

// 1. background key if there is no real transparency (use the corner colour)
let hasAlpha = false;
for (let i = 3; i < data.length; i += 4) if (data[i] < 250) { hasAlpha = true; break; }
if (!hasAlpha) {
  const c = px(0, 0);
  const [br, bg, bb] = [c[0], c[1], c[2]];
  for (let i = 0; i < data.length; i += 4) {
    if (Math.abs(data[i] - br) + Math.abs(data[i + 1] - bg) + Math.abs(data[i + 2] - bb) < 60) data[i + 3] = 0;
  }
}

// 2. trim to opaque bounds
let x0 = W, y0 = H, x1 = -1, y1 = -1;
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++)
    if (px(x, y)[3] > 128) {
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
if (x1 < 0) throw new Error('image is empty after background removal');
const bw = x1 - x0 + 1;
const bh = y1 - y0 + 1;

// 3. fit (keep aspect), bottom-centred
const scale = Math.max(bw / TW, bh / TH);
const fw = Math.min(TW, Math.round(bw / scale));
const fh = Math.min(TH, Math.round(bh / scale));
const ox = Math.floor((TW - fw) / 2);
const oy = TH - fh;

// 4. block-majority sampling onto the palette
const grid: (string | null)[][] = Array.from({ length: TH }, () => Array(TW).fill(null));
for (let ty = 0; ty < fh; ty++) {
  for (let tx = 0; tx < fw; tx++) {
    const sx0 = x0 + Math.floor(tx * scale), sx1 = x0 + Math.max(Math.floor((tx + 1) * scale), Math.floor(tx * scale) + 1);
    const sy0 = y0 + Math.floor(ty * scale), sy1 = y0 + Math.max(Math.floor((ty + 1) * scale), Math.floor(ty * scale) + 1);
    const votes = new Map<string, number>();
    let opaque = 0, total = 0;
    for (let y = sy0; y < Math.min(sy1, H); y++)
      for (let x = sx0; x < Math.min(sx1, W); x++) {
        total++;
        const p = px(x, y);
        if (p[3] <= 128) continue;
        opaque++;
        const n = nearest(p[0], p[1], p[2]);
        votes.set(n, (votes.get(n) ?? 0) + 1);
      }
    if (bgColor) {
      opaque -= votes.get(bgColor) ?? 0;
      votes.delete(bgColor);
    }
    if (opaque / total < 0.5 || votes.size === 0) continue;
    grid[oy + ty][ox + tx] = [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }
}

// 5. reduce to the N most used colours
const usage = new Map<string, number>();
grid.flat().forEach((c) => c && usage.set(c, (usage.get(c) ?? 0) + 1));
const keep = [...usage.entries()].sort((a, b) => b[1] - a[1]).slice(0, NCOL).map(([c]) => c);
const closestKept = (c: string) => keep.reduce((best, k) => (Math.abs(luminance(k) - luminance(c)) < Math.abs(luminance(best) - luminance(c)) ? k : best), keep[0]);
const sorted = [...keep].sort((a, b) => luminance(a) - luminance(b)); // dark -> light
const chars = 'abcdefgh';
const legend: Record<string, ColorName> = {};
sorted.forEach((c, i) => (legend[chars[i]] = c as ColorName));
const charOf = (c: string) => chars[sorted.indexOf(keep.includes(c) ? c : closestKept(c))];
const rows = grid.map((row) => row.map((c) => (c ? charOf(c) : '.')).join(''));
const def: SpriteDef = { colors: legend, rows };

// 6. outputs
mkdirSync(outDir, { recursive: true });
const snippet = `  ${name}: {\n    colors: ${JSON.stringify(legend).replace(/"(\w)":/g, '$1: ').replace(/"/g, "'").replace(/,/g, ', ')},\n    rows: [\n${rows.map((r) => `      '${r}',`).join('\n')}\n    ],\n  },\n`;
writeFileSync(path.join(outDir, `${name}.ts.txt`), snippet);

const S = 10;
const thumbH = TH * S;
const thumb = await sharp(input).resize({ height: thumbH }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const prev = new Raster(thumb.info.width + TW * S + 30, thumbH + 20, 0x202028ff);
for (let y = 0; y < thumb.info.height; y++)
  for (let x = 0; x < thumb.info.width; x++) {
    const i = (y * thumb.info.width + x) * 4;
    if (thumb.data[i + 3] > 0) prev.data.set([thumb.data[i], thumb.data[i + 1], thumb.data[i + 2], 255], ((y + 10) * prev.w + x + 10) * 4);
  }
prev.sprite(def, thumb.info.width + 20, 10, S);
await prev.save(path.join(outDir, `${name}.preview.png`));

console.log(snippet);
console.log(`colours: ${sorted.join(', ')}  (dropped: ${[...usage.keys()].filter((c) => !keep.includes(c)).join(', ') || 'none'})`);
console.log(`wrote ${path.join(outDir, name + '.ts.txt')} and ${name}.preview.png`);
