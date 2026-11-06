// Pure simulation types. No Phaser imports anywhere under src/sim.

export type Dir = -1 | 1;

/** A straight floor piece. (x0,y0) is its left end, (x1,y1) its right end; y is the walking surface. */
export interface Seg {
  idx: number;
  floor: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** downhill direction: +1 right, -1 left, 0 flat */
  dir: -1 | 0 | 1;
  goal: boolean;
}

export interface Ladder {
  x: number;
  from: string; // floor id at the bottom
  to: string;   // floor id at the top
  yTop: number;
  yBottom: number;
  broken: boolean;
}

export interface LevelDef {
  name: string;
  floors: { id: string; goal?: boolean; segs: [number, number, number, number][] }[];
  ladders: { x: number; from: string; to: string; broken?: boolean }[];
  bags: { floor: string; x: number }[];
  dadStart: { floor: string; x: number };
  son: { floor: string; x: number };
  /** where thrown items leave the perch */
  throwFrom: { left: number; right: number; y: number };
  /** static decoration sprites, bottom-centred on a floor */
  decor?: { key: string; floor: string; x: number }[];

  // ---- airport features (stage 2). Optional; the house uses none of them.
  /** conveyor belts: carry the dad and hazards. dir +1 right / -1 left; reverse every `reverseEvery` frames */
  belts?: { floor: string; x0: number; x1: number; dir: -1 | 1; speed: number; reverseEvery?: number }[];
  /** walk-through security scanners: block the dad while red */
  gates?: { floor: string; x: number; phase?: number }[];
  /** X-ray tunnel over a belt: inside it the dad is shielded from thrown items */
  tunnel?: { floor: string; x0: number; x1: number };
  /** confiscation bin: walk the recycling bag into it to cash in what it holds */
  bin?: { floor: string; x: number };
  /** baggage chute that drops stray suitcases onto the belts */
  chute?: { x: number; y: number; every: number };
  /** which stage art to draw */
  theme?: 'house' | 'airport';
  /** what the son does when the dad reaches him: flee upward (house) or trudge off and board (airport) */
  winStyle?: 'flee' | 'board';
  /** board win: the son trudges right to this x (into the jet bridge) */
  boardAt?: number;
  /** airborne hazards leave through the side walls when the floor below runs to that edge
   *  (flat full-width floors would otherwise trap bouncers ricocheting wall to wall) */
  hazardsExitSides?: boolean;
}

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  /** jump was pressed since the previous step */
  jump: boolean;
}
