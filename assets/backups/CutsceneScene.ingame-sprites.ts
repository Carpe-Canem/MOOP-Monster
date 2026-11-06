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
function cabin(s: Stage, opts: { shampoo: boolean; storm: boolean }): void {
  const { g } = s;
  box(g, P.grey1, 0, 0, T.W, ART_H); // cabin wall
  box(g, P.grey2, 0, 0, T.W, 6);
  // oval-ish window with moving clouds
  const wx = 62, wy = 14, ww = 100, wh = 76;
  box(g, P.grey3, wx - 6, wy - 6, ww + 12, wh + 12);
  box(g, P.cyan, wx, wy, ww, wh);
  box(g, P.blueLight, wx, wy + 50, ww, wh - 50);
  const clouds = s.g.scene.add.graphics().setDepth(0);
  const wing = s.g.scene.add.graphics().setDepth(0);
  const clip = (c: G, color: number, x: number, y: number, w: number, h: number) => {
    const x0 = Math.max(x, wx), x1 = Math.min(x + w, wx + ww);
    if (x1 > x0) box(c, color, x0, y, x1 - x0, h);
  };
  s.ticks.push((t) => {
    clouds.clear();
    for (let i = 0; i < 4; i++) {
      const cx = wx + ww - ((t * 0.9 + i * 70) % 190) + 20;
      const cy = wy + 12 + ((i * 29) % 40);
      clip(clouds, P.white, cx, cy, 26, 7);
      clip(clouds, P.white, cx + 6, cy - 4, 14, 4);
      clip(clouds, P.grey1, cx + 2, cy + 7, 22, 2);
    }
    wing.clear();
    // wing tip in the lower corner of the window
    for (let k = 0; k < 14; k++) clip(wing, k < 2 ? P.white : P.grey2, wx + 40 + k * 4, wy + wh - 10 - Math.floor(k * 0.8), ww, 3);
  });
  // wall panel below the window and a tray table
  box(g, P.grey2, 0, 128, T.W, 2);
  // the son: only head and shoulders show above the seat back (drawn in front of him)
  const son = s.add('sonCalm', 112, 170, 2);
  s.ticks.push((t) => (son.y = 170 + (Math.floor(t / 28) % 2)));
  const seat = s.g.scene.add.graphics().setDepth(3);
  box(seat, P.blue, 0, 148, T.W, 34);
  box(seat, P.navy, 0, 148, T.W, 3);
  box(seat, P.blueLight, 8, 154, 208, 2);
  // tray table
  box(seat, P.grey3, 36, 162, 152, 5);
  box(seat, P.grey2, 36, 162, 152, 2);
  if (opts.shampoo) {
    const bottle = s.add('shampooV', 150, 164, 2).setDepth(4);
    s.ticks.push((t) => (bottle.y = 164 - (Math.floor(t / 40) % 2)));
  }
  if (opts.storm) {
    // grumpy little thundercloud over his head
    const cloud = s.g.scene.add.graphics().setDepth(1);
    s.ticks.push((t) => {
      cloud.clear();
      const bob = Math.floor(t / 20) % 2;
      for (const [x, y, w, h] of [[86, 94 + bob, 52, 10], [94, 88 + bob, 36, 8], [80, 98 + bob, 12, 6], [132, 98 + bob, 12, 6]]) box(cloud, P.grey3, x, y, w, h);
      box(cloud, P.black, 88, 102 + bob, 48, 2);
      if (Math.floor(t / 14) % 3 === 0) {
        box(cloud, P.yellow, 112, 104 + bob, 3, 4);
        box(cloud, P.yellow, 109, 107 + bob, 4, 3);
      }
    });
  }
}

const ENDING: Panel[] = [
  {
    caption: ['THE SON MADE HIS FLIGHT.'],
    build: (s) => cabin(s, { shampoo: false, storm: false }),
  },
  {
    caption: ['HE KEPT THE SHAMPOO.'],
    build: (s) => cabin(s, { shampoo: true, storm: false }),
  },
  {
    caption: ['STILL GRUMPY.', '', '           THE END'],
    build: (s) => cabin(s, { shampoo: true, storm: true }),
  },
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
