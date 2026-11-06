// The airport's background: a big terminal window at night, with an airliner parked side-on at the
// gate (its open front door sits just right of the son's jet bridge). Deliberately dimmer than the playfield.
// Written against a plain rect() callback so the browser game and the Node mock-up tools share it.
// Original design: a generic airliner, no real airline livery.

export type RectFn = (x: number, y: number, w: number, h: number, color: number) => void;

const SKY = [0x0b0920, 0x100d2c, 0x161238, 0x1d1745, 0x261d52];
const TARMAC = 0x17161e;
const FRAME = 0x2b2a36;
const WALL = 0x120f1a;

// plane colours (dimmed so it sits behind the action)
const BODY = 0x8e8ea6;
const BODY_LIGHT = 0xa8a8bc;
const BELLY = 0x5e5e74;
const STRIPE = 0x2a4a9c;
const WIN_LIT = 0xc9b45c;
const DARK = 0x262636;
const WING = 0x74748c;
const WING_DARK = 0x5a5a70;
const ENGINE = 0x7c7c94;
const GEAR = 0x3c3c50;

export const WINDOW = { top: 22, bottom: 128 };

export function paintAirportBackdrop(rect: RectFn): void {
  const { top, bottom } = WINDOW;
  // terminal wall below the window
  rect(0, bottom, 224, 256 - bottom, WALL);
  for (let x = 14; x < 224; x += 28) rect(x, bottom + 2, 1, 256 - bottom, 0x18141f);

  // night sky in bands, then the horizon and the apron
  const horizon = 72;
  const band = Math.ceil((horizon - top) / SKY.length);
  SKY.forEach((c, i) => rect(0, top + i * band, 224, band, c));
  rect(0, horizon, 224, bottom - horizon, TARMAC);
  rect(0, horizon, 224, 1, 0x2d2640);
  // stars
  for (const [sx, sy] of [[12, 28], [52, 25], [66, 31], [98, 27], [128, 30], [150, 24], [190, 30], [206, 26], [86, 33]]) rect(sx, sy, 1, 1, 0x8888aa);
  // distant control tower (right of the plane's nose)
  rect(206, 40, 6, 32, 0x1f1b30);
  rect(202, 34, 14, 7, 0x2a2440);
  rect(203, 36, 12, 3, 0x6c8cb8);
  rect(208, 30, 2, 4, 0x2a2440);
  rect(208, 29, 1, 1, 0xe83828);
  // apron lights
  for (let x = 4; x < 224; x += 12) rect(x, 80, 1, 1, x % 24 === 4 ? 0x3878f0 : 0xd8b040);
  for (let x = 10; x < 224; x += 18) rect(x, 118, 2, 1, 0x6a5a30);

  paintAirliner(rect, true);
  paintJetway(rect);

  // ---- the window itself: frame, mullions and a transom
  rect(0, top - 2, 224, 3, FRAME);
  rect(0, bottom - 2, 224, 3, FRAME);
  for (const x of [0, 55, 111, 167, 222]) rect(x, top, 2, bottom - top, FRAME);
  rect(0, 80, 224, 1, FRAME);
}

/** The plane's front door and the jet-bridge tunnel (also used by the win sequence). */
export const PLANE_DOOR = { x: 150, y: 39, w: 7, h: 12 };
export const JETWAY = { bottom: { x: 170, y: 129 }, top: { x: 154, y: 50 }, width: 10 };

/**
 * A generic twin-engine airliner, side view, nose to the right, parked across the window.
 * Real proportions: fuselage ~11x longer than tall; wing at the lower middle of the body;
 * engine slung under and ahead of the wing; swept fin and tailplane at the back;
 * the front passenger door just behind the cockpit. `doorOpen` = lit open door; closed after boarding.
 */
