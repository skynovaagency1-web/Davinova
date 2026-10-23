"""Builds "Davinova Line", the website's display font, in the same monoline style as the logo.

Each letter is drawn as a centreline on the logo's grid (40-unit cap height, top y=12, baseline y=52, y down),
then stroked at one weight and saved as WOFF2 in three weights. Lowercase maps to the capitals, so it is an
all-caps display face like the wordmark. Run: python3 scripts/build-line-font.py (needs fonttools, brotli,
skia-pathops).
"""
import math
from pathlib import Path

import pathops
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib.path import parse_path

OUT = Path(__file__).resolve().parent.parent / 'public' / 'fonts'
SCALE = 17.5  # 40 logo units -> 700 font units of cap height
SIDE = 4.2    # side bearing in logo units, each side
WEIGHTS = {'Light': (300, 2.4), 'Regular': (400, 3.6), 'Bold': (700, 5.4)}


def circle(cx, cy, r):
    return f'M{cx - r} {cy} A{r} {r} 0 1 1 {cx + r} {cy} A{r} {r} 0 1 1 {cx - r} {cy} Z'


def open_arc(cx, cy, r, gap):  # a C shape opening to the right, gap in degrees either side of 3 o'clock
    a = math.radians(gap)
    x, dy = cx + r * math.cos(a), r * math.sin(a)
    return f'M{x:.2f} {cy - dy:.2f} A{r} {r} 0 1 0 {x:.2f} {cy + dy:.2f}'


S_PATH = 'M23 16.5 C21 13.5 17 12 12.5 12 C6 12 1.5 15.5 1.5 21.5 C1.5 28 7 30 12.5 32 C18 34 24 36 24 42.5 C24 48.5 19 52 12.5 52 C7 52 2.5 50 0 46.5'
Q_MARK = 'M0.5 18 C2 14 6 12 10.5 12 C16.5 12 20.5 15.5 20.5 21 C20.5 26 17 28.5 13.5 31 C11.5 32.5 10.5 34 10.5 36.5 V41'

