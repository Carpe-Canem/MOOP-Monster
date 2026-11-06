import Phaser from 'phaser';
import { ctext } from '../view/font';
import { P } from '../view/palette';
import { attachCrt } from '../view/crt';
import { addScore, loadScores, qualifies } from '../systems/storage';
import { audio } from '../audio/engine';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ.- ';

type Mode = 'gameover' | 'entry' | 'continue';

export class GameOverScene extends Phaser.Scene {
  private mode: Mode = 'gameover';
  private t = 0;
  private score = 0;
  private loop = 1;
  private stage = 0;
  private initials = [0, 0, 0];
  private slot = 0;
  private rank = -1;
  private count = 9;
  private slotTexts: Phaser.GameObjects.BitmapText[] = [];
  private countText?: Phaser.GameObjects.BitmapText;

  constructor() {
    super('GameOver');
  }

  create(data: { score: number; loop: number; stage?: number }): void {
    this.score = data.score;
    this.loop = data.loop;
    this.stage = data.stage ?? 0;
    this.mode = 'gameover';
    this.t = 0;
    this.slot = 0;
    this.initials = [0, 0, 0];
    this.rank = -1;
    attachCrt(this);
    ctext(this, 112, 110, 'GAME OVER', P.red, 2);
    audio.music('gameover');

    const kb = this.input.keyboard!;
    const handler = (e: KeyboardEvent) => this.onKey(e);
    kb.on('keydown', handler);
    this.events.once('shutdown', () => kb.off('keydown', handler));
  }

  private clearUi(): void {
    this.children.removeAll(true);
  }

  private showEntry(): void {
    this.clearUi();
    this.mode = 'entry';
    ctext(this, 112, 60, 'NEW HIGH SCORE!', P.yellow);
    ctext(this, 112, 76, String(this.score).padStart(6, '0'), P.white, 2);
    ctext(this, 112, 110, 'ENTER YOUR INITIALS', P.cyan);
    this.slotTexts = [0, 1, 2].map((i) => ctext(this, 88 + i * 24, 130, 'A', P.white, 2));
    ctext(this, 112, 170, 'UP/DOWN CHANGE LETTER', P.grey1);
    ctext(this, 112, 181, 'OR TYPE IT', P.grey1);
    ctext(this, 112, 192, 'ENTER/SPACE CONFIRM', P.grey1);
    this.refreshSlots();
  }

  private refreshSlots(): void {
    this.slotTexts.forEach((t, i) => {
      t.setText(LETTERS[this.initials[i]]);
      t.setTint(i === this.slot ? P.yellow : P.white);
    });
  }

  private showContinue(): void {
    this.clearUi();
    this.mode = 'continue';
    this.count = 9;
    this.t = 0;
    ctext(this, 112, 30, 'HIGH SCORES', P.red);
    loadScores().forEach((e, i) => {
      const line = `${String(i + 1).padStart(2, ' ')}. ${e.name}  ${String(e.score).padStart(6, '0')}`;
      ctext(this, 112, 44 + i * 10, line, i === this.rank ? P.yellow : P.white);
    });
    ctext(this, 112, 170, 'CONTINUE?', P.cyan, 2);
    this.countText = ctext(this, 112, 190, '9', P.white, 2);
    ctext(this, 112, 214, 'PRESS ENTER', P.grey1);
    ctext(this, 112, 225, '(SCORE RESETS TO 0)', P.grey1);
  }

  private onKey(e: KeyboardEvent): void {
    if (this.mode === 'entry') {
      const n = LETTERS.length;
      if (e.key === 'ArrowUp') this.initials[this.slot] = (this.initials[this.slot] + 1) % n;
      else if (e.key === 'ArrowDown') this.initials[this.slot] = (this.initials[this.slot] + n - 1) % n;
      else if (e.key === 'Backspace' || e.key === 'ArrowLeft') this.slot = Math.max(0, this.slot - 1);
      else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') this.advance();
      else if (/^[a-zA-Z]$/.test(e.key)) {
        this.initials[this.slot] = LETTERS.indexOf(e.key.toUpperCase());
        this.advance();
        return;
      }
      this.refreshSlots();
    } else if (this.mode === 'continue') {
      if (e.key === 'Enter' || e.key === ' ') this.scene.start('Game', { loop: this.loop, stage: this.stage });
    }
  }

  private advance(): void {
    if (this.slot < 2) {
      this.slot++;
      this.refreshSlots();
      return;
    }
    const name = this.initials.map((i) => LETTERS[i]).join('');
    this.rank = addScore(name, this.score);
    this.showContinue();
  }

  update(): void {
    this.t++;
    if (this.mode === 'gameover' && this.t >= 120) {
      if (qualifies(this.score)) this.showEntry();
      else this.showContinue();
    } else if (this.mode === 'continue' && this.t % 60 === 0) {
      this.count--;
      if (this.count < 0) this.scene.start('Title');
      else this.countText?.setText(String(this.count));
    }
  }
}
