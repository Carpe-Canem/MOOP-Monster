# Turns the auto-pixelized logo concept into the final logo sprite (src/art/logo.ts).
# Run from the project root:  python tools/art/clean_logo.py .
# Cleans the auto-pixelized B1 logo into the final MOOP Monster logo sprite.
import re, sys
root = sys.argv[1]
t = open(root + '/assets/pixel/logo/logo_B-slab-slime-1.ts.txt').read()
rows = re.findall(r"^\s+'([^']+)',$", t, re.M)
H, W = len(rows), len(rows[0])
g = [list(r) for r in rows]
# source legend: a black, b brownDark, c greenDark, d green, e cyan, f greenLight
GREENS = set('cdf')

def at(x, y):
    return g[y][x] if 0 <= x < W and 0 <= y < H else '.'

# ---- masks
moop = [[False] * W for _ in range(H)]
slime = [[None] * W for _ in range(H)]
for y in range(H):
    for x in range(W):
        c = g[y][x]
        if c == 'e':
            moop[y][x] = True
        elif c in GREENS and y >= 66:
            slime[y][x] = c
        elif c == 'c' and y < 66:
            moop[y][x] = True  # stray dark pixels inside MOOP letters
# close 1-px pinholes / bumps in MOOP
for _ in range(2):
    nm = [row[:] for row in moop]
    for y in range(H):
        for x in range(W):
            n = sum(1 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= x + dx < W and 0 <= y + dy < H and moop[y + dy][x + dx])
            if not moop[y][x] and n >= 3:
                nm[y][x] = True
            elif moop[y][x] and n <= 1:
                nm[y][x] = False
    moop = nm
# despeckle the slime: a pixel unlike all 4 neighbours that agree becomes that colour
for _ in range(2):
    ns = [row[:] for row in slime]
    for y in range(H):
        for x in range(W):
            if slime[y][x] is None:
                continue
            nb = [slime[y + dy][x + dx] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= x + dx < W and 0 <= y + dy < H]
            nb = [v for v in nb if v]
            if len(nb) >= 3 and all(v == nb[0] for v in nb) and slime[y][x] != nb[0]:
                ns[y][x] = nb[0]
            if len(nb) == 0:
                ns[y][x] = None
    slime = ns

# ---- compose: shadow (navy, offset 2,3) < outline (black) < MOOP (cyan + white shine) < slime
SX, SY = 2, 3
OW, OH = W + SX, H + SY
out = [['.'] * OW for _ in range(OH)]
for y in range(H):
    for x in range(W):
        if moop[y][x]:
            out[y + SY][x + SX] = 'n'
for y in range(H):
    for x in range(W):
        if moop[y][x]:
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < OW and 0 <= yy < OH and out[yy][xx] != 'e':
                        out[yy][xx] = 'k'
for y in range(H):
    for x in range(W):
        if moop[y][x]:
            out[y][x] = 'e'
            # a little shine along each letter's top edge
            if y > 0 and not moop[y - 1][x] and (y + 1 < H and moop[y + 1][x]):
                out[y][x] = 'w'
# slime outline (black) so it reads over the cyan, then the slime itself
for y in range(H):
    for x in range(W):
        if slime[y][x]:
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < OW and 0 <= yy < OH and not (0 <= xx < W and 0 <= yy < H and slime[yy][xx]):
                        out[yy][xx] = 'k'
MAP = {'f': 'l', 'd': 'g', 'c': 'd'}
for y in range(H):
    for x in range(W):
        if slime[y][x]:
            out[y][x] = MAP[slime[y][x]]

# trim empty border
ys = [y for y in range(OH) if any(c != '.' for c in out[y])]
xs = [x for x in range(OW) if any(out[y][x] != '.' for y in range(OH))]
out = [r[min(xs):max(xs) + 1] for r in out[min(ys):max(ys) + 1]]
lines = [''.join(r) for r in out]
legend = "{ e: 'cyan', w: 'white', n: 'blue', k: 'black', l: 'greenLight', g: 'green', d: 'greenDark' }"
ts = ["// The MOOP Monster title logo (approved option B1): solid toothpaste-blue MOOP with a hard",
      "// blue drop shadow, and wild dripping-slime Monster lettering. Pixelized from the Leonardo",
      "// concept (assets/concepts/logo/B-slab-slime-1.jpg), then cleaned by tools/art scripts.",
      "import type { SpriteSet } from '../view/sprites';",
      "",
      "export const LOGO: SpriteSet = {",
      "  logo: {",
      "    maxColors: 7,",
      f"    colors: {legend},",
      "    rows: ["]
ts += [f"      '{l}'," for l in lines]
ts += ["    ],", "  },", "};", ""]
open(root + '/src/art/logo.ts', 'w', encoding='utf-8').write('\n'.join(ts))
print('logo', len(lines[0]), 'x', len(lines))
