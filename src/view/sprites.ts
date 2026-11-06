// Sprites are stored as text grids (one char per pixel, '.' = transparent) with a small
// legend mapping chars to master-palette colours. They become Phaser textures at boot.
import type Phaser from 'phaser';
import { P, type ColorName } from './palette';

export interface SpriteDef {
  colors: Record<string, ColorName>;
  rows: string[];
  /** optional second 3-colour layer drawn on top (large characters only) */
  layer2?: { colors: Record<string, ColorName>; rows: string[] };
  /** colour limit per layer; default 3 (era-style). Raised for 'slightly modernized' art. */
  maxColors?: number;
}

export type SpriteSet = Record<string, SpriteDef>;

const MAX_COLORS = 3;

function hex(c: number): string {
  return '#' + c.toString(16).padStart(6, '0');
}

function paint(ctx: CanvasRenderingContext2D, colors: Record<string, ColorName>, rows: string[]): void {
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.' || ch === ' ') return;
      const name = colors[ch];
      if (!name) throw new Error(`Sprite char '${ch}' has no colour`);
      ctx.fillStyle = hex(P[name]);
      ctx.fillRect(x, y, 1, 1);
    });
  });
}

/** Checks a sprite against the era-style rules; returns problems (empty = OK). */
export function validateSprite(key: string, def: SpriteDef): string[] {
  const issues: string[] = [];
  const check = (colors: Record<string, ColorName>, rows: string[], label: string) => {
    const used = new Set<string>();
    rows.forEach((r) => [...r].forEach((ch) => ch !== '.' && ch !== ' ' && used.add(colors[ch] ?? `?${ch}`)));
    const max = def.maxColors ?? MAX_COLORS;
    if (used.size > max) issues.push(`${key}${label}: ${used.size} colours (max ${max}): ${[...used].join(', ')}`);
    const w = rows[0]?.length ?? 0;
    rows.forEach((r, i) => r.length !== w && issues.push(`${key}${label}: row ${i} is ${r.length} wide, expected ${w}`));
  };
  check(def.colors, def.rows, '');
  if (def.layer2) check(def.layer2.colors, def.layer2.rows, ' (layer 2)');
  return issues;
}

export function registerSprites(scene: Phaser.Scene, sets: SpriteSet[]): void {
  for (const set of sets) {
    for (const [key, def] of Object.entries(set)) {
      if (scene.textures.exists(key)) continue;
      for (const issue of validateSprite(key, def)) console.warn('[sprites]', issue);
      const canvas = document.createElement('canvas');
      canvas.width = def.rows[0].length;
      canvas.height = def.rows.length;
      const ctx = canvas.getContext('2d')!;
      paint(ctx, def.colors, def.rows);
      if (def.layer2) paint(ctx, def.layer2.colors, def.layer2.rows);
      scene.textures.addCanvas(key, canvas);
    }
  }
}

/** Swap a sprite's colours (e.g. shampoo vs lotion share one shape). */
export function recolor(def: SpriteDef, colors: Record<string, ColorName>): SpriteDef {
  return { ...def, colors };
}
