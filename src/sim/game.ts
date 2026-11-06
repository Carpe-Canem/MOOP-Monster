// The whole gameplay simulation, framework-free. One call to step() = one 60 fps frame.
import { T } from '../config/tuning';
import { Level, segContains, surfaceY } from './level';
import type { Dir, InputState, Ladder, LevelDef, Seg } from './types';

export type DadState = 'ground' | 'jump' | 'fall' | 'climb' | 'dead';

export interface Dad {
  x: number;
  y: number;
  vx: number;
  vy: number;
  state: DadState;
  facing: Dir;
  seg: Seg | null;
  ladder: Ladder | null;
  takeoffY: number;
  coyote: number;
  jumpBuffer: number;
  walkAnim: number;
  climbAnim: number;
  bag: { count: number; timer: number } | null;
  jumpCredits: Set<number>;
  deadTimer: number;
}

export type HazardKind = 'roller' | 'bouncer' | 'case'; // case = stray suitcase (airport)

export interface Hazard {
  id: number;
  kind: HazardKind;
  variant: number; // rollers 0/1: shampoo/lotion; bouncers 0/1: sunglasses/soap; cases 0
  x: number;
  y: number;
  vx: number;
  vy: number;
  state: 'roll' | 'air' | 'ladder';
  dir: Dir;
  seg: Seg | null;
  ladder: Ladder | null;
  spin: number;
  dead: boolean;
  /** floor it last landed on (null until first landing) */
  lastFloor: string | null;
}

export interface BagPickup {
  x: number;
  y: number; // centre
  taken: boolean;
}

export interface Son {
  x: number;
  y: number; // feet
  state: 'idle' | 'windup' | 'flee' | 'board';
  /** airport win: walk to the jet bridge, inside the tunnel, seen at the plane door, door shut */
  board: { step: 'walk' | 'tunnel' | 'door' | 'done'; timer: number };
  timer: number;
  throwTimer: number;
  lastDir: Dir;
  anim: number;
  /** the next throw, decided when the windup starts so the view can show it in his hand */
  next: { dir: Dir; kind: HazardKind; variant: number };
  /** frames left of the angry face after a throw */
  angry: number;
}

export type SimEvent =
  | { type: 'points'; x: number; y: number; pts: number }
  | { type: 'sfx'; name: string }
  | { type: 'extraLife' };

export type Phase = 'ready' | 'play' | 'dying' | 'clear' | 'tally' | 'over';

export interface BeltState {
  floor: string;
  x0: number;
  x1: number;
  speed: number;
  dir: Dir;
  reverseEvery: number; // 0 = never
  timer: number;
}

export interface SimOptions {
  loop?: number;
  /** which stage of the cycle to start on (0 = house) */
  stage?: number;
  score?: number;
  lives?: number;
  rng?: () => number;
  /** attract-mode demo: the son only throws rolling bottles */
  rollersOnly?: boolean;
}

const rect = (x: number, y: number, w: number, h: number) => ({ l: x - w / 2, r: x + w / 2, t: y - h, b: y });
type Box = ReturnType<typeof rect>;
const overlap = (a: Box, b: Box) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;

export class GameSim {
  readonly levels: Level[];
  stage = 0;
  readonly rng: () => number;
  private readonly rollersOnly: boolean;

  phase: Phase = 'ready';
  phaseTimer = 0;
  frame = 0;

  loop: number;
  score: number;
  lives: number;
  bonus: number = T.bonus.start;
  private bonusTick = 0;
  private tallyWait = 0;
  private extraLifeGiven: boolean;

  dad!: Dad;
  son!: Son;
  hazards: Hazard[] = [];
  bags: BagPickup[] = [];
  events: SimEvent[] = [];
  // airport state (empty in the house)
  belts: BeltState[] = [];
  private chuteTimer = 0;
  /** true while the dad stands inside the X-ray tunnel (nothing thrown can hit him) */
  sheltered = false;

  private nextId = 1;

