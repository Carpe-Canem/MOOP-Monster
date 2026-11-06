// The pause menu: Resume / Music vol / Effects vol / Sound on-off / CRT on-off / Easy on-off / Quit.
// Every change is saved in the browser immediately.
import Phaser from 'phaser';
import { ctext, text } from './font';
import { P } from './palette';
import { audio } from '../audio/engine';
import { settings, saveSettings } from '../systems/settings';
import { crtOn, setCrt } from './crt';

type Item = 'resume' | 'music' | 'sfx' | 'sound' | 'crt' | 'easy' | 'quit';
const ITEMS: Item[] = ['resume', 'music', 'sfx', 'sound', 'crt', 'easy', 'quit'];

export class PauseMenu {
  private root: Phaser.GameObjects.Container;
  private rows: Phaser.GameObjects.BitmapText[] = [];
  private sel = 0;
  visible = false;

  constructor(
    scene: Phaser.Scene,
    private onResume: () => void,
    private onQuit: () => void,
  ) {
    const g = scene.add.graphics();
    g.fillStyle(P.navy, 0.94).fillRect(34, 76, 156, 115);
    g.lineStyle(1, P.cyan, 1).strokeRect(34.5, 76.5, 155, 114);
    const title = ctext(scene, 112, 82, 'PAUSED', P.yellow);
    const hint = ctext(scene, 112, 179, 'ENTER SELECT  P RESUME', P.grey1);
    this.rows = ITEMS.map((_, i) => text(scene, 46, 96 + i * 11, ''));
    this.root = scene.add.container(0, 0, [g, title, hint, ...this.rows]).setDepth(20).setVisible(false);

    const kb = scene.input.keyboard!;
    const onKey = (e: KeyboardEvent) => {
      if (this.visible) this.key(e);
    };
    kb.on('keydown', onKey);
    scene.events.once('shutdown', () => kb.off('keydown', onKey));
  }

  open(): void {
    this.visible = true;
    this.sel = 0;
    this.root.setVisible(true);
    this.refresh();
  }

  close(): void {
    this.visible = false;
    this.root.setVisible(false);
  }

  private bar(v: number): string {
    const n = Math.round(v * 10);
    return '#'.repeat(n) + '-'.repeat(10 - n);
  }

  private label(item: Item): string {
    switch (item) {
      case 'resume':
        return 'RESUME';
      case 'music':
        return `MUSIC   ${this.bar(settings.music)}`;
      case 'sfx':
        return `EFFECTS ${this.bar(settings.sfx)}`;
      case 'sound':
        return `SOUND   ${settings.muted ? 'OFF' : 'ON'}`;
      case 'crt':
        return `CRT     ${crtOn() ? 'ON' : 'OFF'}`;
      case 'easy':
        return `EASY    ${settings.easy ? 'ON' : 'OFF'}`;
      case 'quit':
        return 'QUIT TO TITLE';
    }
  }

  private refresh(): void {
    this.rows.forEach((r, i) => {
      const on = i === this.sel;
      r.setText((on ? '> ' : '  ') + this.label(ITEMS[i]));
      r.setTint(on ? P.yellow : P.white);
    });
  }

  private key(e: KeyboardEvent): void {
    const item = ITEMS[this.sel];
    const step = (dir: number) => {
      if (item === 'music') audio.setMusicVolume(Math.round((settings.music + dir * 0.1) * 10) / 10);
      else if (item === 'sfx') audio.setSfxVolume(Math.round((settings.sfx + dir * 0.1) * 10) / 10);
      else if (item === 'sound') audio.setMuted(!settings.muted);
      else if (item === 'crt') setCrt(!crtOn());
      else if (item === 'easy') {
        settings.easy = !settings.easy;
        saveSettings();
      }
      else return;
      audio.sfx('tick');
    };
    switch (e.key) {
      case 'ArrowUp':
        this.sel = (this.sel + ITEMS.length - 1) % ITEMS.length;
        audio.sfx('climb');
        break;
      case 'ArrowDown':
        this.sel = (this.sel + 1) % ITEMS.length;
        audio.sfx('climb');
        break;
      case 'ArrowLeft':
        step(-1);
        break;
      case 'ArrowRight':
        step(1);
        break;
      case 'Enter':
      case ' ':
        if (item === 'resume') this.onResume();
        else if (item === 'quit') this.onQuit();
        else step(1);
        break;
    }
    if (this.visible) this.refresh();
  }
}
