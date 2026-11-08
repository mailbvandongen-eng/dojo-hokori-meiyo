"""Maakt assets/logo.svg (embleem) en assets/logo-wordmark.svg uit tools/glyphs.json.

De kanji zijn penseelpaden uit het OFL-font Yuji Boku (zie tools/extract-glyphs.py),
zodat het logo er op elk toestel hetzelfde uitziet, ook zonder Japanse fonts.
Dit is een benadering: vervang het door het officiële dojo-logo zodra dat er is
(zet assets/logo-officieel.png neer; de game gebruikt dat dan automatisch).
"""
import json, os
here = os.path.dirname(os.path.abspath(__file__))
G = json.load(open(os.path.join(here, 'glyphs.json'), encoding='utf-8'))
RED, DARK, GOLD, WHITE = '#b1101f', '#0d0d0f', '#d9a441', '#fbf7ee'
SANS = "font-family=\"'Arial Black','Helvetica Neue',Arial,sans-serif\""

def glyph(ch, x, y, size, fill):
    s = size / 100
    return f'<path transform="translate({x:.1f} {y:.1f}) scale({s:.3f})" fill="{fill}" d="{G[ch]["d"]}"/>'

def emblem():
    p = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" role="img" aria-label="Dojo Hokori Meiyo - Eer &amp; Trots">',
         '<defs><radialGradient id="r" cx="50%" cy="42%" r="60%"><stop offset="0" stop-color="#d4202f"/><stop offset="1" stop-color="#6e0610"/></radialGradient>',
         '<path id="top" d="M 80 300 A 220 220 0 0 1 520 300"/><path id="bot" d="M 62 300 A 238 238 0 0 0 538 300"/></defs>',
         f'<circle cx="300" cy="300" r="292" fill="{DARK}"/>',
         f'<circle cx="300" cy="300" r="284" fill="none" stroke="{GOLD}" stroke-width="5"/>',
         f'<circle cx="300" cy="300" r="196" fill="url(#r)" stroke="{GOLD}" stroke-width="4"/>',
         f'<text {SANS} font-size="50" font-weight="900" fill="{WHITE}" letter-spacing="5" text-anchor="middle"><textPath href="#top" startOffset="50%">DOJO HOKORI MEIYO</textPath></text>',
         f'<text {SANS} font-size="38" font-weight="900" fill="{GOLD}" letter-spacing="8" text-anchor="middle" dominant-baseline="hanging"><textPath href="#bot" startOffset="50%">EER &amp; TROTS</textPath></text>',
         f'<circle cx="62" cy="300" r="9" fill="{GOLD}"/><circle cx="538" cy="300" r="9" fill="{GOLD}"/>',
         glyph('極', 222, 118, 160, WHITE), glyph('真', 222, 268, 160, WHITE),
         glyph('誇', 128, 236, 46, GOLD), glyph('り', 128, 282, 46, GOLD),
         glyph('名', 428, 236, 46, GOLD), glyph('誉', 428, 282, 46, GOLD),
         '</svg>']
    return '\n'.join(p)

def wordmark():
    p = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 300" role="img" aria-label="Dojo Hokori Meiyo - Eer &amp; Trots">',
         f'<rect x="10" y="20" width="250" height="260" rx="18" fill="{RED}"/>',
         glyph('極', 55, 30, 130, WHITE), glyph('真', 55, 148, 130, WHITE),
         f'<text x="290" y="120" {SANS} font-size="92" font-weight="900" fill="{WHITE}" letter-spacing="2">DOJO</text>',
         f'<text x="290" y="215" {SANS} font-size="70" font-weight="900" fill="{WHITE}">HOKORI MEIYO</text>',
         f'<rect x="292" y="236" width="690" height="4" fill="{GOLD}"/>',
         f'<text x="292" y="282" {SANS} font-size="36" font-weight="900" fill="{GOLD}" letter-spacing="12">EER &amp; TROTS</text>',
         '</svg>']
    return '\n'.join(p)

out = os.path.join(here, '..', 'assets')
open(os.path.join(out, 'logo.svg'), 'w', encoding='utf-8').write(emblem())
open(os.path.join(out, 'logo-wordmark.svg'), 'w', encoding='utf-8').write(wordmark())
print('ok')
