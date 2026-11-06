# MOOP Monster — Design & Build Plan

*Draft 3 — 2026-11-06 (Milestone 1 built)*

A browser arcade climber in the style of early-80s ramp-and-ladder games. It borrows the genre's mechanics, but the characters, art, music, story and stage layouts are all original.

> **Title: MOOP Monster** (MOOP = *Matter Out Of Place*). The logo is in a 1980s style: a solid, toothpaste-blue **MOOP** in slab capitals with a hard blue drop shadow, over a wild, dripping green-slime **Monster** (option B1, `src/art/logo.ts`, from `assets/concepts/logo/B-slab-slime-1.jpg`). A subtitle card reading **"Matter Out Of Place"** appears under it.

---

## 1. Story premise

The son is due to fly out on a trip. He has packed far too much into his bag and is told he has to leave some of it behind. He loses it and starts hurling his toiletries down through the house. His father climbs up through the mess, cleaning up as he goes, to calm him down.

- **Villain — the son:** in his 40s, but looks and acts younger.
  - **Look:** slim, with tousled brown bed-head hair and a 5 o'clock shadow (no beard). He wears a rumpled light-blue tee and red-and-navy plaid pajama pants, and is barefoot.
  - **Behavior:** he rages on the bunk bed beside his overstuffed suitcase.
  - **Expressions:** calm (a slouchy sway, mouth slightly open) while he isn't throwing. Angry (V brows, glare, yelling mouth) while he winds up, holds the item in his raised fist and throws it, with **sweat drops flying off him**.
- **Hero — the dad:** in his 60s, with balding grey hair and glasses. He wears a brown vest over a red-and-brown plaid shirt, with grey trousers. He climbs up to calm his son.
- **Where the looks came from:** your reference photos, kept in `assets/reference/`, which is excluded from git, and Leonardo concept sheets in `assets/concepts/`. Hair and facial features follow the photos; the clothing is original.
- **No character names.** They are simply "the dad" and "the son".
- **Two stages:** the house, then the airport. Finishing the airport stage wins the game.
- **Ending:** a cutscene of the son on an airplane, looking grumpy.
- The visual designs and the intro story beats are still to come from you (see §11).

---

## 2. Decisions log (as answered)

| Topic | Decision |
|---|---|
| Game feel | **Lightly modernized** arcade feel |
| Forgiveness features | **Fair hitboxes, ladder snap, jump timing grace.** *No* air control. |
| Screen | **Tall arcade, 224×256 native**, scaled up with sharp, square pixels |
| Tech | **Phaser 4 (4.2.1) + TypeScript** (Vite build). You approved moving from Phaser 3 to 4 when 4 turned out to be the current release. Custom arcade movement; Phaser's physics engine is not used. |
| Title | **MOOP Monster** (renamed back from "MOOP"): '80s logo with a solid MOOP and a wild slime Monster, plus the "Matter Out Of Place" subtitle card |
| Characters | **No names:** "the dad" and "the son" |
| Stages | **Two-stage game:** the house (stage 1), then the airport (stage 2). The house is built first. |
| Winning | Clearing the airport stage plays the ending cutscene; the game then continues at harder settings, arcade-style |
| Hazards | **Rolling** (shampoo and lotion bottles) and **bouncing** (sunglasses, soap bars). No straight-down throws for now. |
| Power-up | **Recycling bag** (blue, with a recycle symbol; it replaced the earlier clear liquids bag). Catches thrown items **from any direction**. Walk only, no climbing or jumping. Ends when it's **full** (capacity). |
| Goal | **Reach the villain** at the top of each stage. He **flees to the next stage.** |
| Fall death | **Generous** (casual-friendly): only big drops are fatal |
| Lives | **Unlimited continues.** A continue resets the score to 0. |
| Timer | Bonus timer; **reaching zero kills the hero** |
| Difficulty per loop | **Faster throws only.** The ladder-drop odds, the bouncer/roller mix and the timer stay the same every loop. |
| Controls | **Keyboard only** |
| Extras | **Pause, volume/mute, CRT filter toggle.** Nothing else (no key remapping, no saving of game progress). |
| Saved in browser | **Settings** (music and sound-effect volume, mute, CRT on/off) **and the high-score table** |
| High scores | **Local top 10, 3-letter initials** |
| Audio | **Hybrid:** sound effects synthesized in code; chiptune music in code, with Leonardo optional for drafts and the intro |
| Palette | **Era-style limits:** about 32-color master palette, **3 colors + transparency per sprite** |
| Sprite sizes | **Hero 16×16, villain 48×32** (two layers), thrown items and the bag about 10 px |
| Art revision | You approved going **slightly beyond strict 8-bit**: the son's detail layer has 4 colors (to add the 5 o'clock shadow), the dad has 5 (brown vest over red/brown plaid), and thrown items and the bag have up to 5 (outlines, highlights, labels). The house pieces stay at 3. |
| Death | **Comic knockout:** dad gets bonked, spins, and sits dazed with stars or birdies circling |
| Hosting | Undecided. Built as a **plain static site** that any host can serve. |
| Milestone 1 | **Placeholder art first,** to tune the feel before real sprites go in |

