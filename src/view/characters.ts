// Draws the dad and son from their sprite frames, plus the son's sweat drops.
import type Phaser from 'phaser';
import type { Dad, Son } from '../sim/game';
import type { SpriteLayer } from './spriteLayer';
import { P } from './palette';

// ---------------------------------------------------------------- dad
let lastWalk = -1;
let moving = false;

export function drawDad(layer: SpriteLayer, g: Phaser.GameObjects.Graphics, d: Dad, frame: number): void {
  const flip = d.facing < 0; // sprites face right

  if (d.state === 'dead') {
    const t = d.deadTimer;
    if (t < 48) {
      // comic spin: front, back, front (mirrored), back
      const f = Math.floor(t / 6) % 4;
      const key = f % 2 === 0 ? 'dadStand' : 'dadBack';
      layer.draw(key, d.x, d.y, { flipX: f === 2 ? !flip : flip });
    } else {
      layer.draw('dadKO', d.x, d.y, { flipX: flip });
      // birdies circling his head
      for (let i = 0; i < 3; i++) {
        const a = frame * 0.12 + (i * Math.PI * 2) / 3;
        g.fillStyle(P.yellow, 1).fillRect(Math.round(d.x + Math.cos(a) * 7) - 1, Math.round(d.y - 14 + Math.sin(a) * 2), 2, 2);
      }
    }
    return;
  }

  if (d.state === 'climb') {
    layer.draw(Math.floor(d.climbAnim / 8) % 2 === 0 ? 'dadClimb1' : 'dadClimb2', d.x, d.y);
    return;
  }

  if (d.state === 'jump' || d.state === 'fall') {
    layer.draw('dadJump', d.x, d.y, { flipX: flip });
    return;
  }

  moving = d.walkAnim !== lastWalk;
  lastWalk = d.walkAnim;
  const step = Math.floor(d.walkAnim / 6) % 4;
  if (d.bag) {
    layer.draw(moving && step % 2 === 1 ? 'dadCarry2' : 'dadCarry1', d.x, d.y, { flipX: flip });
  } else {
    const key = !moving ? 'dadStand' : (['dadStand', 'dadWalk1', 'dadStand', 'dadWalk2'] as const)[step];
    layer.draw(key, d.x, d.y, { flipX: flip });
  }
}

// ---------------------------------------------------------------- son
/** Sprite throws to the LEFT; mirrored for right-hand throws. */
export function drawSon(layer: SpriteLayer, s: Son, tunnelMouthX?: number): void {
  if (s.state === 'board') {
    // airport win: a defeated trudge into the jet bridge (hidden once he's inside)
    if (s.board.step !== 'walk') return;
    const key = Math.floor(s.anim / 14) % 2 === 0 ? 'sonSlump1' : 'sonSlump2';
    layer.draw(key, s.x, s.y, { clipRightX: tunnelMouthX });
    return;
  }
  if (s.state === 'flee') {
    layer.draw('sonFlee', s.x, s.y);
    return;
  }
  const angry = s.state === 'windup' || s.angry > 0;
  if (!angry) {
    const bob = Math.floor(s.anim / 20) % 2; // calm: slow slouchy sway
    layer.draw('sonCalm', s.x, s.y + bob);
    return;
  }
  const dir = s.state === 'windup' ? s.next.dir : s.lastDir;
  layer.draw('sonThrow', s.x, s.y, { flipX: dir > 0 });
  if (s.state === 'windup') {
    // the item about to be thrown, held up in his fist
    const hx = s.x + (dir > 0 ? 17.5 : -17.5);
    const hy = s.y - 33;
    const key = s.next.kind === 'roller' ? (s.next.variant === 0 ? 'shampooV' : 'lotionV') : s.next.variant === 0 ? 'shadesFront' : 'soap';
    layer.draw(key, hx, hy, { originY: 0.5 });
  }
}

// ---------------------------------------------------------------- sweat
interface Drop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export class Sweat {
  private drops: Drop[] = [];

  /** fling n drops off his head */
  burst(s: Son, n: number): void {
    for (let i = 0; i < n; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      this.drops.push({
        x: s.x + side * (5 + Math.random() * 4),
        y: s.y - 30 + Math.random() * 4,
        vx: side * (0.5 + Math.random() * 0.9),
        vy: -1.2 - Math.random() * 0.8,
        life: 26 + Math.floor(Math.random() * 10),
      });
    }
  }

  step(): void {
    for (const d of this.drops) {
      d.x += d.vx;
      d.vy += 0.12;
      d.y += d.vy;
      d.life--;
    }
    this.drops = this.drops.filter((d) => d.life > 0);
  }

  draw(layer: SpriteLayer): void {
    for (const d of this.drops) layer.draw('sweat', d.x, d.y, { originY: 0.5 });
  }

  clear(): void {
    this.drops = [];
  }
}
