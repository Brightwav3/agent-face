"""Build agent-face.js and demo.html.

    python3 src/build.py

Inputs:  src/agent-face.src.js, src/data.json, src/demo.tpl.html
Outputs: agent-face.js, demo.html (repository root)
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def read(name):
    with open(os.path.join(HERE, name), encoding='utf-8') as f:
        return f.read()


def write(name, text):
    with open(os.path.join(ROOT, name), 'w', encoding='utf-8') as f:
        f.write(text)


component = read('agent-face.src.js').replace('/*DATA*/null', read('data.json'))
write('agent-face.js', component)
write('demo.html', read('demo.tpl.html').replace('/*AGENT_FACE_JS*/', component))
print(f'agent-face.js  {len(component.encode()):,} bytes')
