// Headless checks of the gameplay simulation. Run: npm run simtest
import { house } from '../src/levels/house';
import { airport } from '../src/levels/airport';
import { GameSim } from '../src/sim/game';
import type { InputState } from '../src/sim/types';

let failures = 0;
const check = (name: string, ok: boolean, info = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`);
  if (!ok) failures++;
};
const none = (): InputState => ({ left: false, right: false, up: false, down: false, jump: false });

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

function quietSim(): GameSim {
  const sim = new GameSim(house, { rng: seeded(1) });
  while (sim.phase === 'ready') sim.step(none());
  return sim;
}

// 1. A bot can climb both routes to the perch with no hazards
for (const [name, route] of [
  ['outer route', { F0: 176, F1: 40, F2: 196, F3: 28, F4: 88, F5: 140 }],
  ['middle route', { F0: 176, F1: 100, F2: 196, F3: 28, F4: 88, F5: 140 }],
] as const) {
  const sim = quietSim();
  let f = 0;
  for (; f < 5000 && sim.phase === 'play'; f++) {
    sim.son.throwTimer = 9999;
    const d = sim.dad;
    const inp = none();
    if (d.state === 'climb') inp.up = true;
    else if (d.state === 'ground' && d.seg) {
      const tx = (route as Record<string, number>)[d.seg.floor];
      if (Math.abs(d.x - tx) > 1) {
        inp.right = d.x < tx;
        inp.left = d.x > tx;
      } else inp.up = true;
    }
    sim.step(inp);
  }
  check(`bot reaches the perch (${name})`, sim.phase === 'clear', `phase=${sim.phase} after ${f} frames, dad at ${sim.dad.x.toFixed(1)},${sim.dad.y.toFixed(1)} ${sim.dad.state}`);
}

// 2. Jump arc
{
  const sim = quietSim();
  sim.son.throwTimer = 9999;
  const x0 = sim.dad.x;
  const y0 = sim.dad.y;
  let minY = y0;
  sim.step({ ...none(), right: true, jump: true });
  let frames = 0;
  while (sim.dad.state === 'jump' && frames < 100) {
    sim.son.throwTimer = 9999;
    sim.step({ ...none(), right: true });
    minY = Math.min(minY, sim.dad.y);
    frames++;
  }
  const h = y0 - minY;
  const dist = sim.dad.x - x0;
  check('jump apex ~14 px', h > 12 && h < 16, `apex ${h.toFixed(1)} px`);
  check('jump length ~30 px, ~32 frames', dist > 26 && dist < 36 && frames > 28 && frames < 36, `${dist.toFixed(1)} px over ${frames} frames`);
}

// 3. Generous falls: walking off every down-end is survivable
for (const [floor, x, dir] of [
  ['F1', 200, 1],
  ['F2', 30, -1],
  ['F3', 200, 1],
  ['F4', 95, 1],
  ['F4', 129, -1],
  ['F5', 12, -1],
  ['F5', 212, 1],
] as const) {
  const sim = quietSim();
  const seg = sim.level.segOnFloorAt(floor, x)!;
  sim.dad.seg = seg;
  sim.dad.x = x;
  sim.dad.y = sim.level.floorSurface(floor, x)!;
  let f = 0;
  while (f < 200 && !(sim.dad.state === 'ground' && sim.dad.seg !== seg && sim.dad.seg?.floor !== floor)) {
    sim.son.throwTimer = 9999;
    sim.step({ ...none(), right: dir > 0, left: dir < 0 });
    if (sim.dad.state === 'dead') break;
    f++;
  }
  check(`walk off ${floor} end at x≈${x} is safe`, sim.dad.state !== 'dead', `landed on ${sim.dad.seg?.floor} (${sim.dad.state})`);
}

// 4. Hazards never get stuck: run long with an invincible dad
{
  const sim = new GameSim(house, { rng: seeded(42) });
  sim.killDad = () => {};
  const born = new Map<number, number>();
  let maxAge = 0;
  let thrown = 0;
  let laddered = 0;
  const seenLadder = new Set<number>();
  for (let f = 0; f < 20000; f++) {
    sim.step(none());
    for (const h of sim.hazards) {
      if (!born.has(h.id)) {
        born.set(h.id, f);
        thrown++;
      }
      if (h.state === 'ladder' && !seenLadder.has(h.id)) {
        seenLadder.add(h.id);
        laddered++;
      }
      maxAge = Math.max(maxAge, f - born.get(h.id)!);
    }
  }
  check('hazards are thrown', thrown > 50, `${thrown} thrown`);
  check('some rollers take ladders', laddered > 5, `${laddered} ladder drops`);
  check('no hazard lives longer than 30 s (nothing stuck)', maxAge < 1800, `oldest ${maxAge} frames`);
  check('bonus timer kill is reached only via killDad (stubbed)', sim.phase === 'play');
}

// 4b. Hazards travel the whole stage (they must not fly off the sides)
{
  const sim = new GameSim(house, { rng: seeded(7) });
  sim.killDad = () => {};
  const order = ['F5', 'F4', 'F3', 'F2', 'F1', 'F0'];
  const deepest = new Map<number, { kind: string; depth: number }>();
  let onPerch = 0;
  for (let f = 0; f < 20000; f++) {
    sim.step(none());
    for (const h of sim.hazards) {
      if (h.lastFloor === 'PERCH') onPerch++;
      const depth = h.lastFloor ? order.indexOf(h.lastFloor) : -1;
      const cur = deepest.get(h.id);
      if (!cur || depth > cur.depth) deepest.set(h.id, { kind: h.kind, depth });
    }
  }
  check('thrown items clear the bunk bed (none land on the perch)', onPerch === 0, `${onPerch} hazard-frames on the perch`);
  for (const kind of ['roller', 'bouncer']) {
    const all = [...deepest.values()].filter((v) => v.kind === kind);
    const low = all.filter((v) => v.depth >= order.indexOf('F2')).length;
    const pct = all.length ? Math.round((100 * low) / all.length) : 0;
    check(`most ${kind}s reach F2 or lower`, pct >= 80, `${low}/${all.length} (${pct}%)`);
  }
}

// 4c. The F4 stairwell can be jumped (it's the only way to the right-hand ladder at 204)
{
  const sim = quietSim();
  sim.son.throwTimer = 9999;
  const seg = sim.level.segOnFloorAt('F4', 96)!;
  sim.dad.seg = seg;
  sim.dad.x = 96;
  sim.dad.y = sim.level.floorSurface('F4', 96)!;
  sim.step({ ...none(), right: true, jump: true });
  for (let i = 0; i < 60 && sim.dad.state === 'jump'; i++) sim.step({ ...none(), right: true });
  check('dad can jump the F4 stairwell', sim.dad.state === 'ground' && sim.dad.seg?.floor === 'F4' && sim.dad.x > 124, `${sim.dad.state} on ${sim.dad.seg?.floor} at x=${sim.dad.x.toFixed(1)}`);
}

// 4d. Jumping off a ladder mid-climb is a safe dismount (lands on the ladder's floor alive)
for (const [lx, dirName, frames] of [[88, 'left', 30], [88, 'right', 30], [100, 'left', 15], [100, 'right', 15], [152, 'left', 30]] as const) {
  const sim = quietSim();
  sim.son.throwTimer = 9999;
  const l = sim.level.ladders.find((q) => q.x === lx)!;
  const seg = sim.level.segOnFloorAt(l.from, lx)!;
  sim.dad.seg = seg;
  sim.dad.x = lx;
  sim.dad.y = l.yBottom;
  sim.step({ ...none(), up: true }); // grab the ladder
  for (let i = 0; i < frames; i++) sim.step({ ...none(), up: true }); // climb part-way
  const startY = sim.dad.y;
  sim.step({ ...none(), [dirName]: true, jump: true });
  let f = 0;
  while (f++ < 120 && sim.dad.state !== 'ground' && sim.dad.state !== 'dead') {
    sim.son.throwTimer = 9999;
    sim.step(none());
  }
  check(`jump ${dirName} off ladder x=${lx} from ${(l.yBottom - startY).toFixed(0)} px up`, sim.dad.state === 'ground', `${sim.dad.state} on ${sim.dad.seg?.floor}`);
}

// 4e. Left/right on a ladder steps off: near an end onto that floor, partway up a safe drop
{
  const tryIt = (frames: number, dir: 'left' | 'right') => {
    const sim = quietSim();
    sim.son.throwTimer = 9999;
    const l = sim.level.ladders.find((q) => q.x === 100)!; // tallest full ladder in the house
    sim.dad.seg = sim.level.segOnFloorAt(l.from, l.x)!;
    sim.dad.x = l.x;
    sim.dad.y = l.yBottom;
    sim.step({ ...none(), up: true });
    for (let i = 0; i < frames; i++) sim.step({ ...none(), up: true });
    sim.step({ ...none(), [dir]: true });
    for (let i = 0; i < 90 && sim.dad.state !== 'ground' && sim.dad.state !== 'dead'; i++) sim.step(none());
    return { state: sim.dad.state, floor: sim.dad.seg?.floor, top: l.to, bottom: l.from };
  };
  const mid = tryIt(20, 'left');
  check('left/right mid-ladder drops safely to the floor below', mid.state === 'ground' && mid.floor === mid.bottom, `${mid.state} on ${mid.floor}`);
  const top = tryIt(40, 'right');
  check('left/right near the top steps onto the floor above', top.state === 'ground' && top.floor === top.top, `${top.state} on ${top.floor}`);
}

// 5. Bag catches from behind
{
  const sim = quietSim();
  sim.son.throwTimer = 9999;
  sim.dad.bag = { count: 0, timer: 0 };
  sim.dad.facing = 1;
  sim.hazards.push({ id: 999, kind: 'roller', variant: 0, x: sim.dad.x - 3, y: sim.dad.y, vx: 0, vy: 0, state: 'roll', dir: 1, seg: sim.dad.seg, ladder: null, spin: 0, dead: false, lastFloor: 'F0' });
  sim.step(none());
  check('bag catches a hazard from behind', sim.dad.state !== 'dead' && sim.dad.bag?.count === 1, `count=${sim.dad.bag?.count}`);
}

// 5b. Bags need a jump: walking under one does not grab it, jumping does
{
  const sim = quietSim();
  sim.son.throwTimer = 9999;
  const b = sim.bags[0];
  const seg = sim.level.segOnFloorAt('F1', b.x)!;
  sim.dad.seg = seg;
  sim.dad.x = b.x - 20;
  sim.dad.y = sim.level.floorSurface('F1', sim.dad.x)!;
  for (let i = 0; i < 40; i++) sim.step({ ...none(), right: true });
  check('walking under a bag does not grab it', !sim.dad.bag);
  sim.dad.x = b.x;
  sim.dad.y = sim.level.floorSurface('F1', b.x)!;
  sim.step({ ...none(), jump: true });
  for (let i = 0; i < 40 && !sim.dad.bag; i++) sim.step(none());
  check('jumping into a bag grabs it', !!sim.dad.bag);
}

// 6. Loop difficulty: only throw speed changes
{
  const a = new GameSim(house, { loop: 1 });
  const b = new GameSim(house, { loop: 5 });
  check('loop 5 hazards faster', b.speedMult > a.speedMult, `${a.speedMult.toFixed(2)} -> ${b.speedMult.toFixed(2)}`);
}

// ======================================================================= AIRPORT
function airportSim(seed = 3): GameSim {
  const sim = new GameSim(airport, { rng: seeded(seed) });
  while (sim.phase === 'ready') sim.step(none());
  return sim;
}
const place = (sim: GameSim, floor: string, x: number) => {
  sim.dad.seg = sim.level.segOnFloorAt(floor, x)!;
  sim.dad.x = x;
  sim.dad.y = sim.level.floorSurface(floor, x)!;
  sim.dad.state = 'ground';
};

// A1. Belts carry the dad (standing still on the F3 left belt)
{
  const sim = airportSim();
  sim.son.throwTimer = 99999;
  place(sim, 'F3', 30);
  const b = sim.belts.find((q) => q.floor === 'F3' && q.x0 === 0)!;
  const x0 = sim.dad.x;
  for (let i = 0; i < 60; i++) sim.step(none());
  const moved = sim.dad.x - x0;
  check('belt carries the dad', Math.abs(moved) > 20 && Math.sign(moved) === b.dir, `moved ${moved.toFixed(1)} px, belt dir ${b.dir}`);
}

// A2. Belts reverse on their timer, with a warning first
{
  const sim = airportSim();
  const b = sim.belts.find((q) => q.reverseEvery > 0)!;
  const d0 = b.dir;
  let warned = false;
  for (let i = 0; i < b.reverseEvery + 5; i++) {
    sim.son.throwTimer = 99999;
    sim.step(none());
    if (sim.beltWarning(b)) warned = true;
  }
  check('belt warns, then reverses', warned && b.dir === -d0, `dir ${d0} -> ${b.dir}`);
}

// A3. A red scanner blocks the dad; a green one lets him through
{
  const sim = airportSim();
  sim.son.throwTimer = 99999;
  let n = 0;
  while (!sim.gateRed(0) && n++ < 400) sim.step(none());
  const gx = airport.gates![0].x;
  place(sim, 'F1', gx - 14);
  for (let i = 0; i < 20; i++) sim.step({ ...none(), right: true });
  const blocked = sim.dad.x < gx - 8;
  while (sim.gateRed(0) && n++ < 1200) sim.step(none());
  for (let i = 0; i < 40; i++) sim.step({ ...none(), right: true });
  check('red scanner blocks, green lets through', blocked && sim.dad.x > gx + 8, `blocked=${blocked}, then x=${sim.dad.x.toFixed(0)} (gate ${gx})`);
}

// A4. Inside the X-ray tunnel nothing can hit him
{
  const sim = airportSim();
  sim.son.throwTimer = 99999;
  const tn = airport.tunnel!;
  place(sim, 'F2', (tn.x0 + tn.x1) / 2);
  sim.hazards.push({ id: 900, kind: 'roller', variant: 0, x: sim.dad.x, y: sim.dad.y, vx: 0, vy: 0, state: 'roll', dir: 1, seg: sim.dad.seg, ladder: null, spin: 0, dead: false, lastFloor: 'F2' });
  sim.step(none());
  check('X-ray tunnel shelters the dad', sim.dad.state !== 'dead' && sim.sheltered);
}

// A6. Confiscation bin cashes in the bag
{
  const sim = airportSim();
  sim.son.throwTimer = 99999;
  const bin = airport.bin!;
  place(sim, bin.floor, bin.x - 14);
  sim.dad.bag = { count: 3, timer: 0 };
  const sc = sim.score;
  for (let i = 0; i < 20; i++) sim.step({ ...none(), right: true });
  check('bin cashes in the bag (+200 each)', sim.dad.bag?.count === 0 && sim.score - sc >= 600, `+${sim.score - sc}, bag ${sim.dad.bag?.count}`);
}

// A7. Falls between airport floors are safe (into the F3 middle gap)
{
  const sim = airportSim();
  sim.son.throwTimer = 99999;
  place(sim, 'F3', 96);
  for (let i = 0; i < 80 && sim.dad.seg?.floor !== 'F2'; i++) sim.step({ ...none(), right: true });
  check('dropping through the F3 gap is safe', sim.dad.state !== 'dead' && sim.dad.seg?.floor === 'F2', `${sim.dad.state} on ${sim.dad.seg?.floor}`);
}

// A8. Hazards flow and leave (thrown items + suitcases), nothing lands on the gate
{
  const sim = new GameSim(airport, { rng: seeded(11) });
  sim.killDad = () => {};
  const born = new Map<number, number>();
  let maxAge = 0;
  let cases = 0;
  let onGate = 0;
  for (let f = 0; f < 20000; f++) {
    sim.step(none());
    for (const h of sim.hazards) {
      if (!born.has(h.id)) {
        born.set(h.id, f);
        if (h.kind === 'case') cases++;
      }
      if (h.lastFloor === 'GATE') onGate++;
      maxAge = Math.max(maxAge, f - born.get(h.id)!);
    }
  }
  check('suitcases drop from the chute', cases > 20, `${cases} suitcases`);
  check('airport hazards never get stuck', maxAge < 2400, `oldest ${maxAge} frames`);
  check('thrown items clear the gate platform', onGate === 0, `${onGate} hazard-frames on the gate`);
}

// A9. Reaching the son: he trudges off, boards, and the cycle goes on
{
  const sim = new GameSim([house, airport], { rng: seeded(5), stage: 1 });
  while (sim.phase === 'ready') sim.step(none());
  sim.son.throwTimer = 99999;
  place(sim, 'F3', 140);
  let f = 0;
  while (f++ < 200 && sim.phase === 'play') {
    sim.son.throwTimer = 99999;
    sim.step({ ...none(), up: true });
  }
  const startedBoarding = sim.phase === 'clear' && sim.son.state === 'board';
  const steps: string[] = [];
  f = 0;
  while (f++ < 3000 && sim.stage === 1) {
    sim.step(none());
    if (sim.son.state === 'board' && steps[steps.length - 1] !== sim.son.board.step) steps.push(sim.son.board.step);
  }
  check('reaching the son -> he boards the plane', startedBoarding && steps.join(',') === 'walk,tunnel,door,done', steps.join(','));
  check('after the airport: back to the house, one loop faster', sim.stage === 0 && sim.loop === 2, `stage ${sim.stage}, loop ${sim.loop}`);
}

// A11. Every airport floor is reachable: a bot with no hazards climbs to the son
{
  const sim = new GameSim(airport, { rng: seeded(9) });
  while (sim.phase === 'ready') sim.step(none());
  const route: Record<string, number> = { F0: 200, F1: 24, F2: 204, F3: 140 };
  let f = 0;
  for (; f < 6000 && sim.phase === 'play'; f++) {
    sim.son.throwTimer = 99999;
    sim.hazards = [];
    const d = sim.dad;
    const inp = none();
    if (d.state === 'climb') inp.up = true;
    else if (d.state === 'ground' && d.seg) {
      const tx = route[d.seg.floor];
      if (Math.abs(d.x - tx) > 1) {
        inp.right = d.x < tx;
        inp.left = d.x > tx;
      } else inp.up = true;
    }
    sim.step(inp);
  }
  check('bot climbs the airport to the son', sim.phase === 'clear', `phase=${sim.phase} after ${f} frames at ${sim.dad.seg?.floor} x=${sim.dad.x.toFixed(0)}`);
}

// A10. Clearing the house leads to the airport
{
  const sim = new GameSim([house, airport], { rng: seeded(6) });
  while (sim.phase === 'ready') sim.step(none());
  sim.son.throwTimer = 99999;
  place(sim, 'F5', 140);
  let f = 0;
  while (f++ < 4000 && sim.stage === 0) {
    sim.son.throwTimer = 99999;
    sim.step({ ...none(), up: true });
  }
  check('clearing the house leads to the airport', sim.stage === 1 && sim.loop === 1, `stage ${sim.stage}`);
}


console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
process.exitCode = failures ? 1 : 0;
