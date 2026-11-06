import Phaser from 'phaser';
import { T } from './config/tuning';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';
import { SoundTestScene } from './scenes/SoundTestScene';
import { audio } from './audio/engine';
import { initBezel, drawBezel } from './view/bezel';

// Largest whole-number zoom that fits the window, so pixels stay perfectly square.
const fitZoom = () => Math.max(1, Math.floor(Math.min(window.innerWidth / T.W, window.innerHeight / T.H)));

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: T.W,
  height: T.H,
  backgroundColor: '#000000',
  pixelArt: true,
  audio: { noAudio: true }, // MOOP has its own chiptune engine (src/audio)
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.NO_CENTER, // the page centers the canvas (index.html flexbox)
    zoom: fitZoom(),
  },
  scene: [BootScene, TitleScene, GameScene, GameOverScene, SoundTestScene],
});

window.addEventListener('resize', () => {
  game.scale.setZoom(fitZoom());
  requestAnimationFrame(drawBezel);
});
game.events.once('ready', () => initBezel(game.canvas));

// Dev-only handle for debugging from the browser console (stripped from production builds).
if (import.meta.env.DEV) Object.assign(window, { game, audio });
