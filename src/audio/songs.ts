// Original chiptune music for MOOP, written as note data.
// Tokens are "NOTE:steps" ("G4:2"), rests "-:steps", drums "k" kick / "s" snare / "h" hat.
// '|' marks bar lines (ignored by the player). One step = 1/stepsPerBeat of a beat.
export type Inst = 'lead' | 'lead2' | 'harm' | 'bass' | 'drums';

export interface Song {
  bpm: number;
  stepsPerBeat: number;
  loop: boolean;
  channels: { inst: Inst; notes: string }[];
}

// ---------------------------------------------------------------- chord helpers (8-step bars)
// [bass root, bass fifth, harmony tone A, harmony tone B]
const CH: Record<string, [string, string, string, string]> = {
  C: ['C3', 'G2', 'E4', 'G4'],
  G: ['G2', 'D3', 'B3', 'D4'],
  D: ['D3', 'A2', 'F#4', 'A4'],
  Am: ['A2', 'E3', 'C4', 'E4'],
  Em: ['E2', 'B2', 'G3', 'B3'],
  Dm: ['D3', 'A2', 'F4', 'A4'],
  F: ['F2', 'C3', 'A3', 'C4'],
};

/** Bass: root/fifth on the beat. A bar is one chord ("G") or two half-bar chords ("C/D"). */
const oompah = (bars: string[]) =>
  bars
    .map((b) => {
      const [a, c] = b.split('/');
      if (!c) return `${CH[a][0]}:2 ${CH[a][1]}:2 ${CH[a][0]}:2 ${CH[a][1]}:2`;
      return `${CH[a][0]}:2 ${CH[a][1]}:2 ${CH[c][0]}:2 ${CH[c][1]}:2`;
    })
    .join(' | ');

/** Driving eighth-note bass for the power-up loop. */
const drive = (bars: string[]) =>
  bars
    .map((b) => {
      const r = CH[b][0];
      const up = r.replace(/\d/, (d) => String(Number(d) + 1));
      return `${r}:1 ${up}:1 ${r}:1 ${up}:1 ${r}:1 ${up}:1 ${r}:1 ${up}:1`;
    })
    .join(' | ');

/** Harmony: chord stabs on the off-beats (tick-tock). */
const offbeats = (bars: string[]) =>
  bars
    .map((b) => {
      const [a, c] = b.split('/');
      const x = CH[a];
      const y = CH[c ?? a];
      return `-:1 ${x[2]}:1 -:1 ${x[3]}:1 -:1 ${y[2]}:1 -:1 ${y[3]}:1`;
    })
    .join(' | ');

const repeat = (bar: string, n: number) => Array(n).fill(bar).join(' | ');

// ---------------------------------------------------------------- songs
// Stage theme ("The House"): bouncy, a bit frantic, in G. 16 bars, loops.
const STAGE_CHORDS = ['G', 'G', 'C', 'G', 'G', 'D', 'C/D', 'D', 'C', 'Am', 'D', 'G', 'C', 'Em/D', 'C/D', 'G'];
const stage: Song = {
  bpm: 140,
  stepsPerBeat: 2,
  loop: true,
  channels: [
    {
      inst: 'lead',
      notes: `
        G4:1 -:1 B4:1 D5:1 G5:2 F#5:1 E5:1 | D5:1 -:1 B4:1 D5:1 E5:2 D5:2 |
        C5:1 -:1 A4:1 C5:1 E5:2 D5:1 C5:1 | B4:2 A4:2 G4:2 -:2 |
        G4:1 -:1 B4:1 D5:1 G5:2 A5:1 G5:1 | F#5:1 -:1 E5:1 F#5:1 G5:2 E5:2 |
        D5:1 C5:1 B4:1 A4:1 G4:1 A4:1 B4:1 C5:1 | D5:4 -:4 |
        E5:2 E5:1 D5:1 C5:2 B4:2 | A4:2 C5:2 E5:4 |
        D5:2 D5:1 C5:1 B4:2 A4:2 | G4:2 B4:2 D5:4 |
        C5:1 D5:1 E5:1 C5:1 D5:1 E5:1 F#5:1 D5:1 | E5:1 F#5:1 G5:1 E5:1 F#5:2 D5:2 |
        G5:1 F#5:1 E5:1 D5:1 C5:1 B4:1 A4:1 F#4:1 | G4:4 -:4`,
    },
    { inst: 'harm', notes: offbeats(STAGE_CHORDS) },
    { inst: 'bass', notes: oompah(STAGE_CHORDS) },
    { inst: 'drums', notes: repeat('k:1 h:1 s:1 h:1 k:1 k:1 s:1 h:1', 16) },
  ],
};

