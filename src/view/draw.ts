// Static stage art: ladders, shelves and the bunk bed.
import type Phaser from 'phaser';
import { T } from '../config/tuning';
import { surfaceY, type Level } from '../sim/level';
import { P } from './palette';

type G = Phaser.GameObjects.Graphics;

function px(g: G, color: number, x: number, y: number, w = 1, h = 1): void {
  g.fillStyle(color, 1);
  g.fillRect(Math.round(x), Math.round(y), w, h);
}

// ---------------------------------------------------------------- level
/** Static stage art: ladders (graphics) + shelf/bed tiles (images). Drawn once. */
export function drawLevel(scene: Phaser.Scene, g: G, level: Level): void {
  // ladders first so shelves cover their ends
  for (const l of level.ladders) {
    const x = l.x;
    const ladder = (y0: number, y1: number) => {
      y0 = Math.round(y0);
      y1 = Math.round(y1);
      px(g, P.tan, x - 4, y0, 1, y1 - y0);
      px(g, P.tan, x + 3, y0, 1, y1 - y0);
      px(g, P.brown, x - 3, y0, 1, y1 - y0); // inner shadow
      for (let y = y1 - 3; y > y0; y -= 4) {
        px(g, P.tan, x - 3, y, 6, 1);
        px(g, P.brown, x - 3, y + 1, 6, 1);
      }
    };
    if (!l.broken) {
      ladder(l.yTop, l.yBottom);
    } else {
      ladder(l.yBottom - T.ladder.brokenClimb - 8, l.yBottom);
      ladder(l.yTop, l.yTop + 7);
    }
  }

  for (const s of level.segs) {
    const tile = s.goal ? 'bed' : 'shelf';
    if (s.goal) {
      // bunk-bed posts with knobs
      const y = Math.round(s.y0);
      for (const x of [s.x0, s.x1 - 2]) {
        px(g, P.purple, x, y - 14, 2, 26);
        px(g, P.lavender, x, y - 16, 2, 2);
      }
    }
    for (let x = s.x0, i = 0; x < s.x1; x += 8, i++) {
      const w = Math.min(8, s.x1 - x);
      const y = Math.round(surfaceY(s, x + w / 2));
      const img = scene.add.image(x, y, tile).setOrigin(0, 0);
      if (w < 8) img.setCrop(0, 0, w, 6);
      if (!s.goal && i % 4 === 1) scene.add.image(x + 2, y + 6, 'bracket').setOrigin(0, 0);
    }
  }
}
