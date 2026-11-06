// Arcade-style SOUND TEST: audition every music track and sound effect.
// Reached from the title screen with T.
import Phaser from 'phaser';
import { ctext, text } from '../view/font';
import { P } from '../view/palette';
import { attachCrt } from '../view/crt';
import { audio } from '../audio/engine';
import { SONG_NAMES } from '../audio/songs';
import { SFX_NAMES } from '../audio/sfx';

interface Entry {
  kind: 'music' | 'sfx';
  name: string;
}

export class SoundTestScene extends Phaser.Scene {
  private entries: Entry[] = [];
  private sel = 0;
  private rows: Phaser.GameObjects.BitmapText[] = [];
  private nowText!: Phaser.GameObjects.BitmapText;

  constructor() {
    super('SoundTest');
  }

  create(): void {
    audio.unlock();
    attachCrt(this);
    audio.stopMusic();
    this.entries = [...SONG_NAMES.map((name) => ({ kind: 'music' as const, name })), ...SFX_NAMES.map((name) => ({ kind: 'sfx' as const, name }))];
    this.sel = 0;
    this.rows = [];

    ctext(this, 112, 4, 'SOUND TEST', P.yellow, 2);
    text(this, 8, 26, 'MUSIC', P.red);
    text(this, 76, 26, 'EFFECTS', P.red);
    const perCol = Math.ceil(SFX_NAMES.length / 2);
    this.entries.forEach((e, i) => {
      if (e.kind === 'music') {
        this.rows.push(text(this, 8, 38 + i * 10, '  ' + e.name.toUpperCase(), P.white));
        return;
      }
      const idx = i - SONG_NAMES.length;
      const x = idx < perCol ? 76 : 150;
      this.rows.push(text(this, x, 38 + (idx % perCol) * 10, '  ' + e.name.toUpperCase(), P.white));
    });
    this.nowText = ctext(this, 112, 220, '', P.cyan);
    ctext(this, 112, 236, 'ARROWS PICK  ENTER PLAY  ESC BACK', P.grey1);
    ctext(this, 112, 246, 'S STOP MUSIC  M MUTE', P.grey1);
    this.refresh();

    const kb = this.input.keyboard!;
    const onKey = (e: KeyboardEvent) => {
      const n = this.entries.length;
      if (e.key === 'ArrowDown') this.sel = (this.sel + 1) % n;
      else if (e.key === 'ArrowUp') this.sel = (this.sel + n - 1) % n;
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const cur = this.entries[this.sel];
        this.sel = cur.kind === 'music' ? SONG_NAMES.length : 0;
      } else if (e.key === 'Enter' || e.key === ' ') this.play();
      else if (e.key === 's' || e.key === 'S') {
        audio.stopMusic();
        this.nowText.setText('');
      } else if (e.key === 'm' || e.key === 'M') this.nowText.setText(audio.toggleMute() ? 'SOUND OFF' : 'SOUND ON');
      else if (e.key === 'Escape') {
        audio.stopMusic();
        this.scene.start('Title');
        return;
      }
      this.refresh();
    };
    kb.on('keydown', onKey);
    this.events.once('shutdown', () => kb.off('keydown', onKey));
  }

  private play(): void {
    const e = this.entries[this.sel];
    if (e.kind === 'music') {
      audio.stopMusic();
      audio.music(e.name, () => this.nowText.setText(''));
      this.nowText.setText('PLAYING: ' + e.name.toUpperCase());
    } else {
      audio.sfx(e.name);
    }
  }

  private refresh(): void {
    this.rows.forEach((r, i) => {
      const on = i === this.sel;
      r.setText((on ? '> ' : '  ') + this.entries[i].name.toUpperCase());
      r.setTint(on ? P.yellow : P.white);
    });
  }
}