# glyph: (svg centreline, [filled dots (x, y)])
G = {
    'A': ('M0 52 L14 12 L28 52', []),
    'B': ('M12 31.5 H0 V12 H11.5 C18.5 12 22 16 22 21.5 C22 27 18.5 31.5 11.5 31.5 M11.5 31.5 C19.5 31.5 24 35.5 24 41.7 C24 48 19.5 52 11.5 52 H0 V31.5', []),
    'C': (open_arc(20, 32, 20, 42), []),
    'D': ('M0 12 V52 H8 C22 52 28 44 28 32 C28 20 22 12 8 12 Z', []),
    'E': ('M24 12 H0 V52 H24 M0 32 H20', []),
    'F': ('M24 12 H0 V52 M0 32 H20', []),
    'G': (open_arc(20, 32, 20, 42).split(' A')[0] + ' A20 20 0 1 0 40 32 H23', []),
    'H': ('M0 12 V52 M26 12 V52 M0 32 H26', []),
    'I': ('M0 12 V52', []),
    'J': ('M20 12 V40 C20 47.5 16 52 10 52 C4 52 0 47.5 0 41', []),
    'K': ('M0 12 V52 M24 12 L1.5 32 L24 52', []),
    'L': ('M0 12 V52 H22', []),
    'M': ('M0 52 V12 L16 40 L32 12 V52', []),
    'N': ('M0 52 V12 L26 52 V12', []),
    'O': (circle(20, 32, 20), []),
    'P': ('M0 52 V12 H11.5 C19.5 12 24 17 24 23 C24 29 19.5 34 11.5 34 H0', []),
    'Q': (circle(20, 32, 20) + ' M27 41 L40 55', []),
    'R': ('M0 52 V12 H11.5 C19.5 12 24 17 24 23 C24 29 19.5 34 11.5 34 H0 M11.5 34 L25 52', []),
    'S': (S_PATH, []),
    'T': ('M0 12 H28 M14 12 V52', []),
    'U': ('M0 12 V38 C0 46.5 5 52 13 52 C21 52 26 46.5 26 38 V12', []),
    'V': ('M0 12 L14 52 L28 12', []),
    'W': ('M0 12 L10 52 L20 12 L30 52 L40 12', []),
    'X': ('M0 12 L26 52 M26 12 L0 52', []),
    'Y': ('M0 12 L13 32 L26 12 M13 32 V52', []),
    'Z': ('M0 12 H26 L0 52 H26', []),
    '0': ('M0 32 A13 20 0 1 1 26 32 A13 20 0 1 1 0 32 Z', []),
    '1': ('M3 18.5 L11 12 V52', []),
    '2': ('M1 20 C2 15 6.5 12 12.5 12 C19 12 24 16 24 22 C24 28 20 31.5 14 36.5 L0 52 H25', []),
    '3': ('M1 15.5 C3.5 13 7 12 12 12 C18.5 12 23 15.5 23 21 C23 27 18.5 31 11 31 M11 31 C19 31 24 35 24 41.5 C24 48 19 52 12 52 C7 52 3 50.5 0 48', []),
    '4': ('M20 52 V12 L0 40 H27', []),
    '5': ('M23 12 H3 L1.5 30 C4.5 28.5 8 28 12 28 C19 28 24 33 24 40 C24 47 19 52 12 52 C7 52 3 50 0 47.5', []),
    '6': ('M21 13.5 C18.5 12.5 16 12 13 12 C5 12 0.5 20 0.5 32 V39.5 C0.5 47 5.5 52 12.5 52 C19.5 52 24.5 47 24.5 40.2 C24.5 33.2 19.5 28.5 12.5 28.5 C6.5 28.5 2 32 0.5 37', []),
    '7': ('M0 12 H25 L9 52', []),
    '8': (circle(12, 21.5, 9.5) + ' ' + circle(12, 41.5, 10.5), []),
    '9': ('M4 50.5 C6.5 51.5 9 52 12 52 C20 52 24.5 44 24.5 32 V24.5 C24.5 17 19.5 12 12.5 12 C5.5 12 0.5 17 0.5 23.8 C0.5 30.8 5.5 35.5 12.5 35.5 C18.5 35.5 23 32 24.5 27', []),
    '.': ('', [(0, 50)]),
    ',': ('M1.6 48.5 L-0.8 56', []),
    ':': ('', [(0, 27), (0, 50)]),
    ';': ('M1.6 48.5 L-0.8 56', [(1.2, 27)]),
    '!': ('M0 12 V41', [(0, 50)]),
    '?': (Q_MARK, [(10.5, 50)]),
    '¡': ('M0 23 V52', [(0, 14)]),
    "'": ('M1 12 L0 19', []),
    '’': ('M1.5 12 L0 19', []),
    '‘': ('M0 12 L1.5 19', []),
    '"': ('M1 12 L0 19 M6 12 L5 19', []),
    '“': ('M0 12 L1.5 19 M5 12 L6.5 19', []),
    '”': ('M1.5 12 L0 19 M6.5 12 L5 19', []),
    '-': ('M0 34 H14', []),
    '–': ('M0 34 H22', []),
    '—': ('M0 34 H36', []),
    '/': ('M16 10 L0 54', []),
    '(': ('M8 8 C1.5 19 1.5 45 8 56', []),
    ')': ('M0 8 C6.5 19 6.5 45 0 56', []),
    '+': ('M0 34 H18 M9 25 V43', []),
    '&': ('M25 52 L5.5 26.5 C2.8 23 2.2 20 2.2 17.8 C2.2 14.5 4.8 12 8.6 12 C12.4 12 15 14.5 15 17.8 C15 22.5 10.5 25 6.5 28 C2.5 31 0 34.5 0 39.5 C0 46.8 5 52 12 52 C18 52 22.5 48 25.5 41', []),
    '%': (circle(5.5, 19, 5.5) + ' ' + circle(20.5, 45, 5.5) + ' M24 12 L2 52', []),
    '$': (S_PATH + ' M12.3 7 V57', []),
    '€': (open_arc(21, 32, 18, 45) + ' M0 28.5 H21 M0 36 H19', []),
    '·': ('', [(0, 33)]),
    '|': ('M0 6 V58', []),
}
G['¿'] = ('rot:?', [])

ACCENTS = {
    'acute': ('M-2.6 8.5 L2.6 3', []), 'grave': ('M-2.6 3 L2.6 8.5', []),
    'circ': ('M-5 8.5 L0 3.5 L5 8.5', []), 'dier': ('', [(-4.5, 6), (4.5, 6)]),
    'tilde': ('M-6.5 7 C-4.5 4 -2.5 3.8 0 5.6 C2.5 7.4 4.5 7.2 6.5 4.2', []),
    'cedil': ('M0 52 V55.5 C3.5 55.5 4.6 57 4.6 58.4 C4.6 60.2 2.5 61 0.4 61 C-1.2 61 -2.6 60.6 -3.6 60', []),
}
COMPOSED = {
    'À': ('A', 'grave'), 'Á': ('A', 'acute'), 'Â': ('A', 'circ'), 'Ä': ('A', 'dier'), 'Ç': ('C', 'cedil'),
    'È': ('E', 'grave'), 'É': ('E', 'acute'), 'Ê': ('E', 'circ'), 'Ë': ('E', 'dier'),
    'Í': ('I', 'acute'), 'Î': ('I', 'circ'), 'Ï': ('I', 'dier'), 'Ì': ('I', 'grave'), 'Ñ': ('N', 'tilde'),
    'Ó': ('O', 'acute'), 'Ô': ('O', 'circ'), 'Ö': ('O', 'dier'), 'Ò': ('O', 'grave'),
    'Ú': ('U', 'acute'), 'Ù': ('U', 'grave'), 'Û': ('U', 'circ'), 'Ü': ('U', 'dier'), 'Ÿ': ('Y', 'dier'),
}
ACCENT_X = {'C': 22, 'I': 0}  # where the mark sits; others centre over the letter's drawn width


