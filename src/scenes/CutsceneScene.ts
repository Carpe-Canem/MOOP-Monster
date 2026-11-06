// Intro and ending cutscenes (Milestone 6): hand-composed pixel panels with typewriter captions.
//   intro  : Title -> Cutscene -> Game          ("packing panic", 4 panels)
//   ending : Game (paused) -> Cutscene overlay -> Game resumes, one loop faster (3 panels)
// Enter/Space finishes the caption, then moves to the next panel (panels never advance on their own); Esc skips the whole cutscene.
import Phaser from 'phaser';
import { T } from '../config/tuning';
import { P } from '../view/palette';
import { text } from '../view/font';
import { attachCrt } from '../view/crt';
import { audio } from '../audio/engine';

export type CutsceneKind = 'intro' | 'ending';
export interface CutsceneData {
  kind: CutsceneKind;
  /** scene to start when finished (intro). Omit for the ending overlay, which resumes 'Game'. */
  next?: { key: string; data?: object };
}

type Img = Phaser.GameObjects.Image;
type Tick = (t: number) => void;

/** Everything a panel can use while building itself. */
interface Stage {
  g: Phaser.GameObjects.Graphics;
  add: (key: string, x: number, y: number, scale?: number, flip?: boolean) => Img;
  ticks: Tick[];
}
interface Panel {
  caption: string[];
  build: (s: Stage) => void;
  sfx?: string;
}

const ART_H = 182; // picture area; the caption box sits below
const CHARS_PER_FRAME = 0.5;

// ------------------------------------------------------------------ shared drawing bits
type G = Phaser.GameObjects.Graphics;
const box = (g: G, c: number, x: number, y: number, w: number, h: number) => g.fillStyle(c, 1).fillRect(x, y, w, h);

function bedroom(g: G): void {
  box(g, P.cyanDark, 0, 0, T.W, 150); // wall
  box(g, P.navy, 0, 120, T.W, 2); // picture rail
  box(g, P.brownDark, 0, 146, T.W, 4); // skirting
  box(g, P.wood, 0, 150, T.W, ART_H - 150); // floor
  for (let x = 0; x < T.W; x += 28) box(g, P.brown, x, 150, 1, ART_H - 150);
  // window with a night sky
  box(g, P.brownDark, 150, 24, 52, 62);
  box(g, P.navy, 154, 28, 44, 54);
  box(g, P.brownDark, 175, 28, 2, 54);
  box(g, P.brownDark, 154, 54, 44, 2);
  for (const [x, y] of [[160, 34], [188, 40], [165, 66], [186, 70], [180, 32]]) box(g, P.yellow, x, y, 1, 1);
  box(g, P.cream, 163, 38, 5, 5); // moon
  box(g, P.navy, 165, 38, 3, 3);
}

function suitcase(s: Stage, x: number, y: number, scale: number): Img {
  return s.add('suitcase', x, y, scale);
}

