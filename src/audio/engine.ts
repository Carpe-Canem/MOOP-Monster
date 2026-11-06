// A small chiptune sound engine on the Web Audio API.
// Voices: pulse waves (12.5 / 25 / 50 % duty), a triangle, and crunchy sample-and-hold noise,
// the same palette as an early-80s sound chip. Everything is synthesized; no audio files.
import { SFX, type Tone } from './sfx';
import { SONGS, type Song, type Inst } from './songs';
import { settings, saveSettings } from '../systems/settings';

type Wave = 'p12' | 'p25' | 'p50' | 'tri' | 'noise';

const NOTE: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

/** "C#5" -> Hz (A4 = 440). */
export function noteHz(n: string): number {
  const m = /^([A-G]#?)(-?\d)$/.exec(n);
  if (!m) throw new Error('bad note ' + n);
  const semis = NOTE[m[1]] + (Number(m[2]) + 1) * 12; // MIDI number
  return 440 * Math.pow(2, (semis - 69) / 12);
}

interface NoteEv {
  step: number;
  len: number; // steps
  inst: Inst;
  note: string; // note name, '-' rest, or drum letter
}

/** Parse a song into timed events. Tokens: "G4:2", "-:1" (rest), drums "k:1 s:1 h:1"; '|' = bar line. */
function compile(song: Song): { events: NoteEv[]; length: number } {
  const events: NoteEv[] = [];
  let length = 0;
  for (const ch of song.channels) {
    let step = 0;
    for (const tok of ch.notes.split(/\s+/)) {
      if (!tok || tok === '|') continue;
      const [n, d] = tok.split(':');
      const len = d ? Number(d) : 1;
      if (n !== '-') events.push({ step, len, inst: ch.inst, note: n });
      step += len;
    }
    length = Math.max(length, step);
  }
  events.sort((a, b) => a.step - b.step);
  return { events, length };
}

const INST_WAVE: Record<Inst, Wave> = { lead: 'p25', harm: 'p12', bass: 'tri', drums: 'noise', lead2: 'p50' };
const INST_VOL: Record<Inst, number> = { lead: 0.17, harm: 0.07, bass: 0.26, drums: 0.13, lead2: 0.12 };

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private pulses: Partial<Record<Wave, PeriodicWave>> = {};
  private noise!: AudioBuffer;
  private settings = settings;
  private musicPaused = false;

  // music state
  private current: string | null = null;
  private compiled: ReturnType<typeof compile> | null = null;
  private song: Song | null = null;
  private stepDur = 0;
  private nextStep = 0;
  private nextTime = 0;
  private timer: number | null = null;
  private onEnd: (() => void) | null = null;

  get muted(): boolean {
    return this.settings.muted;
  }

  /** Dev/testing: tap the master output (e.g. to measure levels). */
  get output(): { ctx: AudioContext | null; node: AudioNode | null } {
    return { ctx: this.ctx, node: this.ctx ? this.master : null };
  }

  get playing(): string | null {
    return this.current;
  }

  /** Must be called from a user gesture (key press) before anything is audible. */
  unlock(): void {
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
      this.master.connect(this.ctx.destination);
      for (const [w, duty] of [['p12', 0.125], ['p25', 0.25], ['p50', 0.5]] as const) this.pulses[w] = this.pulseWave(duty);
      this.noise = this.makeNoise();
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private pulseWave(duty: number): PeriodicWave {
    const n = 64;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let i = 1; i < n; i++) real[i] = (2 * Math.sin(Math.PI * i * duty)) / (Math.PI * i);
    return this.ctx!.createPeriodicWave(real, imag);
  }

  /** Sample-and-hold white noise: gritty, like a hardware noise channel. */
  private makeNoise(): AudioBuffer {
    const sr = this.ctx!.sampleRate;
    const buf = this.ctx!.createBuffer(1, sr, sr);
    const d = buf.getChannelData(0);
    let v = 0;
    for (let i = 0; i < d.length; i++) {
      if (i % 3 === 0) v = Math.random() * 2 - 1;
      d[i] = v;
    }
    return buf;
  }

  // ---------------------------------------------------------------- settings
  applyVolumes(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setValueAtTime(this.settings.muted ? 0 : 1, t);
    this.musicBus.gain.setValueAtTime(this.musicPaused ? 0 : this.settings.music, t);
    this.sfxBus.gain.setValueAtTime(this.settings.sfx, t);
  }

  toggleMute(): boolean {
    this.setMuted(!this.settings.muted);
    return this.settings.muted;
  }

  setMuted(on: boolean): void {
    this.settings.muted = on;
    saveSettings();
    this.applyVolumes();
  }

  /** v in 0..1 */
  setMusicVolume(v: number): void {
    this.settings.music = Math.max(0, Math.min(1, v));
    saveSettings();
    if (!this.musicPaused) this.applyVolumes();
  }

  setSfxVolume(v: number): void {
    this.settings.sfx = Math.max(0, Math.min(1, v));
    saveSettings();
    this.applyVolumes();
  }

  /** Freeze the music (pause menu) while keeping sound effects audible for menu blips. */
  pauseMusic(on: boolean): void {
    if (!this.ctx || on === this.musicPaused) return;
    this.musicPaused = on;
    const t = this.ctx.currentTime;
    if (on) {
      if (this.timer !== null) window.clearInterval(this.timer);
      this.timer = null;
      this.musicBus.gain.setValueAtTime(0, t);
    } else {
      this.musicBus.gain.setValueAtTime(this.settings.music, t);
      if (this.song) {
        this.nextTime = t + 0.05;
        this.timer = window.setInterval(() => this.schedule(), 25);
      }
    }
  }

  // ---------------------------------------------------------------- one voice
  private voice(wave: Wave, f0: number, f1: number, start: number, dur: number, vol: number, bus: GainNode, decay = true): void {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.connect(bus);
    let src: AudioScheduledSourceNode;
    if (wave === 'noise') {
      const n = ctx.createBufferSource();
      n.buffer = this.noise;
      n.loop = true;
      // "pitch" the noise: higher rate = hissier
      n.playbackRate.setValueAtTime(Math.max(0.05, f0 / 1000), start);
      if (f1 !== f0) n.playbackRate.linearRampToValueAtTime(Math.max(0.05, f1 / 1000), start + dur);
      src = n;
    } else {
      const o = ctx.createOscillator();
      if (wave === 'tri') o.type = 'triangle';
      else o.setPeriodicWave(this.pulses[wave]!);
      o.frequency.setValueAtTime(f0, start);
      if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), start + dur);
      src = o;
    }
    src.connect(g);
    // instant attack, optional decay to a quarter, then a tiny release so notes don't click
    const endV = decay ? Math.max(0.0005, vol * 0.25) : vol;
    g.gain.setValueAtTime(vol, start);
    if (decay) g.gain.exponentialRampToValueAtTime(endV, start + dur);
    else g.gain.setValueAtTime(endV, start + dur);
    g.gain.linearRampToValueAtTime(0, start + dur + 0.012);
    src.start(start);
    src.stop(start + dur + 0.02);
  }

  // ---------------------------------------------------------------- sound effects
  sfx(name: string): void {
    if (!this.ctx || this.settings.muted) return;
    const recipe: Tone[] | undefined = SFX[name];
    if (!recipe) return;
    const t0 = this.ctx.currentTime + 0.005;
    for (const t of recipe) this.voice(t.wave, t.f0, t.f1 ?? t.f0, t0 + (t.at ?? 0), t.d, t.v, this.sfxBus, t.decay ?? true);
  }

  // ---------------------------------------------------------------- music
  /** Start a song (no-op if it is already playing). onEnd fires when a non-looping song finishes. */
  music(name: string, onEnd?: () => void): void {
    if (!this.ctx) return;
    if (this.musicPaused) this.pauseMusic(false);
    if (this.current === name) return;
    this.stopMusic();
    const song = SONGS[name];
    if (!song) return;
    this.current = name;
    this.song = song;
    this.compiled = compile(song);
    this.stepDur = 60 / song.bpm / song.stepsPerBeat;
    this.nextStep = 0;
    this.nextTime = this.ctx.currentTime + 0.06;
    this.onEnd = onEnd ?? null;
    this.timer = window.setInterval(() => this.schedule(), 25);
    this.schedule();
  }

  stopMusic(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.current = null;
    this.song = null;
    this.compiled = null;
    this.musicPaused = false;
    // silence anything already scheduled
    if (this.ctx) {
      const old = this.musicBus;
      old.gain.setValueAtTime(0, this.ctx.currentTime);
      old.disconnect();
      this.musicBus = this.ctx.createGain();
      this.musicBus.connect(this.master);
      this.musicBus.gain.setValueAtTime(this.settings.music, this.ctx.currentTime);
    }
  }

  /** Pause/resume everything (used by the pause key). */
  suspend(on: boolean): void {
    if (!this.ctx) return;
    if (on) void this.ctx.suspend();
    else void this.ctx.resume();
  }

  private schedule(): void {
    const ctx = this.ctx!;
    const c = this.compiled;
    const song = this.song;
    if (!c || !song) return;
    const ahead = ctx.currentTime + 0.12;
    while (this.nextTime < ahead) {
      const local = this.nextStep % c.length;
      if (!song.loop && this.nextStep >= c.length) {
        const done = this.onEnd;
        const endName = this.current;
        window.setTimeout(() => {
          if (this.current === endName) {
            this.stopMusic();
            done?.();
          }
        }, Math.max(0, (this.nextTime - ctx.currentTime) * 1000));
        if (this.timer !== null) window.clearInterval(this.timer);
        this.timer = null;
        return;
      }
      for (const ev of c.events) {
        if (ev.step !== local) continue;
        this.playNote(ev, this.nextTime);
      }
      this.nextStep++;
      this.nextTime += this.stepDur;
    }
  }

  private playNote(ev: NoteEv, at: number): void {
    const dur = ev.len * this.stepDur * 0.92;
    const vol = INST_VOL[ev.inst];
    if (ev.inst === 'drums') {
      // k = kick, s = snare, h = hat
      if (ev.note === 'k') {
        this.voice('tri', 160, 45, at, 0.09, 0.5, this.musicBus);
      } else if (ev.note === 's') {
        this.voice('noise', 900, 600, at, 0.08, vol, this.musicBus);
      } else {
        this.voice('noise', 4000, 4000, at, 0.025, vol * 0.5, this.musicBus);
      }
      return;
    }
    const hz = noteHz(ev.note);
    this.voice(INST_WAVE[ev.inst], hz, hz, at, dur, vol, this.musicBus, ev.inst !== 'bass');
  }
}

export const audio = new SoundEngine();
