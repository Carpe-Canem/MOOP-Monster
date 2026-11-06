import Phaser from 'phaser';
import { T } from '../config/tuning';
import { house } from '../levels/house';
import { airport } from '../levels/airport';
import { airportStaticImage, drawAirportDynamic } from '../view/airportView';
import { GameSim } from '../sim/game';
import type { InputState } from '../sim/types';
import { ctext, text } from '../view/font';
import { P } from '../view/palette';
import { drawLevel } from '../view/draw';
import { drawDad, drawSon, Sweat } from '../view/characters';
import { SpriteLayer } from '../view/spriteLayer';
import { bottleFrame } from '../art/props';
import { topScore } from '../systems/storage';
import { audio } from '../audio/engine';
import type { Phase } from '../sim/game';
import { PauseMenu } from '../view/pauseMenu';
import { attachCrt } from '../view/crt';
import { botInput } from '../sim/bot';

const STEP_MS = 1000 / T.FPS;
const K = Phaser.Input.Keyboard.KeyCodes;

interface Popup {
  t: Phaser.GameObjects.BitmapText;
  life: number;
}

export class GameScene extends Phaser.Scene {
  private sim!: GameSim;
  private g!: Phaser.GameObjects.Graphics;
  private fx!: Phaser.GameObjects.Graphics;
  private props!: SpriteLayer;
  private front!: SpriteLayer;
  private chars!: SpriteLayer;
  private sweat = new Sweat();
  private lastPhase: Phase | null = null;
  private toast!: Phaser.GameObjects.BitmapText;
  private toastLife = 0;
  private acc = 0;
  private jumpLatch = false;
  private paused = false;
  private leaving = false;
  private hiScore = 0;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private popups: Popup[] = [];

  private scoreText!: Phaser.GameObjects.BitmapText;
  private hiText!: Phaser.GameObjects.BitmapText;
  private bonusText!: Phaser.GameObjects.BitmapText;
  private loopText!: Phaser.GameObjects.BitmapText;
  private msgText!: Phaser.GameObjects.BitmapText;
  private menu!: PauseMenu;
  private demo = false;
  private demoText!: Phaser.GameObjects.BitmapText;
  private demoEnd = 0;
  // the current stage's static art, rebuilt when the stage changes
  private stageObjs: Phaser.GameObjects.GameObject[] = [];
  private builtStage = -1;
  private airBack!: Phaser.GameObjects.Graphics;
  private airFront!: Phaser.GameObjects.Graphics;

  constructor() {
    super('Game');
  }

  create(data: { loop?: number; stage?: number; demo?: boolean }): void {
    this.demo = !!data.demo;
    this.demoEnd = 0;
    // the full game is the house, then the airport; the attract demo only shows the house
    this.sim = new GameSim(this.demo ? house : [house, airport], { loop: data.loop ?? 1, stage: data.stage ?? 0, rollersOnly: this.demo });
    this.acc = 0;
    this.jumpLatch = false;
    this.paused = false;
    this.leaving = false;
    this.popups = [];
    this.hiScore = topScore();

    this.stageObjs = [];
    this.builtStage = -1;
    this.airBack = this.add.graphics().setDepth(1);
    this.airFront = this.add.graphics().setDepth(7.5);
    this.buildStage();
    // draw order: stage < hazards & bags < dad/son < held bag < bag fill < HUD
    this.props = new SpriteLayer(this, 5);
    this.chars = new SpriteLayer(this, 6);
    this.g = this.add.graphics().setDepth(6.5);
    this.sweat.clear();
    this.front = new SpriteLayer(this, 7);
    this.fx = this.add.graphics().setDepth(8);

    // HUD
    text(this, 6, 1, '1UP', P.red);
    this.scoreText = text(this, 6, 10, '000000');
    ctext(this, 112, 1, 'HIGH SCORE', P.red);
    this.hiText = ctext(this, 112, 10, '000000');
    text(this, 186, 1, 'BONUS', P.cyan);
    this.bonusText = text(this, 189, 10, '5000', P.cyan);
    this.loopText = text(this, 192, 24, 'L=01', P.white);
    this.msgText = ctext(this, 112, 126, '', P.yellow);
    this.demoText = ctext(this, 112, 246, this.demo ? 'DEMO  -  PRESS ENTER' : '', P.yellow);
    this.toast = ctext(this, 112, 246, '', P.grey1);
    this.lastPhase = null;
    audio.unlock();
    for (const o of this.children.list) if (o instanceof Phaser.GameObjects.BitmapText) o.setDepth(10);
    this.menu = new PauseMenu(
      this,
      () => this.setPaused(false),
      () => {
        audio.stopMusic();
        this.scene.start('Title');
      },
    );
    attachCrt(this);
    if (this.demo) {
      // attract mode is silent; any key goes back to the title screen
      audio.stopMusic();
      const back = () => this.scene.start('Title');
      this.input.keyboard!.once('keydown', back);
    }

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys({
      left: K.LEFT,
      right: K.RIGHT,
      up: K.UP,
      down: K.DOWN,
      a: K.A,
      d: K.D,
      w: K.W,
      s: K.S,
      space: K.SPACE,
      z: K.Z,
      p: K.P,
      esc: K.ESC,
      m: K.M,
    }) as Record<string, Phaser.Input.Keyboard.Key>;
  }