// ------------------------------------------------------------------ intro panels
const INTRO: Panel[] = [
  {
    caption: ['THE SON FLIES OUT TODAY.', 'HE HAS PACKED... A LOT.'],
    build: (s) => {
      bedroom(s.g);
      // bunk bed behind, overstuffed suitcase in front
      // bunk bed: four posts, two blue mattresses, a pillow
      for (const x of [14, 78]) box(s.g, P.brownDark, x, 66, 4, 84);
      box(s.g, P.brown, 14, 80, 68, 4);
      box(s.g, P.blue, 18, 70, 60, 10);
      box(s.g, P.cream, 20, 66, 14, 6);
      box(s.g, P.brown, 14, 118, 68, 4);
      box(s.g, P.blue, 18, 108, 60, 10);
      box(s.g, P.cream, 20, 104, 14, 6);
      box(s.g, P.woodLight, 78, 72, 2, 78);
      const son = s.add('sonCalm', 108, 160, 2);
      const case1 = suitcase(s, 168, 156, 4);
      // clothes spilling out of the lid
      box(s.g, P.red, 150, 100, 12, 8);
      box(s.g, P.yellow, 166, 96, 14, 10);
      box(s.g, P.greenLight, 182, 102, 10, 8);
      const items = [s.add('shampooV', 30, 172, 2), s.add('lotionV', 48, 172, 2), s.add('shadesFront', 66, 172, 2), s.add('soap', 84, 172, 2)];
      s.ticks.push((t) => {
        son.y = 160 + (Math.floor(t / 20) % 2);
        case1.x = 168 + (Math.floor(t / 8) % 2);
        items.forEach((it, i) => (it.y = 172 - (Math.floor((t + i * 9) / 18) % 2)));
      });
    },
  },
  {
    caption: ['DAD: "THAT BAG IS WAY OVER', 'THE LIMIT. SOMETHING STAYS."'],
    build: (s) => {
      bedroom(s.g);
      const dad = s.add('dadStand', 40, 162, 4);
      const son = s.add('sonCalm', 168, 160, 2, true);
      const c = suitcase(s, 112, 160, 3);
      // the dad's wagging finger: a tiny "!" over his head
      const bang = text(s.g.scene, 38, 84, '!', P.yellow, 3);
      s.ticks.push((t) => {
        dad.y = 162 + (Math.floor(t / 16) % 2);
        bang.setVisible(Math.floor(t / 12) % 2 === 0);
        son.y = 160 + (Math.floor(t / 22) % 2);
        c.x = 112 + (t > 40 && Math.floor(t / 4) % 2 ? 1 : 0);
      });
    },
  },
  {
    caption: ['THE SON LOSES IT.'],
    sfx: 'throw',
    build: (s) => {
      bedroom(s.g);
      const son = s.add('sonThrow', 112, 164, 3);
      const kinds = ['shampooV', 'lotionV', 'shadesFront', 'soap', 'shampooH'];
      const flying = kinds.map((k, i) => ({ img: s.add(k, 112, 100, 2), i }));
      const sweat = Array.from({ length: 4 }, () => s.add('sweat', 112, 100, 1));
      const flash = s.g.scene.add.rectangle(0, 0, T.W, ART_H, P.red, 0.18).setOrigin(0, 0).setDepth(1);
      s.ticks.push((t) => {
        son.x = 112 + (Math.floor(t / 2) % 2 ? 2 : -2);
        flash.setVisible(Math.floor(t / 6) % 2 === 0);
        flying.forEach(({ img, i }) => {
          const u = ((t * 2 + i * 38) % 190) / 190; // 0..1 along the throw
          const dir = i % 2 ? 1 : -1;
          img.setPosition(112 + dir * (10 + u * 110), 90 + u * 70 + Math.sin(u * Math.PI) * -40);
          img.setAngle(u * 360 * dir);
        });
        sweat.forEach((d, i) => {
          const u = ((t * 1.5 + i * 25) % 60) / 60;
          const dir = i % 2 ? 1 : -1;
          d.setPosition(112 + dir * (22 + u * 28), 96 + u * 30 - Math.sin(u * Math.PI) * 14);
        });
      });
    },
  },
  {
    caption: ['DAD TAKES A BREATH...', 'AND STARTS TO CLIMB.'],
    build: (s) => {
      bedroom(s.g);
      // a ladder up the wall and the dad, seen from behind
      box(s.g, P.woodLight, 100, 20, 3, 140);
      box(s.g, P.woodLight, 122, 20, 3, 140);
      for (let y = 28; y < 160; y += 14) box(s.g, P.wood, 103, y, 19, 3);
      const dad = s.add('dadClimb1', 112, 160, 4);
      const rain = ['shampooV', 'lotionV', 'soap', 'shadesFront'].map((k, i) => s.add(k, 40 + i * 44, 0, 2));
      s.ticks.push((t) => {
        const climb = Math.min(110, t * 0.6);
        dad.setTexture(Math.floor(t / 9) % 2 ? 'dadClimb2' : 'dadClimb1');
        dad.y = 168 - climb;
        rain.forEach((r, i) => {
          r.y = ((t * 2 + i * 55) % 230) - 20;
          r.setAngle(t * (i % 2 ? 6 : -6));
        });
      });
    },
  },
];

