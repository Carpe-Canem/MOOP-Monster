import type { LevelDef } from '../sim/types';

// Stage 2 — "The Airport". Bottom to top, the journey through the terminal:
//   F0      terminal floor (start, bottom-left)
//   F1      SECURITY: two walk-through scanners that cycle green/red
//   F2      SECURITY: X-ray belt through a tunnel (shelter), a third scanner, confiscation bin
//   F3      BAGGAGE: two belts that reverse, fed by a suitcase chute; a gap in the middle
//   GATE    the son's platform (the goal, as in the house). Reach him and he slumps off through
//           the jet-bridge tunnel and boards the plane.
// Routes: full ladders alternate ends, so every floor (and its scanners) has to be crossed.
// Floors are flat (a modern building) and 28 px apart, so every drop between them is a safe fall.

export const airport: LevelDef = {
  name: 'THE AIRPORT',
  theme: 'airport',
  winStyle: 'board',
  hazardsExitSides: true,
  boardAt: 178, // win sequence: the son walks off the gate's right end into the jet-bridge tunnel
  floors: [
    { id: 'F0', segs: [[0, 242, 224, 242]] },
    { id: 'F1', segs: [[0, 214, 224, 214]] },
    { id: 'F2', segs: [[0, 186, 212, 186]] }, // ends short on the right: items drop to F1
    { id: 'F3', segs: [[0, 158, 100, 158], [124, 158, 224, 158]] },
    { id: 'GATE', goal: true, segs: [[56, 130, 164, 130]] },
  ],
  ladders: [
    { x: 200, from: 'F0', to: 'F1' },
    { x: 48, from: 'F0', to: 'F1', broken: true },

    { x: 24, from: 'F1', to: 'F2' }, // through both F1 scanners to get here
    { x: 196, from: 'F1', to: 'F2', broken: true },

    { x: 204, from: 'F2', to: 'F3' }, // past the bin, through the X-ray tunnel and a scanner
    { x: 60, from: 'F2', to: 'F3', broken: true },

    { x: 140, from: 'F3', to: 'GATE' }, // up to the son: ride the right belt over to it...
    { x: 84, from: 'F3', to: 'GATE' }, // ...or jump the gap to the left one
  ],
  belts: [
    { floor: 'F2', x0: 84, x1: 140, dir: 1, speed: 0.5 }, // the X-ray belt
    { floor: 'F3', x0: 0, x1: 100, dir: 1, speed: 0.5, reverseEvery: 420 },
    { floor: 'F3', x0: 124, x1: 224, dir: -1, speed: 0.5, reverseEvery: 420 },
  ],
  gates: [
    { floor: 'F1', x: 72, phase: 0 },
    { floor: 'F1', x: 156, phase: 90 },
    { floor: 'F2', x: 176, phase: 45 },
  ],
  tunnel: { floor: 'F2', x0: 88, x1: 136 },
  bin: { floor: 'F2', x: 40 },
  chute: { x: 14, y: 150, every: 840 }, // a suitcase every 14 s, out of the left wall onto F3
  bags: [
    { floor: 'F1', x: 112 },
    { floor: 'F3', x: 30 },
  ],
  dadStart: { floor: 'F0', x: 16 },
  son: { floor: 'GATE', x: 104 },
  throwFrom: { left: 87, right: 121, y: 100 },
  decor: [{ key: 'suitcase', floor: 'GATE', x: 66 }], // left end, clear of the ladders
};