  /** One stage, or the whole cycle (house, airport): finishing the last stage loops back, faster. */
  constructor(defs: LevelDef | LevelDef[], opts: SimOptions = {}) {
    this.levels = (Array.isArray(defs) ? defs : [defs]).map((d) => new Level(d));
    this.rng = opts.rng ?? Math.random;
    this.rollersOnly = !!opts.rollersOnly;
    this.loop = opts.loop ?? 1;
    this.score = opts.score ?? 0;
    this.lives = opts.lives ?? T.lives;
    this.extraLifeGiven = this.score >= T.score.extraLifeAt;
    this.enterStage(Math.min(opts.stage ?? 0, this.levels.length - 1));
  }

  get level(): Level {
    return this.levels[this.stage];
  }

  /** Start a stage fresh (belts reset). */
  enterStage(i: number): void {
    this.stage = i;
    const def = this.level.def;
    this.belts = (def.belts ?? []).map((b) => ({ floor: b.floor, x0: b.x0, x1: b.x1, speed: b.speed, dir: b.dir, reverseEvery: b.reverseEvery ?? 0, timer: 0 }));
    this.chuteTimer = 0;
    this.resetAttempt();
  }

  // ---------- airport helpers ----------
  /** Horizontal push (px/frame) from a belt under (floor, x), or 0. */
  beltVx(floor: string | undefined, x: number): number {
    if (!floor) return 0;
    for (const b of this.belts) if (b.floor === floor && x >= b.x0 && x < b.x1) return b.dir * b.speed;
    return 0;
  }

  /** Is a belt about to reverse (beacon flashing)? */
  beltWarning(b: BeltState): boolean {
    return b.reverseEvery > 0 && b.timer > b.reverseEvery - T.beltWarn;
  }

  /** Security scanner i is red (blocking) at this frame? */
  gateRed(i: number, frame = this.frame): boolean {
    const g = this.level.def.gates![i];
    return (frame + (g.phase ?? 0)) % T.gate.period >= T.gate.period - T.gate.red;
  }

  /** Undo a move that would carry the dad into a red scanner on his floor. */
  private blockGates(prevX: number): void {
    const gates = this.level.def.gates;
    if (!gates) return;
    const d = this.dad;
    gates.forEach((g, i) => {
      const fy = this.level.floorSurface(g.floor, g.x);
      if (fy === null || d.y > fy + 1 || d.y < fy - 20) return; // not on this floor's walkway
      const zone = 9; // arch half-width + dad half-width
      const wasOut = Math.abs(prevX - g.x) >= zone;
      if (this.gateRed(i) && wasOut && Math.abs(d.x - g.x) < zone) d.x = prevX;
    });
  }

  // ---------- difficulty (only throws get faster, per DESIGN.md) ----------
  get speedMult(): number {
    return Math.min(T.maxSpeedMult, Math.pow(T.speedPerLoop, this.loop - 1));
  }

  private throwInterval(): number {
    const base = Math.max(T.throw.minInterval, T.throw.baseInterval * Math.pow(T.throw.perLoopMult, this.loop - 1));
    return Math.round(base + (this.rng() * 2 - 1) * T.throw.jitter);
  }

  // ---------- lifecycle ----------
  resetAttempt(): void {
    const def = this.level.def;
    const startSeg = this.level.segOnFloorAt(def.dadStart.floor, def.dadStart.x)!;
    this.dad = {
      x: def.dadStart.x,
      y: surfaceY(startSeg, def.dadStart.x),
      vx: 0,
      vy: 0,
      state: 'ground',
      facing: 1,
      seg: startSeg,
      ladder: null,
      takeoffY: 0,
      coyote: 0,
      jumpBuffer: 0,
      walkAnim: 0,
      climbAnim: 0,
      bag: null,
      jumpCredits: new Set(),
      deadTimer: 0,
    };
    const sonY = this.level.floorSurface(def.son.floor, def.son.x)!;
    this.son = {
      x: def.son.x,
      y: sonY,
      state: 'idle',
      timer: 0,
      throwTimer: T.throw.firstDelay,
      lastDir: 1,
      anim: 0,
      next: { dir: 1, kind: 'roller', variant: 0 },
      angry: 0,
      board: { step: 'walk', timer: 0 },
    };
    this.hazards = [];
    this.sheltered = false;
    this.bags = def.bags.map((b) => ({ x: b.x, y: this.level.floorSurface(b.floor, b.x)! - T.bag.hang, taken: false }));
    this.bonus = T.bonus.start;
    this.bonusTick = 0;
    this.tallyWait = 0;
    this.setPhase('ready');
  }

