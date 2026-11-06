// Drawing for the airport stage.
//  - static: night window + airliner + jet bridge, terminal floors, ladders, bin, chute -> one texture
//  - dynamic (every frame): moving belts + beacons, scanners, the gate platform, bins riding the
//    X-ray belt, the X-ray tunnel housing (drawn in front, so he hides inside), and the plane
//    door during the win sequence
import Phaser from 'phaser';
import { T } from '../config/tuning';
import { surfaceY, type Level } from '../sim/level';
import type { GameSim } from '../sim/game';
import { P } from './palette';
import { paintAirportBackdrop, PLANE_DOOR } from './airportBackdrop';

const KEY = 'airportStatic';

/** Builds the static airport picture as a texture (once per game). */
export function airportStaticImage(scene: Phaser.Scene, level: Level): Phaser.GameObjects.Image {
  if (!scene.textures.exists(KEY)) {
    const c = document.createElement('canvas');
    c.width = T.W;
    c.height = T.H;
    const ctx = c.getContext('2d')!;
    const rect = (x: number, y: number, w: number, h: number, color: number) => {
      ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
      ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    };
    paintAirportBackdrop(rect);
    const def = level.def;
    // ladders (metal service ladders)
    for (const l of level.ladders) {
      const lad = (y0: number, y1: number) => {
        rect(l.x - 4, y0, 1, y1 - y0, P.grey1);
        rect(l.x + 3, y0, 1, y1 - y0, P.grey1);
        for (let y = Math.round(y1) - 3; y > y0; y -= 4) rect(l.x - 3, y, 6, 1, P.grey2);
      };
      if (l.broken) {
        lad(l.yBottom - T.ladder.brokenClimb - 8, l.yBottom);
        lad(l.yTop, l.yTop + 7);
      } else lad(l.yTop, l.yBottom);
    }
    // terminal floors (belt stretches are drawn live, over these)
    for (const s of level.segs) {
      if (s.goal) continue; // the gate platform is drawn live
      for (let x = s.x0; x < s.x1; x++) {
        const y = Math.round(surfaceY(s, x));
        rect(x, y, 1, 5, x % 16 === 0 ? P.grey2 : P.lavender);
        rect(x, y, 1, 1, P.white);
        rect(x, y + 5, 1, 1, P.purpleDark);
      }
    }
    // confiscation bin
    if (def.bin) {
      const by = level.floorSurface(def.bin.floor, def.bin.x)!;
      rect(def.bin.x - 5, by - 9, 10, 9, P.red);
      rect(def.bin.x - 6, by - 10, 12, 2, P.redDark);
      rect(def.bin.x - 3, by - 6, 6, 1, P.white);
      rect(def.bin.x - 3, by - 4, 6, 1, P.white);
    }
    // suitcase chute out of the left wall
    if (def.chute) {
      const ch = def.chute;
      rect(0, ch.y - 12, ch.x + 10, 12, P.grey2);
      rect(0, ch.y - 12, ch.x + 10, 2, P.grey1);
      rect(ch.x + 2, ch.y - 9, 7, 9, P.grey3);
      rect(0, ch.y - 3, ch.x + 10, 1, P.orange);
    }
    scene.textures.addCanvas(KEY, c);
  }
  return scene.add.image(0, 0, KEY).setOrigin(0, 0).setDepth(0);
}

