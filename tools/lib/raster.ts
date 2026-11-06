// Tiny RGBA raster helpers shared by the art tools (Node only).
import sharp from 'sharp';
import { P } from '../../src/view/palette';
import { GLYPHS } from '../../src/view/glyphs';
import type { SpriteDef } from '../../src/view/sprites';

export class Raster {
  readonly data: Uint8ClampedArray;
  constructor(
    readonly w: number,
    readonly h: number,
    fill = 0x000000ff,
  ) {
    this.data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) this.data.set([(fill >>> 24) & 255, (fill >>> 16) & 255, (fill >>> 8) & 255, fill & 255], i * 4);
  }

  rect(x: number, y: number, w: number, h: number, rgb: number, a = 255): void {
    for (let yy = Math.max(0, y); yy < Math.min(this.h, y + h); yy++)
      for (let xx = Math.max(0, x); xx < Math.min(this.w, x + w); xx++) this.data.set([(rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255, a], (yy * this.w + xx) * 4);
  }

  /** Draw a sprite def at (x,y) scaled by s. */
  sprite(def: SpriteDef, x: number, y: number, s: number): void {
    const layer = (colors: SpriteDef['colors'], rows: string[]) =>
      rows.forEach((row, ry) =>
        [...row].forEach((ch, rx) => {
          if (ch === '.' || ch === ' ') return;
          this.rect(x + rx * s, y + ry * s, s, s, P[colors[ch]]);
        }),
      );
    layer(def.colors, def.rows);
    if (def.layer2) layer(def.layer2.colors, def.layer2.rows);
  }

  /** Draw text in the game's own pixel font. */
  text(str: string, x: number, y: number, s: number, rgb = 0xffffff): void {
    [...str.toUpperCase()].forEach((ch, i) => {
      const g = GLYPHS[ch] ?? GLYPHS['?'];
      g.split(' ').forEach((row, ry) => [...row].forEach((p, rx) => p === '#' && this.rect(x + (i * 6 + rx) * s, y + ry * s, s, s, rgb)));
    });
  }

  async save(file: string): Promise<void> {
    await sharp(Buffer.from(this.data.buffer), { raw: { width: this.w, height: this.h, channels: 4 } }).png().toFile(file);
  }
}

export const PALETTE = Object.entries(P).map(([name, rgb]) => ({ name, r: (rgb >> 16) & 255, g: (rgb >> 8) & 255, b: rgb & 255 }));

/** Nearest master-palette colour (weighted RGB distance). */
export function nearest(r: number, g: number, b: number): string {
  let best = PALETTE[0];
  let bd = Infinity;
  for (const p of PALETTE) {
    const rm = (r + p.r) / 2;
    const d = (2 + rm / 256) * (r - p.r) ** 2 + 4 * (g - p.g) ** 2 + (2 + (255 - rm) / 256) * (b - p.b) ** 2;
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best.name;
}

export const luminance = (name: string) => {
  const p = PALETTE.find((q) => q.name === name)!;
  return 0.299 * p.r + 0.587 * p.g + 0.114 * p.b;
};
