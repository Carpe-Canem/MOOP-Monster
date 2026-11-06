// A reusable pool of Images, redrawn each frame. Positions are the sprite's bottom-centre,
// matching the simulation's (x = centre, y = feet) convention.
import type Phaser from 'phaser';

export interface DrawOpts {
  flipX?: boolean;
  flipY?: boolean;
  /** 1 = bottom-anchored (default), 0.5 = centre-anchored */
  originY?: number;
  alpha?: number;
  /** hide every pixel right of this world x (e.g. walking into a tunnel mouth) */
  clipRightX?: number;
}

export class SpriteLayer {
  private pool: Phaser.GameObjects.Image[] = [];
  private used = 0;

  constructor(
    private scene: Phaser.Scene,
    private depth = 0,
  ) {}

  begin(): void {
    this.used = 0;
  }

  draw(key: string, x: number, y: number, o: DrawOpts = {}): void {
    let img = this.pool[this.used];
    if (!img) {
      img = this.scene.add.image(0, 0, key).setDepth(this.depth);
      this.pool.push(img);
    }
    img
      .setTexture(key)
      .setOrigin(0.5, o.originY ?? 1)
      .setPosition(Math.round(x), Math.round(y))
      .setFlip(!!o.flipX, !!o.flipY)
      .setAlpha(o.alpha ?? 1)
      .setVisible(true);
    if (o.clipRightX !== undefined) {
      const left = Math.round(x) - img.width / 2;
      img.setCrop(0, 0, Math.max(0, Math.min(img.width, o.clipRightX - left)), img.height);
    } else if (img.isCropped) img.setCrop();
    this.used++;
  }

  end(): void {
    for (let i = this.used; i < this.pool.length; i++) this.pool[i].setVisible(false);
  }
}