def centreline(d, transform):
    path = pathops.Path()
    if d:
        parse_path(d, TransformPen(path.getPen(), transform))
    return path


def to_font(x0=0.0):  # logo units (y down) -> font units (y up)
    return (SCALE, 0, 0, -SCALE, -x0 * SCALE, 52 * SCALE)


def draw(d, dots, stroke):
    shape = centreline(d, to_font())
    if d:
        shape.stroke(stroke * SCALE, pathops.LineCap.BUTT_CAP, pathops.LineJoin.MITER_JOIN, 4.5)
    r = stroke * 0.72
    for x, y in dots:
        parse_path(circle(x, y, max(r, 1.9)), TransformPen(shape.getPen(), to_font()))
    shape.simplify()
    return shape


def rotated_question(stroke):
    xs = 21
    shape = draw(Q_MARK, [(10.5, 50)], stroke)
    out = pathops.Path()
    shape.draw(TransformPen(out.getPen(), (-1, 0, 0, -1, xs * SCALE, 2 * 20 * SCALE)))
    out.simplify()
    return out


def letter_width(d):
    p = centreline(d, (1, 0, 0, 1, 0, 0))
    return p.bounds[2] - p.bounds[0], p.bounds[0]


def glyph_shape(ch, stroke):
    if ch == '¿':
        return rotated_question(stroke)
    if ch in COMPOSED:
        base, mark = COMPOSED[ch]
        bd, bdots = G[base]
        w, x0 = letter_width(bd)
        cx = ACCENT_X.get(base, x0 + w / 2)
        if base == 'C' and mark == 'cedil':
            cx = 20
        md, mdots = ACCENTS[mark]
        shape = draw(bd, bdots, stroke)
        mark = centreline(md, (SCALE, 0, 0, -SCALE, cx * SCALE, 52 * SCALE))
        if md:
            mark.stroke(stroke * SCALE * 0.9, pathops.LineCap.BUTT_CAP, pathops.LineJoin.MITER_JOIN, 4.5)
        for x, y in mdots:
            parse_path(circle(x + cx, y, max(stroke * 0.72, 1.9)), TransformPen(mark.getPen(), to_font()))
        mark.draw(shape.getPen())
        shape.simplify()
        return shape
    d, dots = G[ch]
    return draw(d, dots, stroke)


def build(style, weight, stroke):
    chars = list(G) + list(COMPOSED)
    names = {ch: f'u{ord(ch):04X}' for ch in chars}
    order = ['.notdef', 'space'] + [names[c] for c in chars]
    side = SIDE * SCALE
    charstrings, metrics = {}, {}
    empty = T2CharStringPen(0, None)
    charstrings['.notdef'] = empty.getCharString()
    metrics['.notdef'] = (500, 0)
    charstrings['space'] = T2CharStringPen(280, None).getCharString()
    metrics['space'] = (280, 0)
    for ch in chars:
        shape = glyph_shape(ch, stroke)
        xmin, _, xmax, _ = shape.bounds
        shift = side - xmin
        adv = round(xmax - xmin + 2 * side)
        pen = T2CharStringPen(adv, None)
        shape.draw(TransformPen(pen, (1, 0, 0, 1, shift, 0)))
        charstrings[names[ch]] = pen.getCharString()
        metrics[names[ch]] = (adv, round(side))
    cmap = {32: 'space', 160: 'space'}
    for ch in chars:
        cmap[ord(ch)] = names[ch]
        low = ch.lower()
        if low != ch and len(low) == 1:
            cmap[ord(low)] = names[ch]
    fb = FontBuilder(1000, isTTF=False)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    family = 'Davinova Line'
    fb.setupCFF(f'DavinovaLine-{style}', {'FullName': f'{family} {style}'}, charstrings, {})
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=930, descent=-250)
    fb.setupNameTable({'familyName': family, 'styleName': style, 'copyright': 'Davinova'})
    fb.setupOS2(sTypoAscender=930, sTypoDescender=-250, sTypoLineGap=0, usWinAscent=1000, usWinDescent=280,
                sCapHeight=700, sxHeight=700, usWeightClass=weight, fsSelection=0x40 if style == 'Regular' else (0x20 if style == 'Bold' else 0))
    fb.setupPost()
    fb.font.flavor = 'woff2'
    OUT.mkdir(parents=True, exist_ok=True)
    target = OUT / f'davinova-line-{style.lower()}.woff2'
    fb.save(str(target))
    print(target.name, target.stat().st_size, 'bytes')


if __name__ == '__main__':
    for style, (weight, stroke) in WEIGHTS.items():
        build(style, weight, stroke)