/** Per-frame airport drawing: `back` sits behind the actors, `front` in front of them. */
export function drawAirportDynamic(back: Phaser.GameObjects.Graphics, front: Phaser.GameObjects.Graphics, sim: GameSim): void {
  const lv = sim.level;
  const def = lv.def;
  const f = sim.frame;
  const px = (g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, c: number, a = 1) =>
    g.fillStyle(c, a).fillRect(Math.round(x), Math.round(y), w, h);

  // ---- belts: moving chevrons show direction and speed; beacon flashes before a reversal
  for (const b of sim.belts) {
    const y = Math.round(lv.floorSurface(b.floor, b.x0)!);
    px(back, b.x0, y, b.x1 - b.x0, 5, P.grey3);
    px(back, b.x0, y + 5, b.x1 - b.x0, 1, P.black);
    const shift = Math.floor((f * b.speed) % 8);
    for (let x = b.x0 - 8; x < b.x1 + 8; x += 8) {
      const cx = b.dir > 0 ? x + shift : x - shift;
      if (cx < b.x0 || cx + 2 > b.x1) continue;
      const tip = b.dir > 0 ? cx + 1 : cx;
      const tail = b.dir > 0 ? cx : cx + 1;
      px(back, tip, y + 2, 1, 1, P.yellow);
      px(back, tail, y + 1, 1, 1, P.yellow);
      px(back, tail, y + 3, 1, 1, P.yellow);
    }
    for (let x = b.x0; x < b.x1; x += 6) px(back, x + ((f >> 3) % 2), y + 5, 1, 1, P.grey2);
    if (b.reverseEvery) {
      const bx = b.dir > 0 ? b.x1 - 5 : b.x0 + 2;
      const on = sim.beltWarning(b) && (f >> 3) % 2 === 0;
      px(back, bx, y - 4, 3, 3, on ? P.yellow : P.orange, on ? 1 : 0.6);
    }
  }

  // ---- X-ray belt bins riding along, and the tunnel housing in front (he hides inside)
  const tn = def.tunnel;
  if (tn) {
    const y = Math.round(lv.floorSurface(tn.floor, tn.x0)!);
    const belt = sim.belts.find((b) => b.floor === tn.floor && b.x0 <= tn.x0 && b.x1 >= tn.x1);
    if (belt) {
      const span = belt.x1 - belt.x0;
      for (let k = 0; k < 2; k++) {
        const bx = belt.x0 + ((f * belt.speed + k * (span / 2)) % span);
        px(back, bx, y - 4, 8, 4, P.grey1);
        px(back, bx + 1, y - 3, 6, 2, P.grey3);
      }
    }
    const a = sim.sheltered ? 0.75 : 1;
    px(front, tn.x0, y - 18, tn.x1 - tn.x0, 18, P.grey2, a);
    px(front, tn.x0 + 2, y - 16, tn.x1 - tn.x0 - 4, 14, P.navy, a);
    px(front, tn.x0 + 2, y - 16, tn.x1 - tn.x0 - 4, 1, P.cyan, a);
    px(front, tn.x0 + 2, y - 2, 3, 2, P.grey3, a);
    px(front, tn.x1 - 5, y - 2, 3, 2, P.grey3, a);
    // a scan line sweeping through
    px(front, tn.x0 + 3 + ((f >> 1) % (tn.x1 - tn.x0 - 6)), y - 15, 1, 12, P.cyan, 0.35 * a);
  }

  // ---- security scanners: arch + status light; when red, beams block the way
  def.gates?.forEach((g, i) => {
    const y = Math.round(lv.floorSurface(g.floor, g.x)!);
    const red = sim.gateRed(i);
    px(back, g.x - 6, y - 20, 2, 20, P.grey1);
    px(back, g.x + 4, y - 20, 2, 20, P.grey1);
    px(back, g.x - 6, y - 22, 12, 3, P.grey1);
    px(back, g.x - 1, y - 22, 2, 2, red ? P.red : P.green);
    if (red) for (let yy = y - 18; yy < y; yy += 3) px(front, g.x - 4, yy, 8, 1, P.red, (f >> 2) % 2 ? 1 : 0.6);
  });

  // ---- the gate platform (the son's perch, the goal)
  const gate = lv.segs.find((sg) => sg.goal);
  if (gate) {
    const y = Math.round(gate.y0);
    for (let x = gate.x0; x < gate.x1; x++) {
      px(back, x, y, 1, 6, x % 6 < 3 ? P.grey2 : P.grey3);
      px(back, x, y, 1, 1, P.grey1);
    }
  }

  // ---- plane door during the win: a tiny figure boards, then the door shuts
  const b = sim.son.state === 'board' ? sim.son.board : null;
  if (b && b.step === 'door') {
    const dx = PLANE_DOOR.x + 2;
    const dy = PLANE_DOOR.y + 1;
    px(front, dx, dy, 3, 2, P.brown);
    px(front, dx, dy + 2, 3, 2, P.skin);
    px(front, dx, dy + 4, 3, 3, P.blueLight);
    px(front, dx, dy + 7, 3, 3, P.red);
  }
  if (b && b.step === 'done') {
    const d = PLANE_DOOR;
    px(front, d.x, d.y, d.w, d.h, 0x8e8ea6);
    px(front, d.x, d.y, 1, d.h, 0x262636);
    px(front, d.x + d.w - 1, d.y, 1, d.h, 0x262636);
    px(front, d.x, d.y, d.w, 1, 0x262636);
    px(front, d.x, d.y + 7, d.w, 1, 0x2a4a9c);
  }
}
