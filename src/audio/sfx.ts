// Sound-effect recipes. Each effect is a few tones: wave, start/end frequency (Hz; for noise,
// higher = hissier), start offset (s), duration (s) and volume. All original, all synthesized.
export interface Tone {
  wave: 'p12' | 'p25' | 'p50' | 'tri' | 'noise';
  f0: number;
  f1?: number;
  at?: number;
  d: number;
  v: number;
  decay?: boolean;
}

const arp = (wave: Tone['wave'], notes: number[], step: number, v: number, d = step): Tone[] =>
  notes.map((f, i) => ({ wave, f0: f, at: i * step, d, v }));

export const SFX: Record<string, Tone[]> = {
  // ---- the dad
  step: [{ wave: 'tri', f0: 180, f1: 120, d: 0.03, v: 0.18 }],
  climb: [{ wave: 'p12', f0: 520, f1: 480, d: 0.025, v: 0.07 }],
  jump: [{ wave: 'p25', f0: 260, f1: 720, d: 0.13, v: 0.16 }],
  land: [{ wave: 'noise', f0: 300, d: 0.035, v: 0.1 }],
  jumpOver: arp('p50', [988, 1319], 0.05, 0.1),
  knockout: [
    { wave: 'noise', f0: 700, f1: 200, d: 0.08, v: 0.25 }, // bonk
    { wave: 'p50', f0: 880, f1: 660, at: 0.06, d: 0.12, v: 0.14 },
    { wave: 'p50', f0: 740, f1: 520, at: 0.2, d: 0.12, v: 0.13 },
    { wave: 'p50', f0: 620, f1: 400, at: 0.34, d: 0.12, v: 0.12 },
    { wave: 'p50', f0: 500, f1: 180, at: 0.48, d: 0.35, v: 0.12 },
    // birdies tweeting
    ...arp('p12', [2093, 2637, 2093, 2637, 2093, 2637], 0.07, 0.05, 0.04).map((t) => ({ ...t, at: (t.at ?? 0) + 0.95 })),
  ],

  // ---- the recycling bag
  bagGet: [{ wave: 'noise', f0: 2500, f1: 1200, d: 0.08, v: 0.08 }, ...arp('p25', [523, 659, 784, 1047], 0.045, 0.12).map((t) => ({ ...t, at: (t.at ?? 0) + 0.05 }))],
  catch: [
    { wave: 'noise', f0: 1800, f1: 700, d: 0.07, v: 0.12 }, // rustle
    { wave: 'p25', f0: 660, f1: 1320, at: 0.02, d: 0.07, v: 0.12 },
  ],
  bagDone: [
    { wave: 'noise', f0: 1500, f1: 400, d: 0.18, v: 0.12 }, // tie it off
    { wave: 'p25', f0: 784, at: 0.12, d: 0.06, v: 0.1 },
    { wave: 'p25', f0: 523, at: 0.19, d: 0.1, v: 0.1 },
  ],

  // ---- the son and his throwing
  windup: [{ wave: 'p50', f0: 140, f1: 110, d: 0.12, v: 0.08 }], // grunt
  throw: [
    { wave: 'noise', f0: 600, f1: 2200, d: 0.12, v: 0.09 }, // whoosh
    { wave: 'p12', f0: 420, f1: 210, d: 0.12, v: 0.07 },
  ],
  boing: [{ wave: 'tri', f0: 220, f1: 520, d: 0.07, v: 0.14 }],

  // ---- the airport
  bin: arp('p50', [1047, 1319, 1568, 2093], 0.05, 0.1), // cha-ching
  gateRed: [
    { wave: 'p50', f0: 880, d: 0.06, v: 0.06 },
    { wave: 'p50', f0: 660, at: 0.08, d: 0.08, v: 0.06 },
  ],
  beltWarn: [
    { wave: 'p12', f0: 1175, d: 0.05, v: 0.06 },
    { wave: 'p12', f0: 1175, at: 0.12, d: 0.05, v: 0.06 },
  ],
  chute: [
    { wave: 'noise', f0: 500, f1: 200, d: 0.12, v: 0.1 }, // suitcase thuds out of the chute
    { wave: 'tri', f0: 140, f1: 70, d: 0.1, v: 0.18 },
  ],
  doorShut: [
    { wave: 'tri', f0: 220, f1: 90, d: 0.12, v: 0.25 }, // the plane door thunks shut
    { wave: 'noise', f0: 400, f1: 150, d: 0.1, v: 0.12 },
  ],

  // ---- scoring
  tick: [{ wave: 'p50', f0: 1760, d: 0.025, v: 0.05 }],
  extraLife: arp('p25', [784, 988, 1175, 1568, 1175, 1568], 0.06, 0.12),
  timeLow: [{ wave: 'p50', f0: 1319, d: 0.05, v: 0.07 }],
};

export const SFX_NAMES = Object.keys(SFX);