---

## 3. Screen & rendering

- Native resolution 224×256 (an 8 px tile grid of 28×32 tiles), drawn in portrait.
- Phaser runs with `pixelArt: true` and `roundPixels: true`, and the canvas scales up by **whole numbers only** (×2, ×3…) to fit the window, centered by the page.
- **Bezel art** (option B, arcade cabinet) fills the side bars on wide screens: dark panels, neon stripes beside the screen, a vertical MOOP logo on each side, and the dad and son at the bottom. It's drawn at the same pixel size as the game and redrawn on resize (`src/view/bezel.ts`), and it scales the logo and characters to whatever room there is.
- The top 2–3 tile rows hold the score display: `1UP`, `HIGH SCORE`, `BONUS`, the loop number and lives.
- **Optional CRT look**, switched on and off from the pause menu and remembered between visits:
  - scanlines (one per game pixel row, drawn at real screen resolution)
  - a soft glow, a gentle vignette, and rounded tube corners
  - **no barrel curvature:** bending the picture at the native 224×256 resolution dropped whole pixel rows, so a "2" turned into a "7"
- **Attract mode:** after 20 s idle on the title screen, a silent demo plays.
  - An autopilot (`src/sim/bot.ts`) follows a ladder route, jumps rolling bottles and waits at ladder tops.
  - As in arcade demos, the son throws only bottles during the demo.
  - Any key returns to the title.

---

## 4. Core mechanics spec (starting values, all tunable)

All motion runs at a fixed **60 updates per second**. Units are pixels per frame. Every value below lives in one tuning file (`src/config/tuning.ts`).