export function paintAirliner(rect: RectFn, doorOpen: boolean): void {
  const Y0 = 36; // fuselage top
  const Y1 = 52; // fuselage bottom
  const TAIL = 10; // tail-cone tip x
  const BODY_X0 = 30; // where the cylinder starts (tail cone ends)
  const BODY_X1 = 168; // where the nose starts
  const NOSE = 184; // nose tip x
  const GROUND = 72;

  const shade = (y: number, top: number, bot: number) => (y < top + 2 ? BODY_LIGHT : y > bot - 3 ? BELLY : BODY);
  const column = (x: number, top: number, bot: number) => {
    for (let y = Math.round(top); y <= Math.round(bot); y++) rect(x, y, 1, 1, shade(y, Math.round(top), Math.round(bot)));
  };

  // tailplane (far side, behind the body)
  for (let i = 0; i < 16; i++) rect(TAIL + 2 + i, 40 + Math.floor(i / 6), 3, 1, WING_DARK);
  // vertical fin, swept back, with a blue livery band
  for (let y = 24; y <= Y0; y++) {
    const t = (y - 24) / (Y0 - 24);
    const lx = Math.round(10 + 3 * t);
    const rx = Math.round(19 + 19 * t);
    rect(lx, y, rx - lx, 1, y < 29 ? STRIPE : BODY);
  }
  // tail cone: the belly sweeps up to the tail tip
  for (let x = TAIL; x < BODY_X0; x++) {
    const t = (x - TAIL) / (BODY_X0 - TAIL);
    column(x, Y0 + (1 - t) * 2, Y0 + 5 + t * (Y1 - Y0 - 5));
  }
  // main cylinder
  for (let x = BODY_X0; x < BODY_X1; x++) column(x, Y0, Y1);
  // nose: top curves down to the tip, chin curves up
  const noseTop = (x: number) => Y0 + 8 * Math.pow((x - BODY_X1) / (NOSE - BODY_X1), 1.8);
  for (let x = BODY_X1; x <= NOSE; x++) {
    const t = (x - BODY_X1) / (NOSE - BODY_X1);
    column(x, noseTop(x), Y1 - 5 * Math.pow(t, 2.4));
  }
  // cockpit windows, following the slope of the nose
  for (let x = 171; x <= 178; x++) rect(x, Math.round(noseTop(x)) + 2, 1, 2, DARK);
  // livery stripe and passenger windows
  rect(TAIL + 12, 46, BODY_X1 + 6 - (TAIL + 12), 1, STRIPE);
  for (let x = 40; x < 166; x += 4) {
    if ((x > 146 && x < 160) || (x > 36 && x < 44)) continue; // doors
    rect(x, 40, 2, 2, (x / 4) % 5 === 0 ? DARK : WIN_LIT);
  }
  // doors: rear (closed outline) and the front one
  rect(38, 38, 1, 11, DARK);
  rect(42, 38, 1, 11, DARK);
  const d = PLANE_DOOR;
  if (doorOpen) {
    rect(d.x, d.y, d.w, d.h, DARK);
    rect(d.x + 1, d.y + 1, d.w - 2, d.h - 1, 0xe0c878);
  } else {
    rect(d.x, d.y, 1, d.h, DARK);
    rect(d.x + d.w - 1, d.y, 1, d.h, DARK);
    rect(d.x, d.y, d.w, 1, DARK);
  }

  // wing: root on the lower body, swept back and down toward us
  for (let y = 48; y <= 57; y++) {
    const t = (y - 48) / 9;
    const lx = Math.round(86 - 30 * t);
    const rx = Math.round(122 - 50 * t);
    if (rx > lx) rect(lx, y, rx - lx, 1, y > 55 ? WING_DARK : WING);
  }
  // engine: slung under the wing, ahead of it, intake facing forward (right)
  rect(112, 51, 2, 3, GEAR); // pylon
  rect(100, 53, 26, 8, ENGINE);
  rect(100, 53, 26, 2, BODY_LIGHT);
  rect(100, 59, 26, 2, WING_DARK);
  rect(125, 54, 2, 6, DARK); // intake
  rect(124, 55, 1, 4, 0x3c3c50);
  rect(96, 55, 4, 4, WING_DARK); // exhaust cone
  // landing gear and a soft shadow on the apron
  rect(50, GROUND, 140, 2, 0x0e0d14);
  rect(176, Y1 - 3, 1, GROUND - Y1 + 2, GEAR); // nose gear
  rect(174, GROUND - 3, 5, 3, 0x0a0a10);
  rect(88, Y1, 2, GROUND - Y1 - 2, GEAR); // main gear
  rect(84, GROUND - 4, 10, 4, 0x0a0a10);
}

/** The jet-bridge tunnel from the gate platform's right end up to the plane's front door. */
export function paintJetway(rect: RectFn): void {
  const { bottom: b, top: t, width: w } = JETWAY;
  for (let y = t.y; y <= b.y; y++) {
    const k = (y - t.y) / (b.y - t.y);
    const cx = Math.round(t.x + (b.x - t.x) * k);
    rect(cx - w / 2, y, w, 1, 0x4a4a5e);
    rect(cx - w / 2, y, 1, 1, 0x2e2e3e);
    rect(cx + w / 2 - 1, y, 1, 1, 0x2e2e3e);
    if (y % 6 === 0) rect(cx - 2, y, 4, 2, 0x8c7c48); // little windows along the tube
  }
  // support column (rotunda) under the tunnel
  rect(b.x + 6, 90, 4, b.y - 90 + 1, 0x2e2e3e);
  rect(b.x + 4, b.y + 1, 8, 2, 0x22222e);
}