// ------------------------------------------------------------------ ending panels
// Concept C: the son turns around over his seat back and winks at the player; his secret bag is full.
type Beat = 0 | 1 | 2; // 0 calm, 1 one little bottle, 2 the open bag + wink

type Pt = [number, number];
const poly = (g: G, c: number, pts: Pt[]) => g.fillStyle(c, 1).fillPoints(pts.map(([x, y]) => new Phaser.Math.Vector2(x, y)), true);
const GREY_DARK = 0x2a2a32;

/** Option A: looking down the aisle. One-point perspective; the son leans out of the near left seat. */
function cabin(s: Stage, beat: Beat): void {
  const scene = s.g.scene;
  const g = scene.add.graphics().setDepth(0);
  const cx = 112;
  const hy = 74; // horizon (vanishing point is (cx, hy))
  // one consistent perspective: a point at lateral offset u and height h (down = +) at depth scale sc lands at
  // (cx + u*sc, hy + h*sc). sc = 1 is the camera plane; the cabin shrinks toward the front.
  const X = (u: number, sc: number) => cx + u * sc;
  const Y = (h: number, sc: number) => hy + h * sc;
  const WALL = 110; // lateral half-width of the cabin
  const CEIL = -74; // ceiling height
  const FLOOR = 108; // floor height
  const AISLE = 24; // aisle half-width
  const SEAT = 20; // one seat's width
  const far = 0.16; // depth scale of the front bulkhead
  const rowDepth = (i: number) => 1 / (1 + i * 0.8);

  box(g, P.grey1, 0, 0, T.W, ART_H);
  // front bulkhead, ceiling, side walls, floor
  box(g, P.grey2, X(-WALL, far), Y(CEIL, far), WALL * 2 * far, (FLOOR - CEIL) * far);
  poly(g, P.grey2, [[X(-WALL, 1), Y(CEIL, 1)], [X(WALL, 1), Y(CEIL, 1)], [X(WALL, far), Y(CEIL, far)], [X(-WALL, far), Y(CEIL, far)]]);
  for (const sd of [-1, 1]) {
    poly(g, P.cream, [[X(sd * WALL, 1), Y(CEIL, 1)], [X(sd * WALL, far), Y(CEIL, far)], [X(sd * WALL, far), Y(FLOOR, far)], [X(sd * WALL, 1), Y(FLOOR, 1)]]);
  }
  poly(g, GREY_DARK, [[X(-WALL, 1), Y(FLOOR, 1)], [X(WALL, 1), Y(FLOOR, 1)], [X(WALL, far), Y(FLOOR, far)], [X(-WALL, far), Y(FLOOR, far)]]);
  poly(g, P.redDark, [[X(-AISLE, 1), Y(FLOOR, 1)], [X(AISLE, 1), Y(FLOOR, 1)], [X(AISLE, far), Y(FLOOR, far)], [X(-AISLE, far), Y(FLOOR, far)]]); // aisle runner
  for (let i = 1; i < 7; i++) {
    const sc = rowDepth(i - 0.5);
    box(g, P.yellow, X(-AISLE + 2, sc), Y(FLOOR, sc), 2, 1); // aisle floor lights
    box(g, P.yellow, X(AISLE - 4, sc), Y(FLOOR, sc), 2, 1);
  }
  // ceiling light strip
  poly(g, P.white, [[X(-9, 1), Y(CEIL, 1)], [X(9, 1), Y(CEIL, 1)], [X(9, far), Y(CEIL, far)], [X(-9, far), Y(CEIL, far)]]);

  // overhead bins: the inward face and the underside, running down both walls
  for (const sd of [-1, 1]) {
    poly(g, P.grey1, [[X(sd * 62, 1), Y(-66, 1)], [X(sd * 62, far), Y(-66, far)], [X(sd * 62, far), Y(-40, far)], [X(sd * 62, 1), Y(-40, 1)]]);
    poly(g, P.grey3, [[X(sd * 62, 1), Y(-40, 1)], [X(sd * 62, far), Y(-40, far)], [X(sd * WALL, far), Y(-40, far)], [X(sd * WALL, 1), Y(-40, 1)]]);
    for (let i = 1; i < 7; i++) {
      const sc = rowDepth(i - 0.5);
      box(g, P.grey3, X(sd * 62, sc) - 1, Y(-66, sc), 1, 26 * sc); // gaps between bin doors
    }
  }

  // windows along the walls: one trapezoid per seat row, with a shade pulled down a little
  const wins: { x: number; y: number; w: number; h: number }[] = [];
  const winTop = -30;
  const winBot = 0;
  for (const sd of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const sa = i === 0 ? 0.92 : rowDepth(i) * 0.97;
      const sb = rowDepth(i + 0.55);
      if (sb < far) continue;
      const quad = (c: number, t: number, bt: number) =>
        poly(g, c, [[X(sd * WALL, sa), Y(t, sa)], [X(sd * WALL, sb), Y(t, sb)], [X(sd * WALL, sb), Y(bt, sb)], [X(sd * WALL, sa), Y(bt, sa)]]);
      quad(P.grey3, winTop - 3, winBot + 3); // frame
      quad(P.cyan, winTop, winBot);
      quad(P.white, winTop, winTop + 9); // shade
      const x0 = Math.min(X(sd * WALL, sa), X(sd * WALL, sb));
      const x1 = Math.max(X(sd * WALL, sa), X(sd * WALL, sb));
      wins.push({ x: x0 + 1, y: Y(winTop + 9, sb), w: x1 - x0 - 2, h: Y(winBot, sb) - Y(winTop + 9, sb) });
    }
  }

  // seat backs, far to near, three per side with an aisle between
  const heads = [P.brown, P.black, P.tan, P.grey1, P.brownDark, P.orange];
  for (let i = 6; i >= 1; i--) {
    const sc = rowDepth(i);
    for (const sd of [-1, 1]) {
      for (let j = 0; j < 3; j++) {
        const u0 = AISLE + j * SEAT;
        const x = sd < 0 ? X(-(u0 + SEAT), sc) : X(u0, sc);
        const w = SEAT * sc - 1;
        const top = Y(FLOOR - 50, sc);
        box(g, P.blue, x, top, w, 46 * sc);
        box(g, P.navy, x, top, w, Math.max(1, 3 * sc));
        box(g, P.grey1, x + 2 * sc, top - 8 * sc, w - 4 * sc, 9 * sc); // headrest cover
        if ((i + j + (sd > 0 ? 1 : 0)) % 3 === 0) box(g, heads[(i + j) % heads.length], x + 4 * sc, top - 16 * sc, w - 8 * sc, 9 * sc); // a head over the seat
      }
    }
  }

  // moving layer: scrolling clouds in the windows, and the flight attendant with her cart
  const dyn = scene.add.graphics().setDepth(1);
  const rail = (x: number, y: number, sc: number, w: number, h: number, c: number) => box(dyn, c, x, y, Math.max(1, w * sc), Math.max(1, h * sc));
  s.ticks.push((t) => {
    dyn.clear();
    wins.forEach((w, k) => {
      const cl = 0.35 * w.w;
      const x = w.x + w.w - ((t * 0.5 + k * 17) % (w.w + cl)) ;
      const x0 = Math.max(x, w.x), x1 = Math.min(x + cl, w.x + w.w);
      if (x1 > x0) box(dyn, P.white, x0, w.y + w.h * 0.4, x1 - x0, Math.max(1, w.h * 0.25));
    });
    // flight attendant pushing a cart down the aisle (mid-distance, centred)
    const sc = 0.62;
    const bob = Math.floor(t / 24) % 2;
    const fy = Y(FLOOR, sc) + bob;
    const ax = cx + 8;
    rail(ax - 10, fy - 78, sc, 20, 20, P.skin); // head
    rail(ax - 11, fy - 82, sc, 22, 9, P.brownDark); // hair
    rail(ax - 12, fy - 58, sc, 24, 40, P.navy); // uniform
    rail(ax - 5, fy - 60, sc, 10, 5, P.yellow); // scarf
    rail(ax - 12, fy - 18, sc, 10, 18, P.grey2); // legs
    rail(ax + 2, fy - 18, sc, 10, 18, P.grey2);
    rail(ax - 2, fy - 72, sc, 3, 3, P.black);
    rail(ax + 5, fy - 72, sc, 3, 3, P.black);
    // the cart, a little nearer the camera
    const cs = 0.8;
    const cy = Y(FLOOR, cs);
    rail(ax - 16, cy - 40, cs, 32, 36, P.grey1);
    rail(ax - 16, cy - 40, cs, 32, 3, P.grey3);
    rail(ax - 12, cy - 32, cs, 10, 10, P.white);
    rail(ax + 2, cy - 32, cs, 10, 10, P.red);
    rail(ax - 12, cy - 18, cs, 24, 6, P.yellow);
    rail(ax - 16, cy - 4, cs, 32, 4, P.grey2);
  });

  // near left seat: the son, turned around over his seat back
  const son = scene.add.image(52, 146, 'sonCalm').setOrigin(0.5, 1).setScale(3).setDepth(2);
  const front = scene.add.graphics().setDepth(3);
  box(front, P.blue, 4, 114, 82, ART_H - 114); // his seat back
  box(front, P.navy, 4, 114, 82, 4);
  box(front, P.blueLight, 10, 122, 70, 2);
  box(front, P.blue, 150, 148, 74, ART_H - 148); // the seat across the aisle, kept low so the rows behind show
  box(front, P.navy, 150, 148, 74, 4);
  const prop = scene.add.graphics().setDepth(4);
  const bottle = beat === 1 ? s.add('shampooV', 66, 120, 3).setDepth(4) : null;
  const bottles =
    beat === 2 ? (['shampooV', 'lotionV', 'shadesFront', 'shampooV', 'lotionV'] as const).map((k, i) => s.add(k, 48 + i * 9, 124, 2).setDepth(4)) : [];
  const winking = (t: number) => beat === 2 && Math.floor(t / 50) % 3 !== 0;
  s.ticks.push((t) => {
    son.y = 146 + (Math.floor(t / 28) % 2);
    son.setTexture(winking(t) ? 'sonWink' : 'sonCalm');
    if (beat === 2) {
      prop.clear();
      box(prop, P.redDark, 40, 126, 50, 22); // the open secret bag
      box(prop, P.red, 40, 126, 50, 3);
      box(prop, P.grey3, 56, 122, 16, 5);
      bottles.forEach((b, i) => (b.y = 126 - (Math.floor((t + i * 12) / 24) % 2)));
    }
    if (bottle) bottle.y = 120 - (Math.floor(t / 40) % 2);
  });
}

