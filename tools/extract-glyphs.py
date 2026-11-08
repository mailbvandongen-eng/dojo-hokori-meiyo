import sys, json
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
f = TTFont(sys.argv[1]); gs = f.getGlyphSet(); cmap = f.getBestCmap(); upm = f['head'].unitsPerEm
asc = f['hhea'].ascent
out = {}
for ch in sys.argv[2]:
    g = cmap[ord(ch)]
    pen = SVGPathPen(gs)
    # flip y, scale to 100 units per em, origin top-left
    tp = TransformPen(pen, (100/upm, 0, 0, -100/upm, 0, 100*0.88))
    gs[g].draw(tp)
    out[ch] = {"d": pen.getCommands(), "adv": gs[g].width*100/upm}
json.dump(out, open(sys.argv[3], 'w'))
print(upm, asc, {k: (len(v['d']), v['adv']) for k,v in out.items()})