  /** (Re)draw the static art for the stage the simulation is on. */
  private buildStage(): void {
    for (const o of this.stageObjs) o.destroy();
    const before = new Set(this.children.list);
    const lv = this.sim.level;
    if (lv.def.theme === 'airport') {
      airportStaticImage(this, lv);
    } else {
      drawLevel(this, this.add.graphics(), lv);
      for (const d of lv.def.decor ?? []) this.add.image(d.x, Math.round(lv.floorSurface(d.floor, d.x)!), d.key).setOrigin(0.5, 1);
    }
    this.stageObjs = this.children.list.filter((o) => !before.has(o));
    this.builtStage = this.sim.stage;
  }

  private setPaused(on: boolean): void {
    this.paused = on;
    if (on) this.menu.open();
    else this.menu.close();
    audio.pauseMusic(on);
  }

  private readInput(): InputState {
    if (this.demo) return botInput(this.sim);
    const k = this.keys;
    return {
      left: k.left.isDown || k.a.isDown,
      right: k.right.isDown || k.d.isDown,
      up: k.up.isDown || k.w.isDown,
      down: k.down.isDown || k.s.isDown,
      jump: false,
    };
  }

  update(_time: number, delta: number): void {
    const JD = Phaser.Input.Keyboard.JustDown;
    if (!this.demo && (JD(this.keys.p) || JD(this.keys.esc))) this.setPaused(!this.paused);
    if (!this.paused && JD(this.keys.m)) {
      this.toast.setText(audio.toggleMute() ? 'SOUND OFF' : 'SOUND ON');
      this.toastLife = 60;
    }
    if (this.toastLife > 0 && --this.toastLife === 0) this.toast.setText('');
    if (this.paused) return;

    if (JD(this.keys.space) || JD(this.keys.z)) this.jumpLatch = true;

    this.acc += Math.min(delta, 100);
    let steps = 0;
    while (this.acc >= STEP_MS && steps < 5) {
      const inp = this.readInput();
      inp.jump = this.jumpLatch;
      this.jumpLatch = false;
      this.sim.step(inp);
      this.sweat.step();
      this.handleEvents();
      this.acc -= STEP_MS;
      steps++;
    }

    this.render();
    if (this.demo) {
      this.demoText.setVisible(Math.floor(this.sim.frame / 30) % 2 === 0);
      // end the demo a moment after a knockout, a clear, or 40 s
      if (!this.demoEnd && (this.sim.phase === 'dying' || this.sim.phase === 'clear' || this.sim.frame > 2400)) this.demoEnd = this.sim.frame + 120;
      if (this.demoEnd && this.sim.frame >= this.demoEnd && !this.leaving) {
        this.leaving = true;
        this.scene.start('Title');
      }
      return;
    }
    this.updateMusic();

    if (this.sim.phase === 'over' && !this.leaving) {
      this.leaving = true;
      this.time.delayedCall(600, () => this.scene.start('GameOver', { score: this.sim.score, loop: this.sim.loop, stage: this.sim.stage }));
    }
  }

  /** Music follows the game: jingles on phase changes, stage loop in play, power-up loop with the bag. */
  private updateMusic(): void {
    const s = this.sim;
    if (s.phase !== this.lastPhase) {
      if (s.phase === 'ready') audio.music('ready');
      else if (s.phase === 'clear') audio.music('clear');
      else if (s.phase === 'dying' || s.phase === 'over') audio.stopMusic();
      this.lastPhase = s.phase;
    }
    if (s.phase === 'play') audio.music(s.dad.bag ? 'bag' : 'stage');
  }

