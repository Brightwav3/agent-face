"""Pack shape / state / gaze geometry into src/data.json for agent-face.js.

    python3 src/pack.py <folder with shapes.json, eyes.json, gaze.json>
"""
import json, os, sys
SRC = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('AGENT_FACE_DATA', '../morph')   # folder with shapes/eyes/gaze.json
S = json.load(open(os.path.join(SRC, 'shapes.json')))['shapes']
S = {('Cylinder' if k == 'Cyllinder' else k): v for k, v in S.items()}   # fix source typo
E = json.load(open(os.path.join(SRC, 'eyes.json')))['expr']
G = json.load(open(os.path.join(SRC, 'gaze.json')))['gaze']
r1 = lambda v: round(v, 1)
r3 = lambda v: round(v, 3)
flat = lambda pts, r: [r(c) for p in pts for c in p]
data = {
  'shapes': {k: flat(v, r1) for k, v in S.items()},                       # 128 pts, 512 canvas
  'expr':   {k: [flat(e, r3) for e in v] for k, v in E.items()},          # 2 eyes x 64 pts, face units
  # gaze grids are piecewise-bilinear over 3x3 key poses -> ship the keys, row-major [row][col]
  'gaze':   {k: [[[flat(e, r3) for e in g[j][i]] for i in (0, 2, 4)] for j in (0, 2, 4)] for k, g in G.items()},
}
s = json.dumps(data, separators=(',', ':'))
open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data.json'), 'w').write(s)
print(len(s), 'bytes')
