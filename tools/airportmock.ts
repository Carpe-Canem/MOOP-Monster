// Annotated layout mock-up of the airport stage, drawn from src/levels/airport.ts (review only).
// Run: npm run art:airport  ->  assets/preview/airport-layout.png
import { mkdirSync } from 'node:fs';
import { Raster } from './lib/raster';
import { P } from '../src/view/palette';
import { T } from '../src/config/tuning';
import { airport as A } from '../src/levels/airport';
import { Level, surfaceY } from '../src/sim/level';
import { PROPS } from '../src/art/props';
import { OBJECTS } from '../src/art/objects';
import { DAD, SON } from '../src/art/characters';
import type { SpriteDef } from '../src/view/sprites';
import { paintAirportBackdrop, paintAirliner, paintJetway, PLANE_DOOR } from '../src/view/airportBackdrop';

const ALL: Record<string, SpriteDef> = { ...PROPS, ...OBJECTS, ...DAD, ...SON };
const lv = new Level(A);
const fy = (floor: string, x: number) => Math.round(lv.floorSurface(floor, x)!);
const put = (r: Raster, key: string, x: number, y: number) => {
  const d = ALL[key];
  r.sprite(d, Math.round(x - d.rows[0].length / 2), Math.round(y - d.rows.length), 1);
};

// ---------------------------------------------------------------- the stage at native size
const g = new Raster(T.W, T.H, 0x000000ff);
const callouts: [number, number, number][] = []; // [n, x, y]
paintAirportBackdrop((x, y, w, h, c) => g.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h), c));

// ladders
for (const l of lv.ladders) {
  const lad = (y0: number, y1: number) => {
    g.rect(l.x - 4, Math.round(y0), 1, Math.round(y1 - y0), P.grey1);
    g.rect(l.x + 3, Math.round(y0), 1, Math.round(y1 - y0), P.grey1);
    for (let y = Math.round(y1) - 3; y > y0; y -= 4) g.rect(l.x - 3, y, 6, 1, P.grey2);
  };
  if (l.broken) {
    lad(l.yBottom - T.ladder.brokenClimb - 8, l.yBottom);
    lad(l.yTop, l.yTop + 7);
  } else lad(l.yTop, l.yBottom);
}
// floors: terminal tile (static) vs belts
const beltAt = (floor: string, x: number) => A.belts!.find((b) => b.floor === floor && x >= b.x0 && x < b.x1);
for (const s of lv.segs) {
  for (let x = s.x0; x < s.x1; x++) {
    const y = Math.round(surfaceY(s, x));
    if (s.floor === 'GATE') {
      g.rect(x, y, 1, 6, x % 6 < 3 ? P.grey2 : P.grey3); // accordion jet bridge
      g.rect(x, y, 1, 1, P.grey1);
      continue;
    }
    const b = beltAt(s.floor, x);
    if (b) {
      g.rect(x, y, 1, 5, P.grey3);
      // chevrons show the direction of travel
      const k = ((x - b.x0) % 8 + 8) % 8;
      if (k === (b.dir > 0 ? 3 : 4)) g.rect(x, y + 1, 1, 3, P.yellow);
      if (k === (b.dir > 0 ? 2 : 5)) {
        g.rect(x, y + 1, 1, 1, P.yellow);
        g.rect(x, y + 3, 1, 1, P.yellow);
      }
      g.rect(x, y + 5, 1, 1, P.black);
      if (x % 6 === 0) g.rect(x, y + 5, 1, 1, P.grey2); // rollers
    } else {
      g.rect(x, y, 1, 5, x % 16 === 0 ? P.grey2 : P.lavender); // terminal floor tiles
      g.rect(x, y, 1, 1, P.white);
    }
  }
}
// belt reversal beacons
for (const b of A.belts!) {
  if (!b.reverseEvery) continue;
  const bx = b.dir > 0 ? b.x1 - 4 : b.x0 + 3;
  const y = fy(b.floor, Math.min(Math.max(bx, b.x0), b.x1 - 1));
  g.rect(bx - 1, y - 4, 3, 3, P.orange);
  g.rect(bx, y - 5, 1, 1, P.yellow);
}
// X-ray tunnel with bins on the belt
const tn = A.tunnel!;
const ty = fy(tn.floor, tn.x0);
g.rect(tn.x0, ty - 18, tn.x1 - tn.x0, 18, P.grey2);
g.rect(tn.x0 + 2, ty - 16, tn.x1 - tn.x0 - 4, 15, P.navy);
g.rect(tn.x0 + 2, ty - 16, tn.x1 - tn.x0 - 4, 1, P.cyan);
for (const bx of [tn.x0 - 6, tn.x1 + 2]) {
  g.rect(bx, ty - 4, 8, 4, P.grey1);
  g.rect(bx + 1, ty - 3, 6, 2, P.grey3);
}
callouts.push([3, tn.x0 + 18, ty - 28]);
// scanner gates (one shown red, the others green)
A.gates!.forEach((gt, i) => {
  const y = fy(gt.floor, gt.x);
  const on = i !== 1;
  g.rect(gt.x - 6, y - 22, 2, 22, P.grey1);
  g.rect(gt.x + 4, y - 22, 2, 22, P.grey1);
  g.rect(gt.x - 6, y - 24, 12, 3, P.grey1);
  g.rect(gt.x - 1, y - 24, 2, 2, on ? P.green : P.red);
  if (!on) for (let yy = y - 20; yy < y; yy += 3) g.rect(gt.x - 4, yy, 8, 1, P.red); // closed: beam blocks
});
callouts.push([2, A.gates![0].x - 3, fy('F1', 72) - 34]);
// confiscation bin
const bn = A.bin!;
const by = fy(bn.floor, bn.x);
g.rect(bn.x - 5, by - 9, 10, 9, P.red);
g.rect(bn.x - 6, by - 10, 12, 2, P.redDark);
g.rect(bn.x - 3, by - 6, 6, 1, P.white);
callouts.push([4, bn.x - 2, by - 20]);
// suitcase chute: a short chute out of the left wall, just above the top belt
const ch = A.chute!;
g.rect(0, ch.y - 12, ch.x + 10, 12, P.grey2);
g.rect(0, ch.y - 12, ch.x + 10, 2, P.grey1);
g.rect(ch.x + 2, ch.y - 9, 7, 9, P.grey3); // dark mouth
g.rect(0, ch.y - 3, ch.x + 10, 1, P.orange); // hazard stripe
put(g, 'suitcase', 34, fy('F3', 34));
callouts.push([6, ch.x + 14, ch.y - 22]);
// belts callout
callouts.push([1, 40, fy('F3', 40) - 14]);
// characters, bags, son
for (const b of A.bags) put(g, 'trashEmpty', b.x, fy(b.floor, b.x) - 14);
put(g, 'suitcase', 68, fy('GATE', 68));
put(g, 'sonCalm', A.son.x, fy('GATE', A.son.x));
put(g, 'dadStand', A.dadStart.x, fy('F0', A.dadStart.x));
put(g, 'shampooH', 150, fy('F3', 150));
put(g, 'soap', 140, fy('GATE', 140) + 14);
callouts.push([7, 128, fy('GATE', 128) - 30]);
callouts.push([8, 178, 60]);
// HUD
g.text('1UP', 6, 1, 1, P.red);
g.text('000000', 6, 10, 1, P.white);
g.text('HIGH SCORE', 82, 1, 1, P.red);
g.text('020000', 94, 10, 1, P.white);
g.text('BONUS', 186, 1, 1, P.cyan);
g.text('5000', 189, 10, 1, P.cyan);
// callout badges
for (const [n, x, y] of callouts) {
  g.rect(x - 1, y - 1, 8, 10, P.yellow);
  g.text(String(n), x + 1, y, 1, P.black);
}

