// MOOP master palette: 32 colours, era-style. Every sprite picks at most 3 of these
// (plus transparency). Large characters may stack two 3-colour layers, like arcade
// multi-sprite characters.
export const P = {
  black: 0x000000,
  white: 0xfcfcfc,
  grey1: 0xbcbcc4,
  grey2: 0x7c7c88,
  grey3: 0x404048,

  skin: 0xf8b888,
  skinShade: 0xc87850,

  brownDark: 0x583018,
  brown: 0x8c4c20,
  wood: 0xb86c30,
  woodLight: 0xe0a060,
  tan: 0xd8b070,

  redDark: 0xa01810,
  red: 0xe83828,
  pink: 0xf8a0c0,
  magenta: 0xc03888,

  orange: 0xf08830,
  yellow: 0xf8d838,
  cream: 0xf8e8b8,

  greenDark: 0x186818,
  green: 0x38b838,
  greenLight: 0x98e870,

  cyanDark: 0x1878a0,
  cyan: 0x68d8f0,

  navy: 0x182878,
  blue: 0x2858d8,
  blueLight: 0x88a8f8,

  purpleDark: 0x482078,
  purple: 0x8848c8,
  lavender: 0xc8a0f0,
} as const;

export type ColorName = keyof typeof P;

