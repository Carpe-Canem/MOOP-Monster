import type { LevelDef } from '../sim/types';

// Stage 1 — "The House". Original layout (DESIGN.md §5):
//  - the son stands top-centre on a bunk-bed perch and throws to BOTH sides
//  - F5 is a peaked roof-beam that splits his throws left and right
//  - F4 is a "V" with a stairwell gap in the middle that funnels everything down
//  - F3 is one long shelf; its left half is a breather
//  - F2 is two shelves with a 4 px stair-landing step
//  - F1 sends hazards right; F0 is the flat living-room floor
// Segment = [xLeft, yLeft, xRight, yRight]; y is the surface the feet stand on.

export const house: LevelDef = {
  name: 'THE HOUSE',
  floors: [
    { id: 'F0', segs: [[0, 242, 224, 242]] },
    { id: 'F1', segs: [[0, 208, 208, 216]] },
    { id: 'F2', segs: [[24, 182, 120, 178], [120, 174, 224, 170]] },
    { id: 'F3', segs: [[0, 140, 208, 148]] },
    { id: 'F4', segs: [[0, 112, 100, 118], [124, 118, 224, 112]] },
    { id: 'F5', segs: [[8, 90, 112, 84], [112, 84, 216, 90]] },
    { id: 'PERCH', goal: true, segs: [[64, 56, 152, 56]] },
  ],
  // Full ladders alternate sides so every floor has to be crossed; broken ladders are bait
  // (and rollers can still drop down them). The F4 stairwell can be jumped (24 px gap).
  ladders: [
    { x: 176, from: 'F0', to: 'F1' },
    { x: 64, from: 'F0', to: 'F1', broken: true },

    { x: 40, from: 'F1', to: 'F2' },
    { x: 100, from: 'F1', to: 'F2' },
    { x: 152, from: 'F1', to: 'F2', broken: true },

    { x: 196, from: 'F2', to: 'F3' },
    { x: 104, from: 'F2', to: 'F3', broken: true },

    { x: 28, from: 'F3', to: 'F4' },
    { x: 180, from: 'F3', to: 'F4', broken: true },

    { x: 88, from: 'F4', to: 'F5' },
    { x: 204, from: 'F4', to: 'F5' },
    { x: 160, from: 'F4', to: 'F5', broken: true },

    { x: 140, from: 'F5', to: 'PERCH' },
  ],
  // Bags hang out of reach of a standing dad: jump into one to grab it.
  bags: [
    { floor: 'F1', x: 128 },
    { floor: 'F4', x: 56 },
  ],
  dadStart: { floor: 'F0', x: 16 },
  son: { floor: 'PERCH', x: 104 },
  // items leave from the son's raised hand and arc out past the bunk bed
  throwFrom: { left: 87, right: 121, y: 26 },
  decor: [{ key: 'suitcase', floor: 'PERCH', x: 72 }],
};