const ENDING: Panel[] = [
  { caption: ['HE MADE HIS FLIGHT.'], build: (s) => cabin(s, 0) },
  { caption: ['THEY LET HIM KEEP A LITTLE', 'BOTTLE OF SHAMPOO...'], build: (s) => cabin(s, 1) },
  { caption: ['BUT HE STILL HAS HIS SECRET BAG.', '', '           THE END'], build: (s) => cabin(s, 2) },
];

// ------------------------------------------------------------------ the scene
export class CutsceneScene extends Phaser.Scene {
  private kind: CutsceneKind = 'intro';
  private next?: CutsceneData['next'];
  private panels: Panel[] = [];
  private index = -1;
  private t = 0;
  private typed = 0;
  private fade = 0; // frames of fade left (positive = fading in)
  private done = false;
  private panelObjs: Phaser.GameObjects.GameObject[] = [];
  private ticks: Tick[] = [];
  private captionText!: Phaser.GameObjects.BitmapText;
  private prompt!: Phaser.GameObjects.BitmapText;
  private veil!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('Cutscene');
  }

  create(data: CutsceneData): void {
    this.kind = data.kind;
    this.next = data.next;
    this.panels = this.kind === 'intro' ? INTRO : ENDING;
    this.index = -1;
    this.done = false;
    attachCrt(this);
    this.cameras.main.setBackgroundColor(0x000000);

    // caption box (stays across panels)
    const frame = this.add.graphics().setDepth(5);
    box(frame, P.black, 0, ART_H, T.W, T.H - ART_H);
    frame.lineStyle(1, P.cyan, 1).strokeRect(3.5, ART_H + 3.5, T.W - 7, T.H - ART_H - 7);
    this.captionText = text(this, 12, ART_H + 12, '', P.white).setDepth(6);
    this.captionText.setLineSpacing(6);
    this.prompt = text(this, T.W - 12 - 6 * 8, T.H - 18, 'ENTER >', P.yellow).setDepth(6).setVisible(false);
    this.veil = this.add.rectangle(0, 0, T.W, T.H, 0x000000, 1).setOrigin(0, 0).setDepth(20);

    audio.unlock();
    audio.music(this.kind === 'intro' ? 'ready' : 'clear');

    const kb = this.input.keyboard!;
    const advance = () => this.advance();
    const skip = () => this.finish();
    kb.on('keydown-ENTER', advance);
    kb.on('keydown-SPACE', advance);
    kb.on('keydown-ESC', skip);
    this.events.once('shutdown', () => {
      kb.off('keydown-ENTER', advance);
      kb.off('keydown-SPACE', advance);
      kb.off('keydown-ESC', skip);
    });

    this.nextPanel();
  }

  private nextPanel(): void {
    this.index++;
    if (this.index >= this.panels.length) {
      this.finish();
      return;
    }
    for (const o of this.panelObjs) o.destroy();
    const before = new Set(this.children.list);
    this.ticks = [];
    const g = this.add.graphics().setDepth(0);
    const stage: Stage = {
      g,
      ticks: this.ticks,
      add: (key, x, y, scale = 1, flip = false) => this.add.image(x, y, key).setOrigin(0.5, 1).setScale(scale).setFlipX(flip).setDepth(2),
    };
    const panel = this.panels[this.index];
    panel.build(stage);
    // anything the panel created (but not the caption box) is thrown away at the next panel
    this.panelObjs = this.children.list.filter((o) => !before.has(o));
    this.t = 0;
    this.typed = 0;
    this.captionText.setText('');
    this.prompt.setVisible(false);
    this.fade = 20;
    if (panel.sfx) audio.sfx(panel.sfx);
  }

  private fullCaption(): string {
    return this.panels[this.index].caption.join('\n');
  }

  private advance(): void {
    if (this.done || this.index < 0) return;
    if (this.typed < this.fullCaption().length) this.typed = this.fullCaption().length; // finish typing first
    else this.nextPanel();
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    audio.stopMusic();
    if (this.kind === 'ending') {
      this.scene.stop();
      this.scene.resume('Game');
    } else {
      this.scene.start(this.next?.key ?? 'Title', this.next?.data);
    }
  }

  update(): void {
    if (this.done || this.index < 0) return;
    this.t++;
    for (const f of this.ticks) f(this.t);
    // fade in at the start of each panel
    if (this.fade > 0) {
      this.fade--;
      this.veil.setAlpha(this.fade / 20);
    } else this.veil.setAlpha(0);

    const full = this.fullCaption();
    if (this.typed < full.length) {
      const before = Math.floor(this.typed);
      this.typed = Math.min(full.length, this.typed + CHARS_PER_FRAME);
      if (Math.floor(this.typed) !== before && full[Math.floor(this.typed) - 1] !== ' ' && Math.floor(this.typed) % 2 === 0) audio.sfx('tick');
      this.captionText.setText(full.slice(0, Math.floor(this.typed)));
    } else {
      this.captionText.setText(full);
      this.prompt.setVisible(Math.floor(this.t / 20) % 2 === 0);
      // no auto-advance: each panel waits for Enter/Space
    }
  }
}
