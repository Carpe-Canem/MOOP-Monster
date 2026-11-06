// A simple autopilot for the attract-mode demo: walks a ladder route up the house and
// jumps when something is rolling at the dad. It is meant to look plausible, not to be perfect.
import type { GameSim } from './game';
import type { InputState } from './types';


/** For each floor: the x of the ladder to take next (outer route). */
const ROUTE: Record<string, number> = { F0: 176, F1: 40, F2: 196, F3: 28, F4: 88, F5: 140 };

export function botInput(sim: GameSim): InputState {
  const inp: InputState = { left: false, right: false, up: false, down: false, jump: false };
  const d = sim.dad;
  if (d.state === 'climb') {
    // near the top: wait if something is about to roll past the ladder head
    const l = d.ladder!;
    let wait = false;
    if (d.y - l.yTop < 16) {
      for (const h of sim.hazards) {
        if (h.state !== 'roll' || h.seg?.floor !== l.to) continue;
        const dx = Math.abs(h.x - l.x);
        if (dx < 13 || (dx < 26 && Math.sign(l.x - h.x) === h.dir)) wait = true; // approaching, or still overhead
      }
    }
    // something coming down this ladder at us: back down
    const above = sim.hazards.some((h) => h.state === 'ladder' && h.ladder === l && h.y < d.y);
    inp.up = !wait && !above;
    inp.down = above;
    return inp;
  }
  if (d.state !== 'ground' || !d.seg) return inp;
  const tx = ROUTE[d.seg.floor];
  if (tx === undefined) return inp;

  const dir = Math.sign(tx - d.x);
  // a bottle is coming down the ladder we want: back off uphill so it rolls away from us
  const incoming = sim.hazards.find((h) => h.state === 'ladder' && Math.abs(h.ladder!.x - tx) < 1 && h.y < d.y);
  if (incoming && Math.abs(d.x - tx) < 18) {
    const uphill = -(d.seg.dir || 1);
    inp.right = uphill > 0;
    inp.left = uphill < 0;
    return inp;
  }
  if (Math.abs(d.x - tx) > 1) {
    inp.right = dir > 0;
    inp.left = dir < 0;
  } else {
    inp.up = true;
  }

  // something coming at us on this floor? hop over it 6-11 frames before contact
  // (a jump needs about that long to lift the dad's feet clear of a bottle)
  const myV = inp.right ? 1 : inp.left ? -1 : 0;
  for (const h of sim.hazards) {
    // rollers only: jumping at a bouncer just meets it in mid-air
    const onFloor = h.kind === 'roller' && ((h.state === 'roll' && h.seg?.floor === d.seg.floor) || (h.state === 'air' && Math.abs(h.y - d.y) < 10));
    if (!onFloor) continue;
    const dx = h.x - d.x;
    const hv = h.state === 'roll' ? h.dir * 1.25 * sim.speedMult : h.vx;
    const closing = -(hv - myV) * Math.sign(dx); // px/frame the gap shrinks
    if (closing <= 0.1) continue;
    const ttc = (Math.abs(dx) - 9) / closing;
    if (ttc > 6 && ttc < 11) {
      inp.jump = true;
      inp.up = false;
      break;
    }
  }
  return inp;
}