// Title theme: cheeky and a little sly, in C. 8 bars, loops.
const TITLE_CHORDS = ['C', 'Dm', 'C', 'G', 'F', 'C/Am', 'Dm/G', 'C'];
const title: Song = {
  bpm: 112,
  stepsPerBeat: 2,
  loop: true,
  channels: [
    {
      inst: 'lead',
      notes: `
        C5:2 E5:1 G5:1 -:1 E5:1 C5:2 | D5:2 F5:1 A5:1 -:1 F5:1 D5:2 |
        E5:1 F5:1 G5:2 C6:2 B5:1 A5:1 | G5:6 -:2 |
        A5:2 G5:1 F5:1 E5:2 D5:2 | C5:1 D5:1 E5:1 G5:1 A5:2 G5:2 |
        F5:1 E5:1 D5:1 C5:1 D5:2 G4:2 | C5:6 -:2`,
    },
    { inst: 'harm', notes: offbeats(TITLE_CHORDS) },
    { inst: 'bass', notes: oompah(TITLE_CHORDS) },
    { inst: 'drums', notes: repeat('k:2 h:2 s:2 h:2', 8) },
  ],
};

// Recycling-bag power-up: short, fast, driving loop while the dad holds the bag.
const BAG_CHORDS = ['Am', 'C', 'Am', 'G'];
const bag: Song = {
  bpm: 176,
  stepsPerBeat: 2,
  loop: true,
  channels: [
    {
      inst: 'lead',
      notes: `
        E5:1 E5:1 G5:1 E5:1 A5:1 G5:1 E5:1 D5:1 | C5:1 C5:1 E5:1 C5:1 D5:1 E5:1 D5:1 B4:1 |
        E5:1 E5:1 G5:1 E5:1 A5:1 B5:1 C6:1 A5:1 | G5:2 E5:1 D5:1 B4:2 D5:2`,
    },
    { inst: 'bass', notes: drive(BAG_CHORDS) },
    { inst: 'drums', notes: repeat('k:1 h:1 s:1 h:1 k:1 h:1 s:1 s:1', 4) },
  ],
};

// Stage-start jingle ("get ready").
const ready: Song = {
  bpm: 150,
  stepsPerBeat: 4,
  loop: false,
  channels: [
    { inst: 'lead', notes: 'C5:1 E5:1 G5:1 C6:2 -:1 G5:1 C6:4 -:5' },
    { inst: 'lead2', notes: '-:4 E5:2 -:1 E5:1 G5:4 -:4' },
    { inst: 'bass', notes: 'C3:4 G2:4 C3:4 -:4' },
  ],
};

// Stage-clear jingle (the son gets away, bonus tally follows).
const clear: Song = {
  bpm: 150,
  stepsPerBeat: 4,
  loop: false,
  channels: [
    { inst: 'lead', notes: 'G4:1 C5:1 E5:1 G5:1 C6:2 G5:1 C6:1 E6:6 -:2 D6:1 C6:1 B5:1 G5:1 C6:12' },
    { inst: 'lead2', notes: '-:4 E5:2 -:2 G5:6 -:2 F5:4 E5:12' },
    { inst: 'bass', notes: 'C3:2 G3:2 C3:2 E3:2 C3:4 G2:4 F2:4 G2:4 C3:8' },
    { inst: 'drums', notes: 'k:2 s:2 k:2 s:2 k:4 s:4 k:2 s:2 k:2 s:2 k:8' },
  ],
};

// Game over: a deflated, wobbly descent.
const gameover: Song = {
  bpm: 96,
  stepsPerBeat: 4,
  loop: false,
  channels: [
    { inst: 'lead', notes: 'G4:3 -:1 F#4:3 -:1 F4:3 -:1 E4:10 -:2' },
    { inst: 'bass', notes: 'C3:4 B2:4 A#2:4 A2:10 -:2' },
  ],
};

export const SONGS: Record<string, Song> = { title, stage, bag, ready, clear, gameover };
export const SONG_NAMES = Object.keys(SONGS);