### 4.1 Dad (player)
| Parameter | Start value |
|---|---|
| Walk speed | 1.0 px/f |
| Climb speed (up/down) | 0.75 px/f |
| Jump | fixed arc, ~14 px high, ~32 frames long, covering ~30 px of ground. **Direction is locked at takeoff.** |
| Jump grace: just after walking off an edge | 5 frames |
| Jump grace: pressing jump slightly early | 6 frames |
| Ladder snap | pressing Up/Down within ±4 px of a ladder's center lines the dad up and starts the climb |
| **Jump off ladders** | Pressing jump on a ladder leaps off it, toward the held direction or the way he last faced, for an easy dismount. Fall distance is measured from the ladder's foot, so dropping back to that floor is always safe. Jumping near the top can carry him up onto the floor above. |
| **Step off ladders** | Pressing left or right on a ladder (without up/down) steps off. Near either end he steps straight onto that floor; partway up he lets go and drops, safely, to the ladder's floor. |
| Hitbox | about 10×12 inside the 16×16 sprite (forgiving). Bottles hit as 8×6, a little shorter than their sprite, so well-timed jump-overs feel fair. |
| **Fall death** | **Generous.** Drops of up to ~28 px are safe, which covers jumping or walking off any ledge onto the floor below within the same level band. Only a drop of about a full floor (~32 px) or more is fatal. Tunable. |
| Ramps | shelves slope gently (about 6–8 px over a shelf's length) and are drawn in 8 px stair-steps; the dad follows the slope automatically. He steps up seams and steps of up to 4 px without jumping. |

### 4.2 Hazards
| Type | Behavior |
|---|---|
| **Rollers** (shampoo, lotion) | Roll downhill along each ramp, fall to the next floor at its end, and reverse direction. At every ladder top they have a **fixed 25% chance** to drop down it. Removed when they leave the screen at the bottom. |
| **Bouncers** (sunglasses, soap) | Bounce down the screen in ~16 px hops, following the slope on each new floor. Dodged by spacing rather than jumping. They never take ladders. |
| Side walls | While airborne, hazards bounce off invisible side walls, so nothing flies off-screen mid-stage. The exception is over the bottom floor, where they leave the screen. |
| Mix | **80% rollers / 20% bouncers**, constant across loops |
| Speed | Rollers ~1.25 px/f |

### 4.3 Villain throwing (the only thing that scales per loop)
- Loop 1: one throw every **~3.0 s** (±0.5 s random).
- Each later loop: throw interval × 0.85, and hazard speed × 1.06.
- Floors: no faster than 1 throw per 1.2 s, and hazard speed at most 1.6× the starting speed.

### 4.4 Recycling bag (power-up)
- **2 per stage**, at fixed spots, hanging above head height. The dad has to **jump into one** to grab it, so picking it up is always a choice.
- While holding it the dad can **walk only** (no climbing, no jumping).
- It catches **both rollers and bouncers**, **from any direction** (front, behind or above). While the dad holds it, any hazard that touches him goes into the bag instead of knocking him out.
- **Capacity 5.** The bag visibly swells (limp, then half-full, then full). When full, the dad ties it off and it's gone. **Time backstop:** 10 s, in case nothing comes.

### 4.5 Scoring & lives
| Event | Points |
|---|---|
| Jump over a hazard | 100 |
| Catch a roller in the bag | 300 |
| Catch a bouncer in the bag | 500 |
| Reach the top | remaining bonus timer value |
| Bonus pickups (optional, e.g. a dropped watch or passport) | 300 / 500 / 800 |

- **3 lives** per credit. **One extra life at 10,000.**
- **Bonus timer:** starts at 5000 and drops by 100 every ~2 s, so about 100 s per attempt. It's the same every loop. **At 0 the dad is knocked out.** It resets on each new life.

### 4.6 Flow
`Title (MOOP Monster logo → "Matter Out Of Place" subtitle card → high scores) → Stage intro card (our own wording) → House → reach top → son flees + bonus tally → Airport → reach top → bonus tally → Ending cutscene (son grumpy on the plane) → next cycle starts at the house with faster throws → …`

- **Before M5,** with only the house built, the house stage loops on its own, getting faster each time.

- **Knockout:** the comic knockout animation plays (about 2 s), the hazards clear, and the dad respawns at the stage start.
- **Game over:**
  1. If the score makes the top 10, the player enters 3 initials.
  2. A `CONTINUE? 9…8…` countdown follows.
  3. Continuing restarts the **current loop's difficulty** with 3 lives and the score reset to 0.
  4. Declining returns to the title screen and the high-score table.
- **Pause:** Esc or P freezes the game and the music and opens the menu: Resume / Music volume / Effects volume / Sound on-off / CRT on-off / Quit to title. Arrow keys pick and adjust. Every setting is saved in the browser immediately.
- **Keys (fixed):** ←/→ or A/D to move, ↑/↓ or W/S to climb, Space or Z to jump, Esc or P to pause, Enter to start.

---

## 5. Stage 1 — "The House" (original layout)

Our own layout, **not** a reskin of any classic stage. It's built from the genre's building blocks (sloped ramps, ladders, a villain on top), and the slope pattern, ladder placement and floor count are designed fresh.

- **Theme:** tilted bookshelves, stair landings and a bunk-bed perch. Ground floor is the living room; the son rages on the bunk bed at the top.
- **As built (Milestone 1)**, from bottom to top:

  | Floor | Shape | What it does |
  |---|---|---|
  | F0 | Flat living-room floor | The dad starts bottom-left. Hazards leave the screen from here. |
  | F1 | One shelf sloping down to the right | Sends hazards toward the right-hand exit |
  | F2 | Two shelves with a **4 px stair-landing step** | Sends hazards left |
  | F3 | One long shelf sloping right | Its left half is a breather. Hazards from the stairwell land mid-shelf. |
  | F4 | A **"V" with a 24 px stairwell gap** in the middle | Funnels everything into the gap. The dad can jump the gap, or drop into it safely. |
  | F5 | A **peaked roof-beam** | Splits the son's throws left and right |
  | Perch | Bunk bed, top-center | The goal. One ladder up to it, at x = 140. |

- **Ladders:** the full ladders alternate sides, so each floor has to be crossed. F1 and F4 offer a choice of route. Five ladders are **broken (only partly climbable)** as bait routes, and rollers can still drop down them.
- **Bags:** one on F1 and one on F4, hanging above head height. You **jump into one** to grab it.
- The fastest clean climb takes about **14–16 s**; the automated test bot does it in 846–959 frames.
- **Layout review:** the planned grid mock-up was skipped. The playable build is the mock-up. The layout is plain data in `src/levels/house.ts`, so changes are quick.

---

## 6. Stage 2 — "The Airport" (built in Milestone 5)

Your picks were baggage belts and security scanners in **one stage, floor by floor**. The goal is the same as the house: **reach the son**. (The strap-release goal was tried and dropped.) The level data is `src/levels/airport.ts`, and `npm run art:airport` draws an annotated mock-up.

| Floor | Theme | Feature |
|---|---|---|
| F0 | Terminal | Start, bottom-left |
| F1 | Security | **Two walk-through scanners.** Each cycles green (walk through) and red (blocks the dad); you must pass both to reach the ladder |
| F2 | Security | **X-ray belt through a tunnel.** Ride it through, and nothing thrown can hit you inside. Also a third scanner and the **confiscation bin**: walk the recycling bag into it for +200 per item, and the bag empties and keeps working |
| F3 | Baggage | **Two belts** with a gap in the middle. An orange beacon flashes, then they reverse. A **suitcase chute** from the left wall drops a stray suitcase about every 14 s |
| Gate | Gate | **The goal.** The son's platform, two ladders up from the belts. It's low in the window, in front of the dark apron, so he stands out from the plane |

- **Routes:** full ladders alternate ends, so every floor and its scanners has to be crossed. Broken ladders are bait, as in the house.
- **Win:** reach the son and he gives up. He trudges off along his platform in a slumped walk, disappears into the jet-bridge tunnel, appears in the plane's door, and boards. The door shuts and **"YOU MADE YOUR FLIGHT!"** appears. Then the bonus count, then the house again, one loop faster.
- **Backdrop:** a big terminal window at night.
  - **Outside:** a twin-engine airliner (a generic design, no real airline) is parked side-on with real proportions, plus a control tower and apron lights.
  - **The jet bridge:** its tunnel runs from the son's platform up to the plane's open door.
  - **Readability:** it's painted darker than the playfield.
  - **Code:** `src/view/airportBackdrop.ts`, shared by the game and the mock-up tool.
- **Rules:**
  - **Floor spacing:** floors are flat and 28 px apart, so every drop between them is a safe fall.
  - **Belts:** about 0.5 px/frame; they reverse every 7 s, after a 1.5 s beacon warning.
  - **Scanners:** a 5 s cycle (about 3.2 s green, 1.8 s red), with a beep as each turns red.
  - **Stray suitcases** knock the dad out even while he holds the bag (they're too big to catch). He can jump them for 100.
  - **Leaving the screen:** items that reach the screen edge over a full-width floor leave instead of ricocheting.
- **The game cycle:** house, then airport, then the house again, faster. Continuing after a game over resumes on the stage you were on. The attract demo shows the house only. Developers can start at the airport with `?stage=airport` (dev server only).
- **Sounds:** bin cash-in, scanner turning red, belt warning, chute thud, plane door shutting.

---

## 7. Art pipeline (Leonardo AI → real pixel art)

AI image models give pixel-*styled* art: uneven "pixels" and too many colors. Every asset therefore goes through a scripted cleanup step:

1. **Generate** in Leonardo from your character designs (reference image plus prompt). Use Kontext or reference editing to keep frames consistent across a character's poses.
2. **Remove the background** with Leonardo's `remove-bg`.
3. **Downscale** to the target grid (16×16 hero, ~48×32 villain, 8–12 px hazards), using nearest-neighbor sampling or majority color per block.
4. **Quantize** to the master palette, with **3 colors + transparency per sprite**.
5. **Hand-touch frames where needed**, then **pack into sprite sheets** with a frame list (JSON).

- **Tooling (built):**
  - `npm run art:pixelize` does steps 3–4. Each target pixel takes the most common palette color in its source block, and the sprite keeps its 3 most-used colors. It writes a sprite snippet and a side-by-side preview. A test on a blurred, enlarged sprite recovered it pixel for pixel.
  - `npm run art:preview` renders every sprite to an enlarged review sheet and flags any that break the 3-color rule.
- **Format:** sprites are text grids in `src/art/*.ts`, one character per pixel, with a small color legend. They become textures when the game boots.
- **Master palette:** 32 colors (`src/view/palette.ts`). Large characters may stack two 3-color layers, as arcade hardware did.
- **Small sprites are drawn by hand.** The toiletries, bag, shelves, bunk bed and suitcase are pixeled directly; Leonardo is kept for the characters, where a concept image helps.
- **Handoff:** the character designs come from **you** before Milestone 2. I won't invent their looks.
- **Animation sets needed:**
  - Dad: walk ×3, climb ×2, jump, knockout ×4, bag-carry walk ×2.
  - Son: idle-rage ×2, throw ×3, flee ×2.
  - Hazards: roll ×4, bounce ×2.
  - The bag: empty → full in 5 steps.

## 8. Audio (built in Milestone 3)

- **Engine:** `src/audio/engine.ts` uses the Web Audio API with a sound-chip palette: pulse waves at 12.5%, 25% and 50% duty, a triangle, and gritty sample-and-hold noise. Nothing comes from audio files.
- **Sound effects:** `src/audio/sfx.ts`, short recipes of a few tones each.
  - The dad: footsteps, ladder taps, jump, landing, a jump-over chime, and the knockout (bonk, a falling wobble, tweeting birdies).
  - The bag: grabbing it, catching (a rustle plus a blip), and tying it off when full.
  - The son: a windup grunt, the throw whoosh, and the sunglasses/soap boing.
  - Scoring: the bonus-tally tick, the extra-life fanfare, and a low-timer beep below 1000.
- **Music:** `src/audio/songs.ts`, all original, written as 4-channel note data (lead, harmony, triangle bass, noise drums).

  | Track | Description |
  |---|---|
  | Title | Cheeky theme in C, 8 bars, loops |
  | Stage | Bouncy theme in G, 16 bars, loops |
  | Bag | Fast, driving loop that plays while the dad holds the recycling bag |
  | Ready | "Get ready" jingle at the start of each stage |
  | Clear | Stage-clear jingle that plays over the bonus tally |
  | Game over | A deflated, wobbly descent |

- **Music follows the game:** the ready jingle plays, then the stage loop. The music switches to the bag loop while the dad holds a bag, stops when he's knocked out, plays the clear jingle at the top, and plays the game-over jingle after a game over.
- **Controls:**
  - **M** mutes, and the setting is remembered in the browser (`src/systems/settings.ts`, which also holds volumes and the CRT flag for M4).
  - **Pause** also pauses the audio.
  - **T** on the title screen opens an arcade-style **SOUND TEST** to audition every track and effect.
- **Browser rule:** sound only starts after the first key press, so the title music begins on the first key.
- **Leonardo audio** stays optional, for intro or cutscene audio in M6.

---

## 9. Project structure

```
MOOP-Monster/
  DESIGN.md, README.md
  index.html, package.json, vite.config.ts, tsconfig.json
  src/
    main.ts                  # Phaser setup: 224x256, pixelArt, whole-number zoom
    config/tuning.ts         # every gameplay number in §4
    levels/house.ts          # stage 1 layout data (airport.ts in M5)
    sim/                     # the gameplay rules: plain TypeScript, no Phaser
      types.ts, level.ts, game.ts
    view/                    # placeholder drawing, pixel font, palette
    scenes/                  # Boot, Title, Game, GameOver (initials + continue)
    systems/storage.ts       # high scores in the browser (settings join in M4)
  tools/simtest.ts           # automated checks of the rules (npm run simtest)
```

- **The rules don't depend on Phaser.** Everything in `src/sim` is plain TypeScript, so it can be tested without a browser and survives framework changes. Phaser only draws, reads the keyboard and switches scenes.
- **Build:** Vite produces a static `dist/` folder that can go on any static host.

---

## 10. Milestones

| # | Deliverable |
|---|---|
| **M1** ✓ | **Playable house stage with placeholder art.** Covers movement, ladders, jump and grace, rollers and bouncers, the bag, scoring, the bonus timer, lives, knockout, loop and difficulty scaling, game over → initials → continue, and the local high-score table. Goal: tune the feel. |
| **M2** ✓ | Real sprites. You supply the character designs; we run them through Leonardo and the cleanup pipeline (§7); the house tileset gets drawn. |
| **M3** ✓ | Audio: sound effects plus the title, stage and jingle music. |
| **M4** ✓ | Polish: CRT toggle, pause menu with volume and mute (both saved in the browser), title screen with the MOOP logo and the "Matter Out Of Place" subtitle card, attract demo, screen-side bezel art. |
| **M5** ✓ | Airport stage (stage 2), the house → airport cycle, and the **win condition**. |
| **M6** ✓ | Intro cutscene ("packing panic", 4 panels) and ending cutscene (grumpy son on the plane, 3 panels). `src/scenes/CutsceneScene.ts`: pixel panels with typewriter captions; Enter advances, Esc skips. The intro plays Title → Game; the ending pauses the game after the airport tally, then the next loop starts. |
| **M7** | Production build, hosting choice, deploy. |

---

## 11. Open questions (with proposed defaults)

**Settled in draft 2:**
- It's a two-stage game (house → airport) with an ending.
- Settings are remembered between visits.
- Falls are generous.
- The bag catches from all around.
- The characters have no names.
- The title is MOOP, with the "Matter Out Of Place" subtitle card.

**Still open:**
1. **Airport mechanic** (§6), needed before M5. *Proposed:* baggage conveyors. Alternatives are lifts or the pull-the-pins finale.
2. **Character designs**, needed before M2: your descriptions or reference images for the dad, the son, the suitcase and the toiletries.
3. **Intro story beats**, needed before M6.
