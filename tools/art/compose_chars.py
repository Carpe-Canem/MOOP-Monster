# Lays out the dad, son, objects and review samples as sprite grids.
# Run from the project root:  python tools/art/compose_chars.py .
# Composes the dad and son pixel frames and writes them as text-grid sprite data.
import sys

OUT = sys.argv[1]  # project root

class Grid:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.g = [['.'] * w for _ in range(h)]
    def p(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.g[y][x] = c
    def rect(self, x, y, w, h, c):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.p(xx, yy, c)
    def rows(self, ascii_rows, x0=0, y0=0):
        for y, r in enumerate(ascii_rows):
            for x, c in enumerate(r):
                if c != '.':
                    self.p(x0 + x, y0 + y, c)
    def flipx(self):
        n = Grid(self.w, self.h)
        n.g = [list(reversed(r)) for r in self.g]
        return n
    def lines(self):
        return [''.join(r) for r in self.g]

# ======================================================================= DAD 16x16
# s = skin, r = red cardigan, g = grey (hair, glasses, trousers, shoes). Facing right.
HEAD = [
    '......sss.......',
    '.....gssss......',
    '.....gsgsgsg....',
    '.....gssssss....',
    '......ssss......',
]
HEAD_BACK = [
    '......sss.......',
    '.....gsssg......',
    '.....ggggg......',
    '.....ggggg......',
    '......ggg.......',
]
BODY = [
    '......rrrr......',
    '.....rrrrrr.....',
    '....rrrrrrrr....',
    '....rrrrrrrr....',
    '....rrrrrrrr....',
    '....srrrrrrs....',
    '.....rrrrrr.....',
]
LEGS_STAND = [
    '.....gggggg.....',
    '.....gg..gg.....',
    '.....gg..gg.....',
    '.....ggg.ggg....',
]
LEGS_WALK1 = [
    '.....gggggg.....',
    '....ggg..gg.....',
    '...gg.....gg....',
    '..ggg.....ggg...',
]
LEGS_WALK2 = [
    '.....gggggg.....',
    '......gggg......',
    '......gggg......',
    '......ggggg.....',
]

def dad(head, body, legs):
    g = Grid(16, 16)
    g.rows(head, 0, 0)
    g.rows(body, 0, 5)
    g.rows(legs, 0, 12)
    return g

dad_frames = {}
dad_frames['dadStand'] = dad(HEAD, BODY, LEGS_STAND)
walk_body1 = BODY[:]
walk_body1[5] = '....rrrrrrrrs...'  # front hand swings forward
walk_body2 = BODY[:]
walk_body2[5] = '...srrrrrrrr....'  # back hand swings back
dad_frames['dadWalk1'] = dad(HEAD, walk_body1, LEGS_WALK1)
dad_frames['dadWalk2'] = dad(HEAD, walk_body2, LEGS_WALK2)

jump_body = [
    '......rrrr......',
    '...s.rrrrrr.s...',
    '...rrrrrrrrrr...',
    '....rrrrrrrr....',
    '....rrrrrrrr....',
    '....rrrrrrrr....',
    '.....rrrrrr.....',
]
jump_legs = [
    '.....gggggg.....',
    '....gggggggg....',
    '....gg....ggg...',
    '................',
]
dad_frames['dadJump'] = dad(HEAD, jump_body, jump_legs)

# climbing, seen from behind: hands alternate on the rails
def climb(left_up):
    g = Grid(16, 16)
    g.rows(HEAD_BACK, 0, 0)
    g.rows([
        '......rrrr......',
        '.....rrrrrr.....',
        '....rrrrrrrr....',
        '....rrrrrrrr....',
        '....rrrrrrrr....',
        '....rrrrrrrr....',
        '.....rrrrrr.....',
    ], 0, 5)
    hi, lo = (1, 6) if left_up else (6, 1)
    # left arm
    g.rect(3, hi, 1, 7 - hi + 0, 'r'); g.p(3, hi - 1, 's')
    # right arm
    g.rect(12, lo, 1, 7 - lo + 0, 'r'); g.p(12, lo - 1, 's')
    if left_up:
        g.rows(['.....gggggg.....', '.....gg..gg.....', '.....gg..ggg....', '.....ggg........'], 0, 12)
    else:
        g.rows(['.....gggggg.....', '.....gg..gg.....', '....ggg..gg.....', '.........ggg....'], 0, 12)
    return g

dad_frames['dadClimb1'] = climb(True)
dad_frames['dadClimb2'] = climb(False)
dad_frames['dadBack'] = dad(HEAD_BACK, BODY, LEGS_STAND)

# carrying the bag: both arms reach forward
carry_body = [
    '......rrrr......',
    '.....rrrrrr.....',
    '....rrrrrrrr....',
    '....rrrrrrrrrrss',
    '....rrrrrrrrrrss',
    '....rrrrrrrr....',
    '.....rrrrrr.....',
]
dad_frames['dadCarry1'] = dad(HEAD, carry_body, LEGS_STAND)
dad_frames['dadCarry2'] = dad(HEAD, carry_body, LEGS_WALK1)

# knocked out: sat on the floor, legs out, glasses askew
ko = Grid(16, 16)
ko.rows([
    '......sss.......',
    '.....gssss......',
    '.....gssgsg.....',
    '.....gsgssss....',
    '......ssss......',
    '.....rrrrrr.....',
    '....rrrrrrrr....',
    '...srrrrrrrrs...',
    '....rrrrrrggggg.',
    '.....gggggggggg.',
    '.....ggg.....gg.',
], 0, 5)
dad_frames['dadKO'] = ko

DAD_COLORS = "{ s: 'skin', r: 'red', b: 'brown', v: 'brownDark', g: 'grey2' }"

import copy

def vest(g, front=True, rows=(6, 11)):
    """Brown vest over a red/brown plaid shirt. Vest = 'v', plaid = 'r' + 'b' checks."""
    n = copy.deepcopy(g)
    for y in range(0, 16):
        for x in range(n.w):
            if n.g[y][x] != 'r':
                continue
            in_vest = 5 <= x <= 10 and rows[0] <= y <= rows[1]
            open_front = front and y in (rows[0], rows[0] + 1) and x in (7, 8)
            if in_vest and not open_front:
                n.g[y][x] = 'v'
            elif (x + y) % 2 == 0:
                n.g[y][x] = 'b'
    if front and n.g[5][7] in 'rb':
        n.g[5][7] = 's'; n.g[5][8] = 's'      # open collar
    return n


# the game's dad wears the vest over plaid (approved)
for _k in list(dad_frames):
    dad_frames[_k] = vest(dad_frames[_k], front=not _k.startswith('dadClimb') and _k != 'dadBack', rows=(11, 13) if _k == 'dadKO' else (6, 11))

# ======================================================================= SON 48x32
# Layer 1: s = skin, b = shirt (light blue), n = navy (pyjama base, eyes, outlines)
# Layer 2: h = brown (hair, stubble, brows), r = red (plaid, mouth), w = white (eyes, teeth)
CX = 24

def son_base(pose, stubble='beard'):
    """pose: 'calm' | 'throw' | 'flee'. Returns (layer1, layer2) facing/throwing to the LEFT."""
    a = Grid(48, 32)
    b = Grid(48, 32)

    # ---- legs (pyjama trousers) rows 21-29, feet 30-31
    if pose == 'throw':
        legL = [(17 - i // 3, 21 + i) for i in range(9)]   # angled wide stance
        legR = [(26 + i // 3, 21 + i) for i in range(9)]
    else:
        legL = [(18, 21 + i) for i in range(9)]
        legR = [(25, 21 + i) for i in range(9)]
    for (x, y) in legL + legR:
        a.rect(x, y, 5, 1, 'n')
    a.rect(18, 21, 12, 3, 'n')  # seat
    # plaid: red squares in a navy grid
    for y in range(21, 30):
        for x in range(10, 40):
            if a.g[y][x] == 'n' and x % 3 != 0 and y % 3 != 0:
                b.p(x, y, 'r')
    # bare feet
    fl = legL[-1][0]
    fr = legR[-1][0]
    a.rect(fl - 1, 30, 6, 2, 's')
    a.rect(fr, 30, 6, 2, 's')
    a.p(fl - 1, 31, '.') if False else None

    # ---- t-shirt rows 12-21
    a.rect(16, 13, 16, 9, 'b')
    a.rect(17, 12, 14, 1, 'b')
    a.rect(14, 13, 2, 4, 'b')   # sleeves
    a.rect(32, 13, 2, 4, 'b')
    a.rect(21, 12, 6, 1, 'n')   # neckline
    a.rect(22, 13, 4, 1, 'n')
    a.rect(16, 13, 1, 4, 'n'); a.rect(31, 13, 1, 4, 'n')  # sleeve seams
    a.rect(16, 21, 16, 1, 'n')  # hem shadow

    # ---- arms
    if pose == 'calm':
        a.rect(13, 17, 3, 5, 's'); a.rect(13, 22, 3, 2, 's')   # hanging, slouched
        a.rect(32, 17, 3, 5, 's'); a.rect(32, 22, 3, 2, 's')
    elif pose == 'throw':
        # left arm hurled up over the head; right fist clenched at the hip
        for i in range(11):                      # thick arm thrown up and back
            a.rect(12 - i // 2, 12 - i, 3, 1, 's')
        a.rect(5, 0, 4, 3, 's')                  # hand (the item is drawn in it)
        a.rect(32, 17, 3, 3, 's'); a.rect(32, 20, 4, 3, 's')   # clenched fist
        a.p(35, 21, 'n')
    else:  # flee: both arms up, scrambling away
        for i in range(9):
            a.rect(13 - i // 3, 12 - i, 3, 1, 's')
            a.rect(32 + i // 3, 12 - i, 3, 1, 's')
        a.rect(9, 1, 4, 3, 's'); a.rect(35, 1, 4, 3, 's')

    # ---- neck + head
    a.rect(22, 10, 4, 3, 's')
    a.rect(19, 3, 10, 7, 's')     # face
    a.rect(20, 10, 8, 1, 's')     # jaw
    a.p(18, 5, 's'); a.p(18, 6, 's'); a.p(29, 5, 's'); a.p(29, 6, 's')  # ears

    # bed-head hair (layer 2)
    spikes = [
        '..h..h...h..h.',
        '.hhh.hh.hhh.hh',
        'hhhhhhhhhhhhhh',
        'hhhhhhhhhhhhhh',
        'hh.h.hh..h.hhh',
    ]
    b.rows(spikes, 17, 0)
    # sideburns (+ a full stubble beard in the original 'beard' version)
    for y in ((5, 6, 7) if stubble == 'beard' else (5, 6)):
        b.p(19, y, 'h'); b.p(28, y, 'h')
    if stubble == 'beard':
        for (x, y) in [(19, 8), (20, 9), (21, 10), (26, 10), (27, 9), (28, 8), (22, 10), (25, 10)]:
            b.p(x, y, 'h')

    face = 'upset' if pose == 'throw' else 'calm'
    if face == 'calm':
        b.p(21, 5, 'h'); b.p(22, 5, 'h'); b.p(25, 5, 'h'); b.p(26, 5, 'h')   # relaxed brows
        b.p(21, 6, 'w'); a.p(22, 6, 'n'); a.p(25, 6, 'n'); b.p(26, 6, 'w')  # eyes
        a.p(23, 9, 'n'); a.p(24, 9, 'n')                                     # mouth slightly open
        if stubble == 'beard':
            b.p(23, 10, 'h'); b.p(24, 10, 'h')
    else:
        # angry face: brows slant down into glaring eyes, then a round yelling 'O'
        for (x, y) in [(20, 5), (21, 5), (22, 6), (27, 5), (26, 5), (25, 6)]:
            a.p(x, y, 'n')
        b.p(21, 6, 'w'); b.p(26, 6, 'w')
        a.rect(23, 8, 2, 1, 'n')
        a.p(22, 9, 'n'); b.rect(23, 9, 2, 1, 'r'); a.p(25, 9, 'n')
        a.rect(23, 10, 2, 1, 'n')
        for x in (23, 24):
            b.p(x, 10, '.')                                                 # stubble yields to the mouth
    # 5 o'clock shadow over the jaw, cheeks and upper lip (skips eyes/mouth)
    if stubble in ('shadow', 'dots'):
        zone = [(x, 7) for x in (19, 28)] + [(x, 8) for x in (19, 20, 21, 22, 25, 26, 27, 28)] +                [(x, y) for y in (9, 10) for x in range(20, 28)] + [(x, 11) for x in range(22, 26)]
        for (x, y) in zone:
            if a.g[y][x] != 's' or b.g[y][x] != '.':
                continue
            if stubble == 'shadow':
                # solid shadow on the jaw line, dithered as it fades up the cheeks
                if y >= 9 or (x + y) % 2 == 0:
                    b.p(x, y, 'd')
            else:
                if (x + y) % 2 == 0 and y >= 8:
                    b.p(x, y, 'h')
    return a, b

son_frames = {}
for key, pose in [('sonCalm', 'calm'), ('sonThrow', 'throw'), ('sonFlee', 'flee')]:
    son_frames[key] = son_base(pose, 'shadow')

def slump(step):
    """Defeated trudge for the airport win: head hung low, eyes down, a frown, dragging steps."""
    a, b = son_base('calm', 'shadow')
    # drop the head (rows 0-11, cols 15-32) by 2 px in both layers
    for g in (a, b):
        for y in range(11, -1, -1):
            for x in range(15, 33):
                g.g[y + 2][x] = g.g[y][x]
        for y in (0, 1):
            for x in range(15, 33):
                g.g[y][x] = '.'
    # face (now 2 px lower): closed, downcast eyes and a frown
    for x in (21, 22, 25, 26):
        b.p(x, 8, '.')
        a.p(x, 8, 's')
    for x in (21, 22, 25, 26):
        a.p(x, 9, 'n')
    for (x, y) in [(23, 11), (24, 11)]:
        a.p(x, y, 's')
    for (x, y) in [(22, 12), (25, 12), (23, 11), (24, 11)]:
        a.p(x, y, 'n')
    # shoulders sag: arms hang a pixel lower
    for x in (13, 14, 15, 32, 33, 34):
        a.p(x, 24, 's')
    # dragging feet: one foot lifted per step
    lift = range(18, 24) if step == 0 else range(25, 31)
    for x in lift:
        a.g[31][x] = '.'
        if a.g[29][x] == 'n':
            b.g[29][x] = '.'
    return a, b

son_frames['sonSlump1'] = slump(0)
son_frames['sonSlump2'] = slump(1)

SON_L1 = "{ s: 'skin', b: 'blueLight', n: 'navy' }"
SON_L2 = "{ h: 'brown', r: 'red', w: 'white', d: 'skinShade' }"

# ======================================================================= write TS
def ts_rows(g, indent):
    return '\n'.join(f"{indent}'{r}'," for r in g.lines())

out = []
out.append('// The dad and the son. Hand-placed pixels (layout script: Leonardo concept sheets in')
out.append('// assets/concepts/ for proportions, reference photos for faces and hair).')
out.append("import type { SpriteSet } from '../view/sprites';")
out.append('')
out.append('// Dad (16x16, facing right): s = skin, r/b = red-brown plaid shirt, v = brown vest, g = grey hair/glasses/trousers')
out.append('export const DAD: SpriteSet = {')
for k, g in dad_frames.items():
    out.append(f'  {k}: {{')
    out.append('    maxColors: 5,')
    out.append(f'    colors: {DAD_COLORS},')
    out.append('    rows: [')
    out.append(ts_rows(g, '      '))
    out.append('    ],')
    out.append('  },')
out.append('};')
out.append('')
out.append('// Son (48x32, throwing to the LEFT; flipped for right-hand throws). Two 3-colour layers:')
out.append("//   layer 1: s = skin, b = t-shirt, n = navy;  layer 2: h = hair, r = red, w = white, d = 5 o'clock shadow")
out.append('export const SON: SpriteSet = {')
for k, (l1, l2) in son_frames.items():
    out.append(f'  {k}: {{')
    out.append("    maxColors: 4, // layer 2 adds a skin shade for the five-o-clock shadow")
    out.append(f'    colors: {SON_L1},')
    out.append('    rows: [')
    out.append(ts_rows(l1, '      '))
    out.append('    ],')
    out.append('    layer2: {')
    out.append(f'      colors: {SON_L2},')
    out.append('      rows: [')
    out.append(ts_rows(l2, '        '))
    out.append('      ],')
    out.append('    },')
    out.append('  },')
out.append('};')
out.append('')
out.append('// Sweat drop flung off the son when he throws (3x4)')
out.append('export const FX: SpriteSet = {')
out.append('  sweat: {')
out.append("    colors: { c: 'cyan', w: 'white' },")
out.append("    rows: ['.c.', 'cwc', 'ccc', '.c.'],")
out.append('  },')
out.append('};')
open(OUT + '/src/art/characters.ts', 'w', encoding='utf-8').write('\n'.join(out) + '\n')
print('wrote characters.ts:', len(dad_frames), 'dad frames,', len(son_frames), 'son frames')

# ======================================================================= SAMPLES (review only)
import copy, math

def plaid(g, mode):
    """Turn the dad's red cardigan into a plaid shirt with an open collar."""
    n = copy.deepcopy(g)
    for y in range(n.h):
        for x in range(n.w):
            if n.g[y][x] != 'r':
                continue
            if mode == 'plaid3':          # strict 3 colours: grey check lines on red
                if x % 3 == 1 or y % 3 == 1:
                    n.g[y][x] = 'g'
            else:                         # plaid5: red, dark-red bands, thin cream lines
                if x % 4 == 2 or y % 4 == 0:
                    n.g[y][x] = 'k'
                if (x % 4 == 0 and y % 4 == 2):
                    n.g[y][x] = 'c'
    # open collar: skin V at the neck when seen from the front
    if n.g[6][7] in 'rgkc' and n.g[0][7] == 's':
        n.g[5][7] = 's'; n.g[5][8] = 's'
    return n

SAMPLE_DAD = {}  # dad options settled: vest over plaid is in the game

SAMPLE_SON = {}
for st in ('shadow', 'dots'):
    for key, pose in [('Calm', 'calm'), ('Throw', 'throw')]:
        SAMPLE_SON[f'{st}_son{key}'] = son_base(pose, st)

# ---- better-defined objects (10 px class), hand-placed
def rot90(rows):          # clockwise
    h, w = len(rows), len(rows[0])
    return [''.join(rows[h - 1 - y][x] for y in range(h)) for x in range(w)]

def rot45(rows):          # nearest-neighbour 45° clockwise about the centre
    h, w = len(rows), len(rows[0])
    cx, cy = (w - 1) / 2, (h - 1) / 2
    c, s_ = math.cos(-math.pi / 4), math.sin(-math.pi / 4)
    out = []
    for y in range(h):
        r = ''
        for x in range(w):
            dx, dy = x - cx, y - cy
            sx, sy = dx * c - dy * s_ + cx, dx * s_ + dy * c + cy
            ix, iy = round(sx), round(sy)
            r += rows[iy][ix] if 0 <= ix < w and 0 <= iy < h else '.'
        out.append(r)
    return out

SHAMPOO_V = [
    '....oo....',
    '...owwo...',
    '...oooo...',
    '..olbbbo..',
    '..olwwbo..',
    '..olwwbo..',
    '..olwwbo..',
    '..olbbbo..',
    '..olbbbo..',
    '...oooo...',
]
LOTION_V = [
    '..oooo....',
    '..opppoo..',
    '....op....',
    '...oooo...',
    '..olccco..',
    '..olcwco..',
    '..olcwco..',
    '..olccco..',
    '..olccco..',
    '...oooo...',
]
PROPS2 = {
    'shampooV': (SHAMPOO_V, "{ o: 'greenDark', b: 'green', l: 'greenLight', w: 'white' }"),
    'shampooD': ([
        '.......oo.',
        '......owwo',
        '.....oooo.',
        '....olbbo.',
        '...olwwbo.',
        '..olwwbo..',
        '.olwwbo...',
        '.olbbo....',
        '.obbo.....',
        '..oo......',
    ], "{ o: 'greenDark', b: 'green', l: 'greenLight', w: 'white' }"),
    'shampooH': (rot90(SHAMPOO_V), "{ o: 'greenDark', b: 'green', l: 'greenLight', w: 'white' }"),
    'lotionV': (LOTION_V, "{ o: 'skinShade', c: 'cream', l: 'white', w: 'tan', p: 'pink' }"),
    'lotionD': ([
        '......ooo.',
        '.....opppo',
        '......op..',
        '....oooo..',
        '...olcco..',
        '..olcwco..',
        '.olcwco...',
        '.olcco....',
        '.occo.....',
        '..oo......',
    ], "{ o: 'skinShade', c: 'cream', l: 'white', w: 'tan', p: 'pink' }"),
    'lotionH': (rot90(LOTION_V), "{ o: 'skinShade', c: 'cream', l: 'white', w: 'tan', p: 'pink' }"),
    'razor': ([
        'oooooooooo',
        'obbbbbbbbo',
        'olllllllbo',
        'olgggggwlo',
        'olllllllbo',
        'olgggggwlo',
        'olllllllbo',
        'oooooooooo',
    ], "{ o: 'navy', b: 'blue', l: 'blueLight', g: 'grey2', w: 'white' }"),
    'shadesFront': ([
        'oooooooooo',
        'ownnoownno',
        'onnnoonnno',
        '.ooo..ooo.',
    ], "{ o: 'grey1', n: 'navy', w: 'white' }"),
    'shadesSide': ([
        'oooooooooo',
        '......onno',
        '......owno',
        '.......oo.',
    ], "{ o: 'grey1', n: 'navy', w: 'white' }"),
    'trashEmpty': ([
        '...o..o...',
        '...oooo...',
        '....oo....',
        '...obbo...',
        '..obbbbo..',
        '..olbbbo..',
        '.olbbbbbo.',
        '.olbbwbbo.',
        '.olbwbwbo.',
        '.olbbbbbo.',
        '..obbbbo..',
        '...oooo...',
    ], "{ o: 'navy', b: 'blue', l: 'blueLight', w: 'white' }"),
    'trashMid': ([
        '....o..o....',
        '....oooo....',
        '.....oo.....',
        '....obbo....',
        '...obbbbo...',
        '..olbbbbbo..',
        '.olbbbwbbbo.',
        '.olbbwbwbbo.',
        '.olbwbbbwbo.',
        '.olbwwbwwbo.',
        '.olbbbbbbbo.',
        '..olbbbbbo..',
        '...ooooooo..',
    ], "{ o: 'navy', b: 'blue', l: 'blueLight', w: 'white' }"),
    'trashFull': ([
        '...oo..oo...',
        '..olbooblo..',
        '...oobboo...',
        '....obbo....',
        '..oobbbboo..',
        '.olbbbbbbbo.',
        'olbbbbwbbbbo',
        'olbbbwbwbbbo',
        'olbbwbbbwbbo',
        'olbbwwbwwbbo',
        'olbbbbbbbbbo',
        'olbbbbbbbbbo',
        '.olbbbbbbbo.',
        '..oooooooo..',
    ], "{ o: 'navy', b: 'blue', l: 'blueLight', w: 'white' }"),
    'soap': ([
        '..........',
        '.oooooooo.',
        'owwppppppo',
        'owpllllppo',
        'oppppppppo',
        'opppppppmo',
        '.oooooooo.',
    ], "{ o: 'magenta', p: 'pink', w: 'white', l: 'lavender', m: 'magenta' }"),
    'bag': ([
        '.wwwwwwww.',
        'owddddddwo',
        'oc......co',
        'oc.w....co',
        'oc.w....co',
        'oc......co',
        'oc......co',
        'oc......co',
        'oc......co',
        'oc......co',
        'occccccccо'.replace('о', 'o'),
        '.oooooooo.',
    ], "{ o: 'cyanDark', c: 'cyan', w: 'white', d: 'blueLight' }"),
}

so = []
so.append('// REVIEW SAMPLES ONLY (not used by the game). Generated layout; see tools/samples.ts.')
so.append("import type { SpriteSet } from '../view/sprites';")
so.append('')
so.append('export const SAMPLES: SpriteSet = {')
for k, (g, colors, mx) in SAMPLE_DAD.items():
    so.append(f'  {k}: {{ maxColors: {mx}, colors: {colors}, rows: [')
    so.append(ts_rows(g, '    '))
    so.append('  ] },')
for k, (l1, l2) in SAMPLE_SON.items():
    so.append(f'  {k}: {{ maxColors: 4, colors: {SON_L1}, rows: [')
    so.append(ts_rows(l1, '    '))
    so.append(f"  ], layer2: {{ colors: {{ h: 'brown', r: 'red', w: 'white', d: 'skinShade' }}, rows: [")
    so.append(ts_rows(l2, '    '))
    so.append('  ] } },')
for k, (rows, colors) in PROPS2.items():
    so.append(f'  {k}2: {{ maxColors: 5, colors: {colors}, rows: [')
    so.append('\n'.join(f"    '{r}'," for r in rows))
    so.append('  ] },')
so.append('};')
open(OUT + '/src/art/samples.ts', 'w', encoding='utf-8').write('\n'.join(so) + '\n')
print('wrote samples.ts')

# ======================================================================= OBJECTS (approved -> in game)
GAME_OBJECTS = ['shampooV', 'shampooD', 'shampooH', 'lotionV', 'lotionD', 'lotionH',
                'shadesFront', 'shadesSide', 'soap', 'trashEmpty', 'trashMid', 'trashFull']
oo = []
oo.append('// Thrown toiletries and the recycling bag (10 px class, up to 5 colours: approved "slightly')
oo.append('// modernized" look). Generated by the art layout script; edit the grids freely.')
oo.append("import type { SpriteSet } from '../view/sprites';")
oo.append('')
oo.append('export const OBJECTS: SpriteSet = {')
for k in GAME_OBJECTS:
    rows, colors = PROPS2[k]
    oo.append(f'  {k}: {{')
    oo.append('    maxColors: 5,')
    oo.append(f'    colors: {colors},')
    oo.append('    rows: [')
    oo.append('\n'.join(f"      '{r}'," for r in rows))
    oo.append('    ],')
    oo.append('  },')
oo.append('};')
open(OUT + '/src/art/objects.ts', 'w', encoding='utf-8').write('\n'.join(oo) + '\n')
print('wrote objects.ts')