  private handleEvents(): void {
    for (const e of this.sim.events) {
      if (e.type === 'points') {
        const t = ctext(this, Math.round(e.x), Math.round(e.y) - 8, String(e.pts), P.white).setDepth(10);
        this.popups.push({ t, life: 45 });
      } else if (e.type === 'extraLife') {
        const t = ctext(this, 112, 140, 'EXTRA LIFE!', P.green).setDepth(10);
        this.popups.push({ t, life: 120 });
      }
      // the son sweats when he winds up and when he lets go
      if (e.type === 'sfx' && e.name === 'windup') this.sweat.burst(this.sim.son, 2);
      if (e.type === 'sfx' && e.name === 'throw') this.sweat.burst(this.sim.son, 4);
      if (e.type === 'sfx' && e.name !== 'clear' && !this.demo) audio.sfx(e.name);
    }
    this.sim.events.length = 0;
    for (const p of this.popups) {
      p.life--;
      if (p.life <= 0) p.t.destroy();
    }
    this.popups = this.popups.filter((p) => p.life > 0);
  }

  private render(): void {
    const s = this.sim;
    const g = this.g;
    if (s.stage !== this.builtStage) this.buildStage();
    const airportStage = s.level.def.theme === 'airport';
    g.clear();
    this.fx.clear();
    this.airBack.clear();
    this.airFront.clear();
    if (airportStage) drawAirportDynamic(this.airBack, this.airFront, s);
    this.props.begin();
    this.chars.begin();
    this.front.begin();

    // empty recycling bags hanging on hooks (bob gently)
    for (const b of s.bags) {
      if (b.taken) continue;
      const by = Math.round(b.y + Math.sin(s.frame * 0.08)) + 6;
      this.fx.fillStyle(P.grey2, 1).fillRect(Math.round(b.x), by - 16, 1, 4);
      this.props.draw('trashEmpty', b.x, by);
    }
    for (const h of s.hazards) {
      if (h.kind === 'case') {
        this.props.draw('luggage', h.x, h.y);
      } else if (h.kind === 'roller') {
        const f = bottleFrame(h.variant, h.spin, h.dir);
        this.props.draw(f.key, h.x, h.y, { flipX: f.flipX, flipY: f.flipY });
      } else {
        if (h.variant === 0) {
          // sunglasses flip end over end as they bounce
          const f = Math.floor(h.spin / 5) % 4;
          this.props.draw(f % 2 === 0 ? 'shadesFront' : 'shadesSide', h.x, h.y, { flipX: h.dir < 0, flipY: f === 2 });
        } else {
          this.props.draw('soap', h.x, h.y, { flipX: h.dir < 0 });
        }
      }
    }
    if (airportStage) {
      for (const dc of s.level.def.decor ?? []) this.props.draw(dc.key, dc.x, Math.round(s.level.floorSurface(dc.floor, dc.x)!));
      drawSon(this.chars, s.son, 165);
    } else {
      drawSon(this.chars, s.son);
    }
    drawDad(this.chars, g, s.dad, s.frame);
    this.sweat.draw(this.front);

    // the recycling bag held out in front: it swells as it fills up
    const d = s.dad;
    if (d.bag && d.state !== 'dead') {
      const bx = d.x + d.facing * 11;
      const by = d.y;
      const flash = T.bag.maxFrames - d.bag.timer < 120 && s.frame % 8 < 4;
      const full = d.bag.count / T.bag.capacity;
      const key = full >= 0.8 ? 'trashFull' : full >= 0.4 ? 'trashMid' : 'trashEmpty';
      this.front.draw(key, bx, by, { alpha: flash ? 0.4 : 1, flipX: d.facing < 0 });
    }
    this.props.end();
    this.chars.end();
    this.front.end();

    // lives (small heads), not counting the one in play
    for (let i = 0; i < s.lives - 1; i++) {
      g.fillStyle(P.grey1, 1).fillRect(6 + i * 8, 24, 5, 2);
      g.fillStyle(P.skin, 1).fillRect(6 + i * 8, 26, 5, 4);
    }

    const pad = (n: number) => String(n).padStart(6, '0');
    this.scoreText.setText(pad(s.score));
    this.hiText.setText(pad(Math.max(this.hiScore, s.score)));
    this.bonusText.setText(String(s.bonus).padStart(4, '0'));
    this.bonusText.setTint(s.bonus <= 1000 && s.frame % 30 < 15 ? P.red : P.cyan);
    this.loopText.setText('L=' + String(s.loop).padStart(2, '0'));

    let msg = '';
    if (s.phase === 'ready') msg = s.loop > 1 ? `${s.level.def.name} - FASTER!` : `${s.level.def.name} - GET READY`;
    else if (airportStage && (s.phase === 'clear' || s.phase === 'tally')) {
      if (s.phase === 'tally' || s.son.board.step === 'done') msg = 'YOU MADE YOUR FLIGHT!';
    } else if (s.phase === 'clear' || s.phase === 'tally') msg = 'HE GOT AWAY!';
    this.msgText.setText(msg);
    this.msgText.setY(airportStage ? 226 : 126); // airport: below the floors, clear of the son's gate
  }
}