// ---------------------------------------------------------------- sheet: stage at 3x + legend
const S = 3;
const LEG = 640;
const sheet = new Raster(T.W * S + LEG + 48, T.H * S + 40, 0x202028ff);
for (let y = 0; y < T.H; y++)
  for (let x = 0; x < T.W; x++) {
    const i = (y * T.W + x) * 4;
    sheet.rect(20 + x * S, 20 + y * S, S, S, (g.data[i] << 16) | (g.data[i + 1] << 8) | g.data[i + 2]);
  }
const lx = 20 + T.W * S + 28;
let ly = 24;
const line = (s: string, c = 0xbcbcc4, sc = 2) => {
  sheet.text(s, lx, ly, sc, c);
  ly += sc * 10 + 4;
};
line('THE AIRPORT - LAYOUT DRAFT', 0xf8d838, 3);
ly += 6;
line('GOAL: REACH THE SON, AS IN THE HOUSE', 0x68d8f0);
line('THEN HE SLUMPS OFF AND BOARDS -> YOU WIN', 0x68d8f0);
ly += 10;
const items: [string, string[]][] = [
  ['1 BAGGAGE BELTS (F3)', ['CARRY THE DAD AND EVERYTHING ON THEM.', 'ORANGE BEACON FLASHES, THEN THEY REVERSE.']],
  ['2 SECURITY SCANNERS (F1, F2)', ['GREEN = WALK THROUGH. RED = BLOCKED.', 'EACH CYCLES ON ITS OWN TIMER.']],
  ['3 X-RAY TUNNEL (F2)', ['RIDE THE BELT THROUGH IT:', 'NOTHING THROWN CAN HIT YOU INSIDE.']],
  ['4 CONFISCATION BIN (F2)', ['WALK THE RECYCLING BAG INTO IT:', 'BONUS PER ITEM, BAG EMPTIES, KEEP GOING.']],
  ['6 SUITCASE CHUTE', ['DROPS STRAY SUITCASES ON THE BELTS:', 'BIG, SLOW, JUMPABLE. THEY RIDE DOWN.']],
  ['7 GATE + SON (THE GOAL)', ['IN FRONT OF THE DARK APRON, CLEAR OF THE', 'PLANE. TWO LADDERS UP FROM THE BELTS.']],
  ['8 JET-BRIDGE TUNNEL', ['FROM HIS PLATFORM UP TO THE PLANE DOOR.', 'ON A WIN HE TRUDGES THROUGH IT TO BOARD.']],
  ['BACKDROP', ['BIG TERMINAL WINDOW AT NIGHT: AN AIRLINER', 'WAITS AT THE GATE WITH ITS DOOR OPEN.']],
];
for (const [h, body] of items) {
  line(h, 0xf8d838);
  for (const b of body) line('  ' + b);
  ly += 6;
}
// ---------------------------------------------------------------- win sequence strip
function topScene(step: number): Raster {
  const r = new Raster(T.W, 140, 0x000000ff);
  paintAirportBackdrop((x, y, w, h, c) => r.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h), c));
  if (step === 3) {
    paintAirliner((x, y, w, h, c) => r.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h), c), false);
    paintJetway((x, y, w, h, c) => r.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h), c));
  }
  const gy = fy('GATE', 100);
  for (let x = 56; x < 164; x++) {
    r.rect(x, gy, 1, 6, x % 6 < 3 ? P.grey2 : P.grey3);
    r.rect(x, gy, 1, 1, P.grey1);
  }
  const suit = ALL.suitcase;
  r.sprite(suit, 68 - 8, gy - suit.rows.length, 1);
  if (step === 0 || step === 1) {
    // trudging right toward the tunnel; clipped where he enters it
    const key = step === 0 ? 'sonSlump1' : 'sonSlump2';
    const sx = step === 0 ? 128 : 160;
    const d = ALL[key];
    const clipped = { ...d, rows: d.rows.map((row) => [...row].map((ch, x) => (sx - 24 + x > 164 ? '.' : ch)).join('')), layer2: d.layer2 && { ...d.layer2, rows: d.layer2.rows.map((row) => [...row].map((ch, x) => (sx - 24 + x > 164 ? '.' : ch)).join('')) } };
    r.sprite(clipped, sx - 24, gy - 32, 1);
  }
  if (step === 2) {
    // a tiny figure stepping into the plane's door
    const dx = PLANE_DOOR.x + 2;
    const dy = PLANE_DOOR.y + 2;
    r.rect(dx, dy, 3, 2, P.brown);
    r.rect(dx, dy + 2, 3, 2, P.skin);
    r.rect(dx, dy + 4, 3, 3, P.blueLight);
    r.rect(dx, dy + 7, 3, 3, P.red);
  }
  if (step === 3) r.text("YOU MADE YOUR FLIGHT!", 112 - 63, 84, 1, P.yellow);
  return r;
}
const WS = 2;
const strip = new Raster(sheet.w, (140 * WS + 40) * 2 + 50, 0x202028ff);
strip.text('WIN SEQUENCE: HE SLUMPS OFF, THROUGH THE TUNNEL, ONTO THE PLANE', 20, 14, 2, 0xf8d838);
const caps = ['1 TRUDGES TO THE TUNNEL', '2 INTO THE JET BRIDGE', '3 BOARDS AT THE DOOR', '4 DOOR SHUTS. YOU WIN!'];
for (let i = 0; i < 4; i++) {
  const sc = topScene(i);
  const x0 = 20 + (i % 2) * (T.W * WS + 24);
  const y0 = 40 + Math.floor(i / 2) * (140 * WS + 40);
  for (let y = 0; y < sc.h; y++)
    for (let x = 0; x < sc.w; x++) {
      const k = (y * sc.w + x) * 4;
      strip.rect(x0 + x * WS, y0 + y * WS, WS, WS, (sc.data[k] << 16) | (sc.data[k + 1] << 8) | sc.data[k + 2]);
    }
  strip.text(caps[i], x0, y0 + 140 * WS + 8, 2, 0xbcbcc4);
}
const full = new Raster(sheet.w, sheet.h + strip.h, 0x202028ff);
full.data.set(sheet.data, 0);
full.data.set(strip.data, sheet.w * sheet.h * 4);

mkdirSync('assets/preview', { recursive: true });
await full.save('assets/preview/airport-layout.png');
console.log('wrote assets/preview/airport-layout.png');
