// Every gameplay number lives here (DESIGN.md §4). Units: pixels and frames at 60 fps.

export const T = {
  W: 224,
  H: 256,
  FPS: 60,

  dad: {
    walk: 1.0,          // px/frame
    climb: 0.75,        // px/frame
    jumpVy: 1.75,       // initial upward speed -> ~14 px apex, ~32 frame arc
    gravity: 0.11,      // px/frame²
    maxFall: 3.0,
    coyote: 5,          // frames after walking off an edge where jump still works
    jumpBuffer: 6,      // frames an early jump press is remembered
    ladderSnap: 4,      // ± px from ladder centre that still grabs it
    ladderYTol: 3,      // how close feet must be to a ladder end to grab it
    stepUp: 4,          // max seam/step height walked over automatically
    safeFall: 28,       // drops up to this many px are survivable (generous)
    hitW: 10,
    hitH: 12,
    minX: 6,
    maxX: 218,
  },

  ladder: {
    brokenClimb: 10,    // how far up a broken ladder the dad can climb
  },

  roller: {
    speed: 1.25,
    fallVx: 0.6,
    ladderSpeed: 1.0,
    ladderDropChance: 0.25, // constant every loop
    hitW: 8,
    hitH: 6,            // a little shorter than the sprite: fair jump-overs
  },

  bouncer: {
    speed: 1.1,
    hopVy: 1.9,         // ~16 px hops
    hitW: 8,
    hitH: 8,
  },

  // Side walls that airborne hazards bounce off (except over the bottom floor, where they exit)
  hazardWallL: 4,
  hazardWallR: 220,
  hazardGravity: 0.11,
  hazardMaxFall: 3.0,

  throw: {
    baseInterval: 180,  // frames between throws on loop 1 (~3 s)
    jitter: 30,         // ± frames
    windup: 24,
    perLoopMult: 0.85,  // interval × this each loop
    minInterval: 72,    // never faster than 1.2 s
    bouncerShare: 0.2,  // constant every loop
    firstDelay: 50,
    tossVx: 1.4,        // throw arc from the son's hand
    tossVy: 1.6,
    angryHold: 24,      // frames the angry face stays after a throw
  },

  speedPerLoop: 1.06,
  maxSpeedMult: 1.6,

  bag: {
    capacity: 5,
    maxFrames: 600,     // 10 s backstop
    hang: 20,           // bag centre this far above the floor: only reachable by jumping
  },

  score: {
    jumpOver: 100,
    catchRoller: 300,
    catchBouncer: 500,
    extraLifeAt: 10000,
  },

  bonus: {
    start: 5000,
    step: 100,
    everyFrames: 120,
  },

  // ---- airport (stage 2)
  suitcase: {
    speed: 0.5,         // slides along floors; belts add their own speed
    hitW: 10,
    hitH: 8,
  },
  gate: {
    period: 300,        // frames per scanner cycle
    red: 110,           // of which red (blocked)
  },
  beltWarn: 90,         // beacon flashes this many frames before a belt reverses
  binPointsPerItem: 200,
  board: {
    walk: 0.35,         // the son's defeated trudge speed
    tunnel: 50,         // frames hidden in the jet bridge
    door: 45,           // frames seen in the plane door
    done: 150,          // door shut + "YOU MADE YOUR FLIGHT!"
  },

  lives: 3,
  readyFrames: 100,   // long enough for the 'get ready' jingle
  deathFrames: 150,
  clearFrames: 110,
} as const;