  private setPhase(p: Phase): void {
    this.phase = p;
    this.phaseTimer = 0;
  }

  addScore(pts: number, x?: number, y?: number): void {
    this.score += pts;
    if (x !== undefined && y !== undefined) this.events.push({ type: 'points', x, y, pts });
    if (!this.extraLifeGiven && this.score >= T.score.extraLifeAt) {
      this.extraLifeGiven = true;
      this.lives++;
      this.events.push({ type: 'extraLife' });
      this.sfx('extraLife');
    }
  }

  private sfx(name: string): void {
    this.events.push({ type: 'sfx', name });
  }

  // ---------- main step ----------
  step(inp: InputState): void {
    this.frame++;
    this.phaseTimer++;
    switch (this.phase) {
      case 'ready':
        this.son.anim++;
        if (this.phaseTimer >= T.readyFrames) this.setPhase('play');
        break;

      case 'play':
        this.updateBonus();
        this.updateAirport();
        this.updateSon();
        this.updateDad(inp);
        this.updateHazards();
        if (this.phase === 'play') this.collide();
        if (this.phase === 'play' && this.dad.state === 'ground' && this.dad.seg?.goal) {
          this.dad.bag = null;
          if (this.level.def.winStyle === 'board') {
            // airport: he gives up, trudges off through the jet bridge and boards the plane
            this.hazards = [];
            this.son.state = 'board';
            this.son.board = { step: 'walk', timer: 0 };
          } else {
            this.son.state = 'flee';
            this.son.timer = 0;
          }
          this.sfx('clear');
          this.setPhase('clear');
        }
        break;

      case 'dying':
        this.dad.deadTimer++;
        if (this.phaseTimer >= T.deathFrames) {
          this.lives--;
          if (this.lives <= 0) this.setPhase('over');
          else this.resetAttempt();
        }
        break;

      case 'clear':
        this.son.anim++;
        if (this.son.state === 'board') {
          this.updateBoarding();
          break;
        }
        this.son.timer++;
        if (this.son.timer > 30) this.son.y -= 1.5;
        if (this.phaseTimer >= T.clearFrames) this.setPhase('tally');
        break;

      case 'tally':
        if (this.bonus > 0) {
          if (this.phaseTimer % 2 === 0) {
            const t = Math.min(100, this.bonus);
            this.bonus -= t;
            this.addScore(t);
            this.sfx('tick');
          }
        } else if (++this.tallyWait > 60) {
          // short pause after the count, then the next stage (or, after the last, a faster loop)
          if (this.stage + 1 < this.levels.length) this.enterStage(this.stage + 1);
          else {
            this.loop++;
            this.enterStage(0);
          }
        }
        break;

      case 'over':
        break;
    }
  }

  /** Belts tick toward reversal; scanners beep as they turn red; the chute drops suitcases. */
  private updateAirport(): void {
    for (const b of this.belts) {
      if (!b.reverseEvery) continue;
      b.timer++;
      if (b.timer === b.reverseEvery - T.beltWarn) this.sfx('beltWarn');
      if (b.timer >= b.reverseEvery) {
        b.timer = 0;
        b.dir = (b.dir * -1) as Dir;
      }
    }
    const gates = this.level.def.gates;
    if (gates) gates.forEach((_, i) => this.gateRed(i) && !this.gateRed(i, this.frame - 1) && this.sfx('gateRed'));
    const ch = this.level.def.chute;
    if (ch && ++this.chuteTimer >= ch.every) {
      this.chuteTimer = 0;
      this.hazards.push({
        id: this.nextId++,
        kind: 'case',
        variant: 0,
        x: ch.x + 6,
        y: ch.y,
        vx: T.suitcase.speed,
        vy: 0,
        state: 'air',
        dir: 1,
        seg: null,
        ladder: null,
        spin: 0,
        dead: false,
        lastFloor: null,
      });
      this.sfx('chute');
    }
  }

