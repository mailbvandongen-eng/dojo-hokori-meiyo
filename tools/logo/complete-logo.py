"""Maakt het officiële logo compleet en scherp uit de bron (tools/logo/logo-bron.png, 447x447 JPEG-achtig).

1. Vergroot 8x en deelt elke pixel in als wit, rood of zwart (de drie logokleuren), zodat
   JPEG-ruis verdwijnt en de randen strak worden.
2. Maakt het canvas groter, zodat niets meer tegen de rand zit.
3. Vult de drie penseelstreken aan die links door de uitsnede waren afgesneden
   (twee streekbeginnen en het einde van een neergaande streek).
4. Schaalt terug met anti-aliasing en schrijft:
   assets/logo-officieel.png      1024 px, wit plaatje met afgeronde hoeken (voor donkere schermen)
   assets/logo-officieel-vrij.png 1024 px, transparante achtergrond rond het logo
   tools/logo/logo-master.png     2000 px, wit vierkant (drukwerk, banners)
Gebruik: python3 tools/logo/complete-logo.py
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
src = Image.open(os.path.join(HERE, 'logo-bron.png')).convert('RGB')
W0 = src.size[0]

CANVAS = 500          # canvas in bron-eenheden
DX, DY = 46.5, 26.0   # verschuiving van de bron op het canvas
SS = 8                # rekenschaal
N = CANVAS * SS

a0 = np.asarray(src).astype(float)
blk0 = (a0[..., 0] < 110) & (a0[..., 1] < 110) & (a0[..., 2] < 110)
red0 = (a0[..., 0] > 150) & (a0[..., 1] < 110) & (a0[..., 2] < 110)
RED = tuple(int(v) for v in np.median(a0[red0], axis=0))
BLACK = tuple(int(v) for v in np.median(a0[blk0], axis=0))
WHITE = (255, 255, 255)

# 1. vergroten en indelen
big = src.resize((W0 * SS, W0 * SS), Image.LANCZOS).filter(ImageFilter.GaussianBlur(SS * 0.35))
b = np.asarray(big).astype(float)
pal = np.array([WHITE, RED, BLACK], float)
d = ((b[:, :, None, :] - pal[None, None]) ** 2).sum(-1)
lab = d.argmin(-1).astype(np.uint8)
lab = ndimage.median_filter(lab, size=SS + 1)

L = np.zeros((N, N), np.uint8)  # 0 wit, 1 rood, 2 zwart
ox, oy = int(DX * SS), int(DY * SS)
L[oy:oy + lab.shape[0], ox:ox + lab.shape[1]] = lab

# 2./3. afgesneden streken aanvullen (coördinaten in bron-eenheden)
img = Image.fromarray(L)
dr = ImageDraw.Draw(img)
P = lambda x, y: ((x + DX) * SS, (y + DY) * SS)
def ellipse(cx, cy, rx, ry):
    dr.ellipse([P(cx - rx, cy - ry), P(cx + rx, cy + ry)], fill=2)
def poly(pts):
    dr.polygon([P(x, y) for x, y in pts], fill=2)
def bezier(p0, p1, p2, n=24):
    return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]) for t in np.linspace(0, 1, n)]

# streek 1: begin van de schuin oplopende horizontale streek (y 157-185 op de rand)
ellipse(1.5, 171, 13, 14.5)
poly([(1, 157.5), (8, 157), (8, 185), (1, 185)])
# streek 2: begin van de horizontale streek (y 280-302)
ellipse(2, 291.5, 11, 11.5)
poly([(1, 280.5), (8, 280.5), (8, 302), (1, 302)])
# streek 3: neergaande streek naar linksonder (y 357-378) die uitloopt in een punt
top = bezier((1.5, 356.5), (-12, 368), (-24, 392))
bot = bezier((-24, 392), (-8, 382), (1.5, 378.5))
poly(top + bot[1:] + [(4, 378.5), (4, 356.5)])

L = np.asarray(img)

# 4. kleuren en terugschalen
rgb = np.zeros((N, N, 3), np.uint8)
for i, c in enumerate([WHITE, RED, BLACK]):
    rgb[L == i] = c
full = Image.fromarray(rgb)
master = full.resize((2000, 2000), Image.LANCZOS)
master.save(os.path.join(HERE, 'logo-master.png'))

# transparante variant: alleen wit dat aan de buitenkant grenst wordt doorzichtig
outside = ndimage.binary_fill_holes(L != 0)  # alles binnen de vormen
inner_white = (L == 0) & outside
# wit binnen de cirkel (tussen de Kanku-punten) blijft wit: vul de cirkel als vorm
cy, cx = (242.5 + DY) * SS, (214.5 + DX) * SS
yy, xx = np.ogrid[:N, :N]
circle = (yy - cy) ** 2 + (xx - cx) ** 2 <= (196.5 * SS) ** 2
alpha = np.where((L != 0) | circle | inner_white, 255, 0).astype(np.uint8)
rgba = np.dstack([rgb, alpha])
Image.fromarray(rgba, 'RGBA').resize((1024, 1024), Image.LANCZOS).save(os.path.join(ROOT, 'assets', 'logo-officieel-vrij.png'))

# wit plaatje met afgeronde hoeken
S = 1024
plate = Image.new('RGBA', (S, S), (0, 0, 0, 0))
mask = Image.new('L', (S * 4, S * 4), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, S * 4 - 1, S * 4 - 1], radius=int(S * 4 * 0.12), fill=255)
mask = mask.resize((S, S), Image.LANCZOS)
plate.paste(master.resize((S, S), Image.LANCZOS), (0, 0), mask)
plate.save(os.path.join(ROOT, 'assets', 'logo-officieel.png'))
for s in (512, 192):
    plate.resize((s, s), Image.LANCZOS).save(os.path.join(ROOT, 'assets', f'icon-{s}.png'))
print('kleuren', RED, BLACK, '→ klaar')
