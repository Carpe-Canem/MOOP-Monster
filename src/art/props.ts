// Hand-pixeled house pieces (shelves, bunk bed, suitcase). Original art.
// The thrown toiletries and the recycling bag live in objects.ts.
import type { SpriteSet } from '../view/sprites';

export const PROPS: SpriteSet = {
  // ---- stray suitcase (airport hazard): hard-shell case on wheels
  luggage: {
    maxColors: 4,
    colors: { o: 'navy', b: 'blue', l: 'blueLight', g: 'grey1' },
    rows: [
      '....gggg....',
      '....g..g....',
      'oooooooooooo',
      'obllbbbbbbbo',
      'oblbbbbbbbbo',
      'obbbbbbbbbbo',
      'oooooooooooo',
      'obbbbbbbbbbo',
      'oooooooooooo',
      '.g........g.',
    ],
  },

  // ---- house pieces
  shelf: {
    colors: { L: 'woodLight', W: 'wood', B: 'brown' },
    rows: [
      'LLLLLLLL',
      'WWWWWWWW',
      'WWBWWWWW',
      'WWWWWWBW',
      'WWWWWWWW',
      'BBBBBBBB',
    ],
  },
  bracket: {
    colors: { B: 'brown', W: 'wood' },
    rows: [
      'BBBB',
      '.BWB',
      '..BB',
      '...B',
    ],
  },
  bed: {
    colors: { W: 'white', L: 'lavender', P: 'purple' },
    rows: [
      'WWWWWWWW',
      'LLLLLLLL',
      'LLLLLLLL',
      'PPPPPPPP',
      'PPPPPPPP',
      'PPPPPPPP',
    ],
  },
  suitcase: {
    colors: { o: 'brownDark', r: 'red', c: 'cream' },
    rows: [
      '...c.....cc.....',
      '..ccc.c.cccc.c..',
      '.occcccccccccco.',
      '.oooooooooooooo.',
      '.orrrrrrrrrrrro.',
      '.orrrrroorrrrro.',
      '.orrrrrrrrrrrro.',
      '.oooooooooooooo.',
      '.orrrrrrrrrrrro.',
      '.orrrrrrrrrrrro.',
      '.oooooooooooooo.',
      '..o..........o..',
    ],
  },
};

/**
 * Tumble frame for a rolling bottle. 8 rotation steps from 3 key frames + flips.
 * Rolling right tumbles clockwise, rolling left anticlockwise.
 */
export function bottleFrame(variant: number, spin: number, dir: number): { key: string; flipX: boolean; flipY: boolean } {
  const base = variant === 0 ? 'shampoo' : 'lotion';
  const k = Math.floor(spin / 3) % 8;
  const step = dir > 0 ? (8 - k) % 8 : k;
  const table: [string, boolean, boolean][] = [
    ['H', false, false], // cap right
    ['D', false, false], // up-right
    ['V', false, false], // up
    ['D', true, false], // up-left
    ['H', true, false], // left
    ['D', true, true], // down-left
    ['V', false, true], // down
    ['D', false, true], // down-right
  ];
  const [f, fx, fy] = table[step];
  return { key: base + f, flipX: fx, flipY: fy };
}
