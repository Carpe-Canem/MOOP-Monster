// Original 5×7 pixel font, packed into 6×8 cells and registered as a Phaser RetroFont.
import Phaser from 'phaser';
import { GLYPHS as G } from './glyphs';

export const FONT_KEY = 'moopfont';
export const CHAR_W = 6;
export const CHAR_H = 8;


export const FONT_CHARS = Object.keys(G).join('');

export function registerFont(scene: Phaser.Scene): void {
  if (scene.cache.bitmapFont.exists(FONT_KEY)) return;
  const perRow = 16;
  const rows = Math.ceil(FONT_CHARS.length / perRow);
  const canvas = document.createElement('canvas');
  canvas.width = perRow * CHAR_W;
  canvas.height = rows * CHAR_H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  [...FONT_CHARS].forEach((ch, i) => {
    const ox = (i % perRow) * CHAR_W;
    const oy = Math.floor(i / perRow) * CHAR_H;
    G[ch].split(' ').forEach((row, y) => {
      [...row].forEach((px, x) => {
        if (px === '#') ctx.fillRect(ox + x, oy + y, 1, 1);
      });
    });
  });
  scene.textures.addCanvas(FONT_KEY, canvas);
  const config = {
    image: FONT_KEY,
    width: CHAR_W,
    height: CHAR_H,
    chars: FONT_CHARS,
    charsPerRow: perRow,
    offset: { x: 0, y: 0 },
    spacing: { x: 0, y: 0 },
    lineSpacing: 2,
  };
  // Phaser 4: Parse returns the full cache entry ({ data, texture, frame })
  scene.cache.bitmapFont.add(FONT_KEY, Phaser.GameObjects.RetroFont.Parse(scene, config as unknown as Phaser.Types.GameObjects.BitmapText.RetroFontConfig));
}

/** Add pixel text. `scale` is a whole-number multiplier of the 8 px font. */
export function text(
  scene: Phaser.Scene,
  x: number,
  y: number,
  str: string,
  color = 0xffffff,
  scale = 1,
): Phaser.GameObjects.BitmapText {
  // RetroFont registers its size as the cell width, so size = CHAR_W * scale gives exact whole-number scaling
  const t = scene.add.bitmapText(x, y, FONT_KEY, str.toUpperCase(), CHAR_W * scale);
  t.setTint(color);
  return t;
}

/** Same as text() but centred horizontally on x. */
export function ctext(
  scene: Phaser.Scene,
  x: number,
  y: number,
  str: string,
  color = 0xffffff,
  scale = 1,
): Phaser.GameObjects.BitmapText {
  return text(scene, x, y, str, color, scale).setOrigin(0.5, 0);
}
