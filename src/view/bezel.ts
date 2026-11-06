// Arcade-cabinet side art in the bars beside the game (approved style "B"):
// dark panels, neon stripes, a vertical MOOP logo on each side, and the dad and son.
// Drawn on a full-window canvas behind the game, scaled to the same pixel size as the game.
import { T } from '../config/tuning';
import { P, type ColorName } from './palette';
import { GLYPHS } from './glyphs';
import { DAD, SON } from '../art/characters';
import type { SpriteDef } from './sprites';

const BG = '#120a24';
const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');

let canvas: HTMLCanvasElement | null = null;
let game: HTMLCanvasElement | null = null;

export function initBezel(gameCanvas: HTMLCanvasElement): void {
  game = gameCanvas;
  canvas = document.createElement('canvas');
  canvas.id = 'bezel';
  Object.assign(canvas.style, { position: 'fixed', inset: '0', zIndex: '0', pointerEvents: 'none' });
  document.body.prepend(canvas);
  document.body.style.background = BG;
  window.addEventListener('resize', () => requestAnimationFrame(drawBezel));
  drawBezel();
}

function sprite(ctx: CanvasRenderingContext2D, def: SpriteDef, x: number, y: number, s: number, flip = false): void {
  const w = def.rows[0].length;
  const layer = (colors: Record<string, ColorName>, rows: string[]) =>
    rows.forEach((row, ry) =>
      [...row].forEach((ch, rx) => {
        if (ch === '.') return;
        ctx.fillStyle = hex(P[colors[ch]]);
        ctx.fillRect(x + (flip ? w - 1 - rx : rx) * s, y + ry * s, s, s);
      }),
    );
  layer(def.colors, def.rows);
  if (def.layer2) layer(def.layer2.colors, def.layer2.rows);
}

function glyph(ctx: CanvasRenderingContext2D, ch: string, x: number, y: number, s: number, color: string): void {
  ctx.fillStyle = color;
  GLYPHS[ch].split(' ').forEach((row, ry) => [...row].forEach((p, rx) => p === '#' && ctx.fillRect(x + rx * s, y + ry * s, s, s)));
}

export function drawBezel(): void {
  if (!canvas || !game) return;
  const W = window.innerWidth;
  const H = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  const r = game.getBoundingClientRect();
  const px = r.height / T.H; // screen pixels per game pixel
  const u = Math.max(1, Math.round(px)); // art unit

  // bezel lip around the picture
  const pad = 5 * u;
  ctx.fillStyle = '#101014';
  ctx.fillRect(r.left - pad, r.top - pad, r.width + pad * 2, r.height + pad * 2);
  ctx.fillStyle = '#26262e';
  ctx.fillRect(r.left - u, r.top - u, r.width + u * 2, r.height + u * 2);

  const side = r.left - pad; // width of each side panel
  if (side < 12 * u) return; // not enough room for art

  // neon stripes next to the screen
  const stripes = [P.red, P.yellow, P.cyan];
  stripes.forEach((c, i) => {
    ctx.fillStyle = hex(c);
    ctx.globalAlpha = 0.85;
    ctx.fillRect(r.left - pad - (8 + i * 3) * u, 0, 2 * u, H); // left, outermost = red
    ctx.fillRect(r.right + pad + (6 + (2 - i) * 3) * u, 0, 2 * u, H); // right, mirrored
  });
  ctx.globalAlpha = 1;

  const panel = side - 18 * u; // space left beside the stripes
  if (panel < 24 * u) return;

  // vertical MOOP logos, as big as fits
  const s = Math.max(1, Math.min(Math.floor(panel / 2 / 5), Math.floor((r.height * 0.62) / (4 * 9))));
  const logoH = 4 * 9 * s;
  const lx = (cx: number) => Math.round(cx - (5 * s) / 2);
  const ly = r.top + Math.round(r.height * 0.06);
  for (const [cx] of [[panel / 2], [W - panel / 2]]) {
    [...'MOOP'].forEach((ch, i) => {
      glyph(ctx, ch, lx(cx) + s, ly + i * 9 * s + s, s, hex(P.blue));
      glyph(ctx, ch, lx(cx), ly + i * 9 * s, s, hex(P.cyan));
    });
  }

  // the dad (left) and the son (right) under the logos
  const room = r.bottom - (ly + logoH) - 6 * u;
  const dadS = Math.max(1, Math.min(Math.floor(room / 16), Math.floor(panel / 2 / 16)));
  const sonS = Math.max(1, Math.min(Math.floor(room / 32), Math.floor((panel * 0.8) / 48)));
  if (room > 16 * u) {
    sprite(ctx, DAD.dadStand, Math.round(panel / 2 - 8 * dadS), Math.round(r.bottom - 16 * dadS - 4 * u), dadS);
    sprite(ctx, SON.sonCalm, Math.round(W - panel / 2 - 24 * sonS), Math.round(r.bottom - 32 * sonS - 4 * u), sonS, true);
  }
}
