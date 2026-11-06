import Phaser from 'phaser';
import { registerFont } from '../view/font';
import { registerSprites } from '../view/sprites';
import { PROPS } from '../art/props';
import { OBJECTS } from '../art/objects';
import { LOGO } from '../art/logo';
import { DAD, FX, SON } from '../art/characters';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    registerFont(this);
    registerSprites(this, [PROPS, OBJECTS, DAD, SON, FX, LOGO]);
    this.scene.start('Title');
  }
}
