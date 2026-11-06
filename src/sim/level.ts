import type { Ladder, LevelDef, Seg } from './types';

export function surfaceY(s: Seg, x: number): number {
  if (s.x1 === s.x0) return s.y0;
  return s.y0 + ((s.y1 - s.y0) * (x - s.x0)) / (s.x1 - s.x0);
}

export function segContains(s: Seg, x: number): boolean {
  return x >= s.x0 && x <= s.x1;
}

export class Level {
  readonly segs: Seg[] = [];
  readonly ladders: Ladder[] = [];
  /** the lowest floor: hazards leave the screen from here */
  readonly bottomFloor: string;

  constructor(readonly def: LevelDef) {
    for (const f of def.floors) {
      for (const [x0, y0, x1, y1] of f.segs) {
        const dir = y1 > y0 ? 1 : y1 < y0 ? -1 : 0;
        this.segs.push({ idx: this.segs.length, floor: f.id, x0, y0, x1, y1, dir, goal: !!f.goal });
      }
    }
    this.bottomFloor = this.segs.reduce((lo, s) => (Math.max(s.y0, s.y1) > Math.max(lo.y0, lo.y1) ? s : lo)).floor;
    for (const l of def.ladders) {
      const top = this.floorSurface(l.to, l.x);
      const bottom = this.floorSurface(l.from, l.x);
      if (top === null || bottom === null) {
        throw new Error(`Ladder at x=${l.x} (${l.from}->${l.to}) does not touch both floors`);
      }
      this.ladders.push({ x: l.x, from: l.from, to: l.to, yTop: top, yBottom: bottom, broken: !!l.broken });
    }
  }

  segOnFloorAt(floor: string, x: number): Seg | null {
    for (const s of this.segs) if (s.floor === floor && segContains(s, x)) return s;
    return null;
  }

  floorSurface(floor: string, x: number): number | null {
    const s = this.segOnFloorAt(floor, x);
    return s ? surfaceY(s, x) : null;
  }

  /** Segment under x whose surface is within tol of y (used to walk across seams and small steps). */
  segNear(x: number, y: number, tol: number, prefer?: Seg | null): Seg | null {
    let best: Seg | null = null;
    let bestD = Infinity;
    for (const s of this.segs) {
      if (!segContains(s, x)) continue;
      const d = Math.abs(surfaceY(s, x) - y);
      if (d > tol + 0.5) continue; // slack for sloped seams
      if (d < bestD || (d === bestD && s === prefer)) {
        best = s;
        bestD = d;
      }
    }
    return best;
  }

  /** Floors are one-way: something moving down from prevY to newY lands on the highest surface crossed. */
  landing(x: number, prevY: number, newY: number): { seg: Seg; y: number } | null {
    let best: { seg: Seg; y: number } | null = null;
    for (const s of this.segs) {
      if (!segContains(s, x)) continue;
      const y = surfaceY(s, x);
      if (y >= prevY - 0.01 && y <= newY + 0.01) {
        if (!best || y < best.y) best = { seg: s, y };
      }
    }
    return best;
  }

  ladderAtBottom(x: number, y: number, snap: number, yTol: number): Ladder | null {
    let best: Ladder | null = null;
    for (const l of this.ladders) {
      if (Math.abs(l.x - x) <= snap && Math.abs(l.yBottom - y) <= yTol) {
        if (!best || Math.abs(l.x - x) < Math.abs(best.x - x)) best = l;
      }
    }
    return best;
  }

  ladderAtTop(x: number, y: number, snap: number, yTol: number): Ladder | null {
    let best: Ladder | null = null;
    for (const l of this.ladders) {
      if (l.broken) continue;
      if (Math.abs(l.x - x) <= snap && Math.abs(l.yTop - y) <= yTol) {
        if (!best || Math.abs(l.x - x) < Math.abs(best.x - x)) best = l;
      }
    }
    return best;
  }
}
