import Phaser from 'phaser';
import { ctext } from '../view/font';
import { P } from '../view/palette';
import { attachCrt } from '../view/crt';
import { loadScores } from '../systems/storage';
import { audio } from '../audio/engine';

const ORD = ['1ST', '2ND', '3RD', '4TH', '5TH'];

export class TitleScene extends Phaser.Scene {
  private t = 0;
  private idle = 0;
  private subtitle!: Phaser.GameObjects.Container;
  private press!: Phaser.GameObjects.BitmapText;
  private table!: Phaser.GameObjects.Container;

  constructor() {
    super('Title');
  }

  create(): void {
    this.t = 0;
    this.idle = 0;
    attachCrt(this);
    // MOOP Monster logo (src/art/logo.ts)
    this.add.image(112, 4, 'logo').setOrigin(0.5, 0);

    // subtitle card
    const g = this.add.graphics();
    g.fillStyle(P.navy, 1).fillRect(26, 119, 172, 20);
    g.lineStyle(1, P.cyan, 1).strokeRect(26.5, 119.5, 171, 19);
    this.subtitle = this.add.container(0, 0, [g, ctext(this, 112, 125, 'MATTER OUT OF PLACE', P.white)]);
    this.subtitle.setVisible(false);

    this.press = ctext(this, 112, 145, 'PRESS ENTER', P.white).setVisible(false);

    const rows: Phaser.GameObjects.GameObject[] = [ctext(this, 112, 158, 'HIGH SCORES', P.red)];
    loadScores()
      .slice(0, 5)
      .forEach((e, i) => {
        rows.push(ctext(this, 112, 169 + i * 10, `${ORD[i]}  ${e.name}  ${String(e.score).padStart(6, '0')}`, i === 0 ? P.yellow : P.white));
      });
    this.table = this.add.container(0, 0, rows).setVisible(false);

    ctext(this, 112, 226, 'ARROWS/WASD MOVE  SPACE JUMP', P.grey1);
    ctext(this, 112, 236, 'P PAUSE  M MUTE  T SOUND TEST', P.grey1);

    const kb = this.input.keyboard!;
    const start = () => {
      if (this.t < 20) return;
      // dev-only playtest shortcut: http://localhost:5173/?stage=airport starts at the airport
      const stage = import.meta.env.DEV && new URLSearchParams(location.search).get('stage') === 'airport' ? 1 : 0;
      // the story intro plays first (skipped on the dev airport shortcut)
      if (stage === 0) this.scene.start('Cutscene', { kind: 'intro', next: { key: 'Game', data: { loop: 1, stage } } });
      else this.scene.start('Game', { loop: 1, stage });
    };
    // browsers only allow sound after a key press: the first key starts the title music
    const anyKey = (e: KeyboardEvent) => {
      this.idle = 0;
      audio.unlock();
      if (e.key === 'm' || e.key === 'M') audio.toggleMute();
      if (e.key === 't' || e.key === 'T') {
        this.scene.start('SoundTest');
        return;
      }
      audio.music('title');
    };
    kb.on('keydown-ENTER', start);
    kb.on('keydown-SPACE', start);
    kb.on('keydown', anyKey);
    this.events.once('shutdown', () => {
      kb.off('keydown-ENTER', start);
      kb.off('keydown-SPACE', start);
      kb.off('keydown', anyKey);
    });
    if (audio.playing === 'gameover' || audio.playing === null) audio.music('title');
  }

  update(): void {
    this.t++;
    // attract mode: after 20 s with no key, show a demo
    if (++this.idle > 1200) this.scene.start('Game', { demo: true });
    if (this.t === 50) this.subtitle.setVisible(true);
    if (this.t === 100) this.table.setVisible(true);
    if (this.t >= 100) this.press.setVisible(Math.floor(this.t / 30) % 2 === 0);
  }
}