  /** Airport win: trudge into the jet bridge, appear in the plane door, door shuts. */
  private updateBoarding(): void {
    const s = this.son;
    const b = s.board;
    b.timer++;
    if (b.step === 'walk') {
      s.x += T.board.walk;
      if (s.x >= (this.level.def.boardAt ?? s.x)) {
        b.step = 'tunnel';
        b.timer = 0;
      }
    } else if (b.step === 'tunnel' && b.timer >= T.board.tunnel) {
      b.step = 'door';
      b.timer = 0;
    } else if (b.step === 'door' && b.timer >= T.board.door) {
      b.step = 'done';
      b.timer = 0;
      this.sfx('doorShut');
    } else if (b.step === 'done' && b.timer >= T.board.done) {
      this.setPhase('tally');
    }
  }

  private updateBonus(): void {
    this.bonusTick++;
    if (this.bonusTick >= T.bonus.everyFrames) {
      this.bonusTick = 0;
      this.bonus = Math.max(0, this.bonus - T.bonus.step);
      if (this.bonus > 0 && this.bonus <= 1000) this.sfx('timeLow');
      if (this.bonus === 0) this.killDad();
    }
  }

  // ---------- son ----------
  private updateSon(): void {
    const s = this.son;
    s.anim++;
    if (s.angry > 0) s.angry--;
    if (s.state === 'idle') {
      s.throwTimer--;
      if (s.throwTimer <= 0) {
        s.state = 'windup';
        s.timer = T.throw.windup;
        s.next = {
          dir: this.rng() < 0.5 ? -1 : 1,
          kind: this.rng() < T.throw.bouncerShare && !this.rollersOnly ? 'bouncer' : 'roller',
          variant: this.rng() < 0.5 ? 0 : 1,
        };
        this.sfx('windup');
      }
    } else if (s.state === 'windup') {
      s.timer--;
      if (s.timer <= 0) {
        this.throwHazard();
        s.state = 'idle';
        s.angry = T.throw.angryHold;
        s.throwTimer = this.throwInterval();
      }
    }
  }

  private throwHazard(): void {
    const { dir, kind, variant } = this.son.next;
    this.son.lastDir = dir;
    const tf = this.level.def.throwFrom;
    this.hazards.push({
      id: this.nextId++,
      kind,
      variant,
      x: dir < 0 ? tf.left : tf.right,
      y: tf.y,
      vx: dir * T.throw.tossVx * this.speedMult,
      vy: -T.throw.tossVy,
      state: 'air',
      dir,
      seg: null,
      ladder: null,
      spin: 0,
      dead: false,
      lastFloor: null,
    });
    this.sfx('throw');
  }

  // ---------- dad ----------
  private updateDad(inp: InputState): void {
    const d = this.dad;
    const D = T.dad;
    if (d.state === 'dead') return;

    if (inp.jump) d.jumpBuffer = D.jumpBuffer;
    else if (d.jumpBuffer > 0) d.jumpBuffer--;

    if (d.bag) {
      d.bag.timer++;
      if (d.bag.timer >= T.bag.maxFrames) this.dropBag();
    }

    const mv = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);

