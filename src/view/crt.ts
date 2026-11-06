// Optional CRT look (DESIGN.md: "CRT filter toggle").
//  - vignette: a Phaser 4 camera filter
//  - scanlines, glow, rounded tube corners: a CSS overlay at real screen resolution, so there
//    is exactly one scanline per game pixel row at any zoom level
// No barrel curvature: bending the picture at the native 224x256 resolution drops whole pixel
// rows (digits like '2' turned into '7'), so the tube shape comes from the rounded corners.
import type Phaser from 'phaser';
import { T } from '../config/tuning';
import { settings, saveSettings } from '../systems/settings';

const live = new Map<Phaser.Scene, Phaser.Filters.Controller[]>();
let overlay: HTMLDivElement | null = null;
let canvas: HTMLCanvasElement | null = null;

export function crtOn(): boolean {
  return settings.crt;
}

/** Call from every scene's create(). */
export function attachCrt(scene: Phaser.Scene): void {
  canvas = scene.game.canvas;
  applyTo(scene);
  scene.events.once('shutdown', () => live.delete(scene));
  ensureOverlay();
  layout();
}

export function setCrt(on: boolean): void {
  settings.crt = on;
  saveSettings();
  for (const scene of [...live.keys()]) applyTo(scene);
  layout();
}

function applyTo(scene: Phaser.Scene): void {
  const cam = scene.cameras.main;
  for (const f of live.get(scene) ?? []) cam.filters.external.remove(f);
  const added: Phaser.Filters.Controller[] = [];
  if (settings.crt) {
    added.push(cam.filters.external.addVignette(0.5, 0.5, 1.0, 0.22));
  }
  live.set(scene, added);
}

function ensureOverlay(): void {
  if (overlay) return;
  overlay = document.createElement('div');
  overlay.id = 'crt';
  Object.assign(overlay.style, { position: 'fixed', pointerEvents: 'none', zIndex: '5' });
  document.body.appendChild(overlay);
  window.addEventListener('resize', () => requestAnimationFrame(layout));
}

/** Size the overlay to the canvas and draw one scanline per game pixel row. */
export function layout(): void {
  if (!overlay || !canvas) return;
  const r = canvas.getBoundingClientRect();
  const px = r.height / T.H; // screen pixels per game pixel
  if (!settings.crt) {
    overlay.style.display = 'none';
    canvas.style.filter = '';
    canvas.style.borderRadius = '';
    return;
  }
  const dark = Math.max(1, Math.round(px / 3));
  Object.assign(overlay.style, {
    display: 'block',
    left: `${r.left}px`,
    top: `${r.top}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
    borderRadius: `${px * 7}px`,
    background: `repeating-linear-gradient(to bottom, transparent 0, transparent ${px - dark}px, rgba(0,0,0,0.32) ${px - dark}px, rgba(0,0,0,0.32) ${px}px)`,
    boxShadow: `inset 0 0 ${px * 8}px rgba(0,0,0,0.45)`,
  });
  canvas.style.filter = 'brightness(1.12) contrast(1.06) saturate(1.12) drop-shadow(0 0 2px rgba(255,255,255,0.18))';
  canvas.style.borderRadius = `${px * 7}px`;
}