    switch (d.state) {
      case 'ground': {
        if (!d.bag) {
          if (inp.up) {
            const l = this.level.ladderAtBottom(d.x, d.y, D.ladderSnap, D.ladderYTol);
            if (l) {
              this.startClimb(l, l.yBottom);
              return;
            }
          }
          if (inp.down) {
            const l = this.level.ladderAtTop(d.x, d.y, D.ladderSnap, D.ladderYTol);
            if (l) {
              this.startClimb(l, l.yTop + D.climb);
              return;
            }
          }
          if (d.jumpBuffer > 0) {
            this.startJump(mv);
            return;
          }
        }
        const prevX = d.x;
        if (mv !== 0) {
          d.facing = mv as Dir;
          d.x += mv * D.walk;
          d.walkAnim++;
          if (d.walkAnim % 12 === 0) this.sfx('step');
        }
        d.x = Math.max(D.minX, Math.min(D.maxX, d.x + this.beltVx(d.seg?.floor, d.x))); // conveyor push
        this.blockGates(prevX);
        this.followGround();
        break;
      }

      case 'fall':
        if (d.coyote > 0) {
          d.coyote--;
          if (d.jumpBuffer > 0 && !d.bag) {
            d.y = d.takeoffY;
            this.startJump(mv);
            return;
          }
        }
        this.airMove();
        break;

      case 'jump':
        this.airMove();
        break;

      case 'climb': {
        const l = d.ladder!;
        // jump off the ladder (easy dismount). Leaps in the held direction, or the way he last
        // faced. Falls are measured from the ladder's foot, so dropping to that floor is always safe.
        if (d.jumpBuffer > 0) {
          d.ladder = null;
          this.startJump(mv !== 0 ? mv : d.facing);
          d.takeoffY = Math.max(d.y, l.yBottom);
          return;
        }
        // left/right (without up/down) steps off the ladder: near either end he steps straight
        // onto that floor; partway up he lets go and drops (safely) to the ladder's floor
        if (mv !== 0 && !inp.up && !inp.down) {
          d.facing = mv as Dir;
          if (!l.broken && d.y - l.yTop <= 6) this.leaveLadder(l.to);
          else if (l.yBottom - d.y <= 6) this.leaveLadder(l.from);
          else {
            d.ladder = null;
            d.state = 'fall';
            d.vx = mv * T.dad.walk * 0.5;
            d.vy = 0;
            d.coyote = 0;
            d.takeoffY = l.yBottom;
          }
          if ((d.state as DadState) === 'ground') d.x += mv * T.dad.walk;
          return;
        }
        if (inp.up) {
          d.y -= D.climb;
          d.climbAnim++;
          if (d.climbAnim % 12 === 0) this.sfx('climb');
          const minY = l.broken ? l.yBottom - T.ladder.brokenClimb : l.yTop;
          if (d.y <= minY) {
            d.y = minY;
            if (!l.broken) this.leaveLadder(l.to);
          }
        } else if (inp.down) {
          d.y += D.climb;
          d.climbAnim++;
          if (d.climbAnim % 12 === 0) this.sfx('climb');
          if (d.y >= l.yBottom) this.leaveLadder(l.from);
        }
        break;
      }
    }
  }

  private startClimb(l: Ladder, y: number): void {
    const d = this.dad;
    d.state = 'climb';
    d.ladder = l;
    d.x = l.x; // ladder snap
    d.y = y;
    d.seg = null;
    d.jumpBuffer = 0;
  }

  private leaveLadder(floor: string): void {
    const d = this.dad;
    const seg = this.level.segOnFloorAt(floor, d.x);
    if (!seg) return;
    d.state = 'ground';
    d.seg = seg;
    d.y = surfaceY(seg, d.x);
    d.ladder = null;
  }

  private startJump(mv: number): void {
    const d = this.dad;
    d.state = 'jump';
    d.vy = -T.dad.jumpVy;
    d.vx = mv * T.dad.walk; // direction locked at takeoff (no air control)
    if (mv !== 0) d.facing = mv as Dir;
    d.takeoffY = d.y;
    d.jumpBuffer = 0;
    d.coyote = 0;
    d.seg = null;
    d.jumpCredits.clear();
    this.sfx('jump');
  }

  private followGround(): void {
    const d = this.dad;
    const s = d.seg!;
    if (segContains(s, d.x)) {
      d.y = surfaceY(s, d.x);
      return;
    }
    const n = this.level.segNear(d.x, d.y, T.dad.stepUp, s);
    if (n) {
      d.seg = n;
      d.y = surfaceY(n, d.x);
      return;
    }
    // walked off an edge
    d.state = 'fall';
    d.vx = 0;
    d.vy = 0;
    d.takeoffY = d.y;
    d.coyote = T.dad.coyote;
    d.seg = null;
  }

  private airMove(): void {
    const d = this.dad;
    const D = T.dad;
    const prevY = d.y;
    const prevX = d.x;
    d.vy = Math.min(d.vy + D.gravity, D.maxFall);
    d.x += d.vx;
    if (d.x < D.minX || d.x > D.maxX) {
      d.x = Math.max(D.minX, Math.min(D.maxX, d.x));
      d.vx = 0;
    }
    this.blockGates(prevX);
    if (d.x === prevX && d.vx !== 0 && this.level.def.gates) d.vx = 0; // bounced off a red scanner
    d.y += d.vy;
    if (d.vy > 0) {
      const land = this.level.landing(d.x, prevY, d.y);
      if (land) {
        d.y = land.y;
        d.seg = land.seg;
        d.state = 'ground';
        d.vx = 0;
        d.vy = 0;
        if (d.y - d.takeoffY > D.safeFall) this.killDad();
        else this.sfx('land');
        return;
      }
    }
    if (d.y > T.H + 16) this.killDad();
  }

  private dropBag(): void {
    this.dad.bag = null;
    this.sfx('bagDone');
  }

  killDad(): void {
    if (this.phase !== 'play') return;
    const d = this.dad;
    d.state = 'dead';
    d.deadTimer = 0;
    d.bag = null;
    d.ladder = null;
    this.sfx('knockout');
    this.setPhase('dying');
  }

  // ---------- hazards ----------
  private updateHazards(): void {
    const mult = this.speedMult;
    const g = T.hazardGravity;
    for (const h of this.hazards) {
      if (h.dead) continue;
      const speed = h.kind === 'case' ? T.suitcase.speed : (h.kind === 'roller' ? T.roller.speed : T.bouncer.speed) * mult;

      if (h.state === 'roll') {
        const prevX = h.x;
        const bv = this.beltVx(h.seg?.floor, h.x);
        if (bv !== 0) h.dir = bv > 0 ? 1 : -1; // on a belt, everything goes the way it runs
        h.x += h.dir * speed + bv;
        h.spin += speed;
        // maybe drop down a ladder whose top we just rolled across (bottles only)
        let dropped = false;
        if (h.kind === 'roller') for (const l of this.level.ladders) {
          if (l.to !== h.seg!.floor) continue;
          if ((prevX < l.x && h.x >= l.x) || (prevX > l.x && h.x <= l.x)) {
            if (this.rng() < T.roller.ladderDropChance) {
              h.state = 'ladder';
              h.ladder = l;
              h.x = l.x;
              h.y = l.yTop;
              h.seg = null;
              dropped = true;
            }
            break;
          }
        }
        if (dropped) continue;
        const s = h.seg!;
        if (segContains(s, h.x)) {
          h.y = surfaceY(s, h.x);
        } else {
          const n = this.level.segNear(h.x, h.y, T.dad.stepUp, s);
          if (n) {
            h.seg = n;
            h.y = surfaceY(n, h.x);
            if (n.dir !== 0) h.dir = n.dir;
          } else if (h.x <= 1 || h.x >= T.W - 1) {
            h.dead = true; // rolled off a floor that runs to the screen edge: gone
          } else {
            h.state = 'air';
            h.seg = null;
            h.vx = h.dir * (h.kind === 'case' ? T.suitcase.speed : T.roller.fallVx * mult);
            h.vy = 0;
          }
        }
      } else if (h.state === 'ladder') {
        const l = h.ladder!;
        h.y += T.roller.ladderSpeed * mult;
        if (h.y >= l.yBottom) {
          const seg = this.level.segOnFloorAt(l.from, h.x);
          h.ladder = null;
          if (seg) {
            h.y = surfaceY(seg, h.x);
            h.seg = seg;
            h.state = 'roll';
            h.dir = seg.dir !== 0 ? seg.dir : this.rng() < 0.5 ? -1 : 1;
          } else {
            h.state = 'air';
            h.vx = 0;
            h.vy = 0;
          }
        }
      } else {
        // airborne
        const prevY = h.y;
        h.vy = Math.min(h.vy + g, T.hazardMaxFall);
        h.x += h.vx;
        h.y += h.vy;
        // Side walls keep everything on-screen mid-stage.
        //  - rollers bounce back (they take the slope's direction when they land)
        //  - bouncers stop dead and drop straight down past the shelf end, then head back
        //    the other way; otherwise their high hops clear the gaps and they ricochet for ages
        if (h.lastFloor !== this.level.bottomFloor) {
          const hitL = h.x < T.hazardWallL;
          const hitR = h.x > T.hazardWallR;
          const exits =
            this.level.def.hazardsExitSides && h.lastFloor !== null && this.level.segOnFloorAt(h.lastFloor, hitL ? 0 : T.W) !== null;
          if ((hitL || hitR) && !exits) {
            h.x = hitL ? T.hazardWallL : T.hazardWallR;
            if (h.kind !== 'bouncer') {
              h.vx = hitL ? Math.abs(h.vx) : -Math.abs(h.vx);
            } else {
              h.vx = 0;
              h.vy = Math.max(h.vy, 0);
              h.dir = hitL ? 1 : -1;
            }
          }
        }
        h.spin += Math.abs(h.vx);
        if (h.vy > 0) {
          const land = this.level.landing(h.x, prevY, h.y);
          if (land) {
            // Rollers always follow the slope. Bouncers follow it only when they reach a NEW floor,
            // so they can't ping-pong across a split floor like the F4 stairwell.
            if (land.seg.dir !== 0 && (h.kind === 'roller' || land.seg.floor !== h.lastFloor)) h.dir = land.seg.dir;
            h.y = land.y;
            const lbv = this.beltVx(land.seg.floor, h.x);
            if (lbv !== 0 && land.seg.floor !== h.lastFloor) h.dir = lbv > 0 ? 1 : -1;
            h.lastFloor = land.seg.floor;
            if (h.kind === 'roller' || h.kind === 'case') {
              h.state = 'roll';
              h.seg = land.seg;
            } else {
              h.vx = h.dir * speed;
              h.vy = -T.bouncer.hopVy;
              this.sfx('boing');
            }
          }
        }
      }

      if (h.x < -12 || h.x > T.W + 12 || h.y > T.H + 20) h.dead = true;
    }
    this.hazards = this.hazards.filter((h) => !h.dead);
  }

  // ---------- collisions, pickups, jump-over scoring ----------
  private collide(): void {
    const d = this.dad;
    if (d.state === 'dead') return;
    const db = rect(d.x, d.y, T.dad.hitW, T.dad.hitH);
    const def = this.level.def;

    // airport: X-ray tunnel shelter
    const tn = def.tunnel;
    const tnY = tn ? this.level.floorSurface(tn.floor, tn.x0) : null;
    this.sheltered = !!tn && tnY !== null && d.state !== 'climb' && Math.abs(d.y - tnY) < 3 && d.x > tn.x0 + 3 && d.x < tn.x1 - 3;

    // airport: cash in the bag at the confiscation bin
    if (def.bin && d.bag && d.bag.count > 0) {
      const by = this.level.floorSurface(def.bin.floor, def.bin.x)!;
      if (Math.abs(d.x - def.bin.x) < 8 && Math.abs(d.y - by) < 3) {
        this.addScore(T.binPointsPerItem * d.bag.count, def.bin.x, by - 14);
        d.bag.count = 0;
        this.sfx('bin');
      }
    }

    // bag pickups
    if (!d.bag && d.state !== 'climb') {
      for (const b of this.bags) {
        if (b.taken) continue;
        if (overlap(db, rect(b.x, b.y + 6, 8, 12))) {
          b.taken = true;
          d.bag = { count: 0, timer: 0 };
          this.sfx('bagGet');
        }
      }
    }

    for (const h of this.hazards) {
      if (h.dead) continue;
      const hw = h.kind === 'roller' ? T.roller.hitW : h.kind === 'case' ? T.suitcase.hitW : T.bouncer.hitW;
      const hh = h.kind === 'roller' ? T.roller.hitH : h.kind === 'case' ? T.suitcase.hitH : T.bouncer.hitH;
      const hb = rect(h.x, h.y, hw, hh);
      if (this.sheltered) continue; // inside the X-ray tunnel: nothing can reach him
      if (overlap(db, hb)) {
        if (d.bag && h.kind !== 'case') {
          // the bag catches thrown items from any direction (stray suitcases are too big)
          h.dead = true;
          d.bag.count++;
          this.addScore(h.kind === 'roller' ? T.score.catchRoller : T.score.catchBouncer, h.x, h.y - 8);
          this.sfx('catch');
          if (d.bag.count >= T.bag.capacity) this.dropBag();
          continue;
        }
        this.killDad();
        return;
      }
      // jumped over it?
      if (d.state === 'jump' && !d.jumpCredits.has(h.id) && Math.abs(h.x - d.x) < 5 && h.y > d.y && h.y - d.y < 26) {
        d.jumpCredits.add(h.id);
        this.addScore(T.score.jumpOver, h.x, h.y - 10);
        this.sfx('jumpOver');
      }
    }
    this.hazards = this.hazards.filter((h) => !h.dead);
  }
}
