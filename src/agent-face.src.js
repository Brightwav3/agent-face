/*!
 * SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 Brightwave
 *
 * AgentFace — procedural face for an AI agent.
 * 14 morphable bodies · 11 states (the eye designs) with designed gaze.
 * No dependencies. Works as an ES module, CommonJS, or a plain <script> (window.AgentFace).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AgentFace = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DATA = /*DATA*/null;
  const GLYPH_DATA = /*GLYPHS*/null;   // typographic eye style: strokes per state and eye

  // ---------------------------------------------------------------------------
  // constants
  // ---------------------------------------------------------------------------
  const C = 256;                 // canvas center (viewBox 0 0 512 512)
  const R = 168;                 // body "area radius" = 1 face unit
  const N = 128;                 // body points
  const M = 64;                  // points per eye
  const SVGNS = 'http://www.w3.org/2000/svg';

  const COLORS = {
    gray: '#777777', black: '#000000', offwhite: '#EEEBE4', orange: '#FD6702', yellow: '#FD9701',
    pink: '#FD309B', brown: '#96673E', turquoise: '#01BBA5', blue: '#1083FD', purple: '#9159FC', green: '#009957'
  };
  const EYE_LIGHT = '#F4F4F4', EYE_DARK = '#151515';

  // ---------------------------------------------------------------------------
  // geometry helpers
  // ---------------------------------------------------------------------------
  const unflat = a => { const o = []; for (let i = 0; i < a.length; i += 2) o.push([a[i], a[i + 1]]); return o; };
  const SHAPES = {}, EXPR = {}, GAZE = {};
  for (const k in DATA.shapes) SHAPES[k] = unflat(DATA.shapes[k]);
  for (const k in DATA.expr) EXPR[k] = DATA.expr[k].map(unflat);
  for (const k in DATA.gaze) GAZE[k] = DATA.gaze[k].map(row => row.map(c => c.map(unflat)));   // 3x3 keys [row][col][eye][pt]

  const STATE_INFO = {
      "Idle": {
          "meaning": "Ready / nothing happening",
          "useFor": "waiting for the first message, app open, no task running"
      },
      "Attentive": {
          "meaning": "Listening",
          "useFor": "user is typing or speaking, mic on, waiting for input"
      },
      "Curious": {
          "meaning": "Exploring",
          "useFor": "reading files or a page, searching, asking a clarifying question"
      },
      "Shy": {
          "meaning": "Unsure / apologizing",
          "useFor": "low confidence, admitting a mistake, politely declining"
      },
      "Excited": {
          "meaning": "Success",
          "useFor": "task done, good result found, greeting, celebration"
      },
      "Focused": {
          "meaning": "Working",
          "useFor": "running tools, writing code, long task in progress"
      },
      "Startled": {
          "meaning": "Error / surprise",
          "useFor": "something failed, unexpected result, interrupted"
      },
      "Busy": {
          "meaning": "Thinking",
          "useFor": "waiting for the model, generating the answer, processing"
      },
      "Suspicious": {
          "meaning": "Verifying",
          "useFor": "double-checking, reviewing a risky action, asking for permission"
      },
      "Sleep": {
          "meaning": "Inactive",
          "useFor": "paused, offline, idle for a long time, scheduled for later"
      },
      "Irritated": {
          "meaning": "Blocked",
          "useFor": "rate-limited, access denied, the same thing failing again"
      }
  };

  // glyph eyes: strokes in face units -> px; resting direction from the pair center
  const GLYPHS = {}, GLYPH_DIR = {};
  for (const k in GLYPH_DATA.states) {
    GLYPHS[k] = GLYPH_DATA.states[k].map(eye => eye.map(s => ({ pts: unflatG(s.p), closed: !!s.c, filled: !!s.f })));
    let x = 0, y = 0, n = 0;
    for (const eye of GLYPHS[k]) for (const s of eye) for (const p of s.pts) { x += p[0]; y += p[1]; n++; }
    GLYPH_DIR[k] = [Math.max(-1, Math.min(1, x / n / 0.3)), Math.max(-1, Math.min(1, y / n / 0.3))];
  }
  function unflatG(a) { const o = []; for (let i = 0; i < a.length; i += 2) o.push([a[i], a[i + 1]]); return o; }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const ci = s => String(s).toLowerCase().replace(/[^a-z]/g, '');
  const lookup = (table, name) => {
    if (name in table) return name;
    const n = ci(name);
    for (const k in table) if (ci(k) === n) return k;
    if (n === 'cyllinder' && 'Cylinder' in table) return 'Cylinder';
    return null;
  };

  // closed Catmull-Rom -> cubic Bézier path through every point
  function toPath(P) {
    const n = P.length;
    let d = 'M' + P[0][0].toFixed(2) + ',' + P[0][1].toFixed(2);
    for (let i = 0; i < n; i++) {
      const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
      d += 'C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(2) + ',' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(2) +
           ' ' + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(2) + ',' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(2) +
           ' ' + p2[0].toFixed(2) + ',' + p2[1].toFixed(2);
    }
    return d + 'Z';
  }
  // cyclic index shift of `to` that best matches `from` (min Σd²)
  function bestShift(from, to) {
    const n = from.length; let best = 0, bc = Infinity;
    for (let k = 0; k < n; k++) {
      let c = 0;
      for (let i = 0; i < n && c < bc; i++) { const a = from[i], b = to[(i + k) % n]; c += (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2; }
      if (c < bc) { bc = c; best = k; }
    }
    return best;
  }
  const rotate = (P, k) => P.map((_, i) => P[(i + k) % P.length]);
  const lerpPts = (A, B, t, out) => { for (let i = 0; i < A.length; i++) { out[i][0] = A[i][0] + (B[i][0] - A[i][0]) * t; out[i][1] = A[i][1] + (B[i][1] - A[i][1]) * t; } return out; };
  const clonePts = P => P.map(p => [p[0], p[1]]);
  function inside(px, py, P) {
    let c = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const xi = P[i][0], yi = P[i][1], xj = P[j][0], yj = P[j][1];
      if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  function pairCenter(E) { let x = 0, y = 0, n = 0; for (const e of E) for (const p of e) { x += p[0]; y += p[1]; n++; } return [x / n, y / n]; }
  // largest scale ≤ 1 about the pair center that keeps every eye point inside the body (with margin)
  function fitScale(body, E) {
    const [cx, cy] = pairCenter(E), K = 1.14;
    const ok = s => E.every(e => e.every(p => inside(cx + (p[0] - cx) * s * K, cy + (p[1] - cy) * s * K, body)));
    if (ok(1)) return 1;
    let lo = 0.2, hi = 1;
    for (let i = 0; i < 10; i++) { const m = (lo + hi) / 2; ok(m) ? lo = m : hi = m; }
    return lo;
  }
  const toPx = E => E.map(e => e.map(p => [C + p[0] * R, C + p[1] * R]));
  // expression's built-in gaze (eye-pair center) -> resting head direction in [-1,1]²
  const EXPR_DIR = {};
  for (const k in EXPR) { const [x, y] = pairCenter(EXPR[k]); EXPR_DIR[k] = [clamp(x / 0.3, -1, 1), clamp(y / 0.3, -1, 1)]; }

  const ease = { inOut: t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2 };
  const smooth = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-dt * rate));

  // shared pointer (one listener for all faces)
  const pointer = { x: 0, y: 0, active: false };
  const live = new Set();
  const kickAll = () => live.forEach(f => f._kick());
  let pointerBound = false;
  function bindPointer() {
    if (pointerBound || typeof window === 'undefined') return;
    pointerBound = true;
    window.addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; kickAll(); }, { passive: true });
    document.addEventListener('pointerleave', () => { pointer.active = false; kickAll(); });
    window.addEventListener('blur', () => { pointer.active = false; kickAll(); });
  }

  // ---------------------------------------------------------------------------
  // component
  // ---------------------------------------------------------------------------
  class AgentFace {
    /**
     * @param {Element|string} el  container (the face fills it; give it a size)
     * @param {object} [o]
     *   shape='Pebble', state='Idle' (one of AgentFace.states), color='gray' (name or CSS color),
     *   theme='auto'|'light'|'dark' (eye color), track='element'|'window'|false (follow the pointer while it is over the face / anywhere), trackRadius=0.9 (×size, for 'window'),
     *   followEyes=true (body turns where the eyes look), blink=true, label='AI agent' (accessible name),
     *   eyes='drawn'|'glyph' (eye style: the drawn designs, or the typographic glyph set)
     */
    constructor(el, o = {}) {
      this.el = typeof el === 'string' ? document.querySelector(el) : el;
      if (!this.el) throw new Error('AgentFace: container not found');
      this.o = Object.assign({ shape: 'Pebble', state: 'Idle', color: 'gray', theme: 'auto', track: 'element',
        trackRadius: 0.9, followEyes: true, blink: true, label: 'AI agent', eyes: 'drawn' }, o);
      this.reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      this._buildDom();

      const shape = lookup(SHAPES, this.o.shape) || 'Pebble';
      this.shapeName = shape;
      this.body = clonePts(SHAPES[shape]);
      this.bodyAnim = null;

      this.exprName = 'Idle';
      this.eyes = toPx(EXPR.Idle).map(clonePts);
      this.eyeAnim = null;
      this.eyeScale = 1;
      this._gazeShift = {};

      this.look = { x: 0, y: 0, f: 0, tx: 0, ty: 0, tf: 0 };       // gaze (tracking / lookAt)
      this.head = { x: 0, y: 0, tx: 0, ty: 0 };                    // resting head direction from the expression
      this.manual = null;                                          // lookAt() target
      this.blinkAmt = 0; this._nextBlink = 0; this._blinkT = -1;
      this.t = 0; this._last = 0; this._raf = 0; this._visible = true;

      this.setColor(this.o.color);
      this.setState(this.o.state, { instant: true });
      this.eyeScale = fitScale(this.body, this.eyes);
      this.head.x = this.head.tx; this.head.y = this.head.ty;

      if (this.o.track) bindPointer();
      if (typeof IntersectionObserver !== 'undefined') {
        this._io = new IntersectionObserver(es => { this._visible = es[0].isIntersecting; if (this._visible) this._kick(); });
        this._io.observe(this.svg);
      }
      if (this.o.theme === 'auto' && typeof matchMedia !== 'undefined') {
        this._mq = matchMedia('(prefers-color-scheme: dark)');
        this._mqFn = () => this._applyEyeColor();
        this._mq.addEventListener ? this._mq.addEventListener('change', this._mqFn) : this._mq.addListener(this._mqFn);
      }
      this.setEyes(this.o.eyes);
      live.add(this);
      this._render();
      this._kick();
    }

    // ---- public API ----------------------------------------------------------
    static get shapes() { return Object.keys(SHAPES); }
    /** The states are the eye designs: Idle, Attentive, Curious, Shy, Excited, Focused, Startled, Busy, Suspicious, Sleep, Irritated. */
    static get states() { return Object.keys(EXPR); }
    static get colors() { return Object.assign({}, COLORS); }
    /** What each state can represent in a product (suggestions, not rules). */
    static get stateInfo() { return JSON.parse(JSON.stringify(STATE_INFO)); }

    /** Morph the body to another shape. */
    setShape(name, { duration = 700, instant = false } = {}) {
      const k = lookup(SHAPES, name); if (!k) throw new Error('AgentFace: unknown shape "' + name + '"');
      this.shapeName = k;
      const from = clonePts(this.body), target = SHAPES[k];
      const to = rotate(target, bestShift(from, target));
      const s0 = this.eyeScale, s1 = fitScale(target, this._exprEyesPx());
      if (instant || this.reduced) { this.body = clonePts(to); this.eyeScale = s1; this.bodyAnim = null; this._kick(); return this; }
      this.bodyAnim = { from, to, s0, s1, t0: this.t, dur: duration / 1000 };
      this._kick(); return this;
    }

    /** Switch state = eye design (morphs the eyes; the body turns to where they look). */
    setState(name, { duration = 420, instant = false } = {}) {
      const k = lookup(EXPR, name); if (!k) throw new Error('AgentFace: unknown state "' + name + '"');
      this.exprName = k; this.state = k; this.el.dataset.agentState = k;
      const from = this.eyes.map(clonePts), target = toPx(EXPR[k]);
      const to = target.map((e, i) => rotate(e, bestShift(from[i], e)));
      [this.head.tx, this.head.ty] = this.o.followEyes ? (this.o.eyes === 'glyph' ? GLYPH_DIR[k] : EXPR_DIR[k]) : [0, 0];
      if (this.glyphName && this.glyphName !== k && !instant && !this.reduced) this.gSwap = { from: this.glyphName, t0: this.t, dur: Math.max(0.16, duration / 1000 * 0.6) };
      this.glyphName = k;
      const s0 = this.eyeScale, s1 = fitScale(this.body, target);
      if (instant || this.reduced) { this.eyes = to.map(clonePts); this.eyeScale = s1; this.eyeAnim = null; this._kick(); return this; }
      this.eyeAnim = { from, to, s0, s1, t0: this.t, dur: duration / 1000 };
      this._kick(); return this;
    }

    /** Eye style: 'drawn' (the Affinity designs) or 'glyph' (typographic set). */
    setEyes(style) {
      if (style !== 'drawn' && style !== 'glyph') throw new Error('AgentFace: eyes must be "drawn" or "glyph"');
      this.o.eyes = style;
      this.eyesEl.style.display = style === 'glyph' ? 'none' : '';
      this.glyphEl.style.display = style === 'glyph' ? '' : 'none';
      [this.head.tx, this.head.ty] = this.o.followEyes ? (style === 'glyph' ? GLYPH_DIR[this.exprName] : EXPR_DIR[this.exprName]) : [0, 0];
      this._kick(); return this;
    }
    static get eyeStyles() { return ['drawn', 'glyph']; }

    /** Body color: palette name (see AgentFace.colors) or any CSS color. */
    setColor(c) {
      const key = ci(c);
      this.colorName = key in COLORS ? key : null;
      this.color = COLORS[key] || c;
      this.bodyEl.style.fill = this.color;
      this._applyEyeColor();
      return this;
    }

    /** Fix the gaze on a direction (x,y in -1..1, +x right, +y down). Pass null to release. */
    lookAt(x, y) {
      this.manual = x == null ? null : [clamp(x, -1, 1), clamp(y, -1, 1)];
      this._kick(); return this;
    }

    /** Trigger a blink now. */
    blink() { this._blinkT = this.t; this._kick(); return this; }

    destroy() {
      cancelAnimationFrame(this._raf); live.delete(this);
      if (this._io) this._io.disconnect();
      if (this._mq) this._mq.removeEventListener ? this._mq.removeEventListener('change', this._mqFn) : this._mq.removeListener(this._mqFn);
      this.svg.remove();
    }

    // ---- internals -------------------------------------------------------------
    _buildDom() {
      const svg = document.createElementNS(SVGNS, 'svg');
      svg.setAttribute('viewBox', '0 0 512 512');
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', this.o.label);
      svg.setAttribute('class', 'agent-face');
      svg.style.cssText = 'display:block;width:100%;height:100%;overflow:visible';
      const head = document.createElementNS(SVGNS, 'g');
      const body = document.createElementNS(SVGNS, 'path');
      const eyes = document.createElementNS(SVGNS, 'g');
      const eL = document.createElementNS(SVGNS, 'path'), eR = document.createElementNS(SVGNS, 'path');
      body.setAttribute('class', 'agent-face__body'); eyes.setAttribute('class', 'agent-face__eyes');
      body.style.transition = 'fill .35s ease'; eyes.style.transition = 'fill .35s ease';
      const glyphs = document.createElementNS(SVGNS, 'g'); glyphs.setAttribute('class', 'agent-face__glyphs');
      glyphs.style.transition = 'color .35s ease';
      eyes.append(eL, eR); head.append(body, eyes, glyphs); svg.append(head);
      this.el.appendChild(svg);
      Object.assign(this, { svg, headEl: head, bodyEl: body, eyesEl: eyes, eyeL: eL, eyeR: eR, glyphEl: glyphs });
    }

    _applyEyeColor() {
      let dark;
      if (this.o.theme === 'dark') dark = true;
      else if (this.o.theme === 'light') dark = false;
      else dark = typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
      // light: white eyes · dark: black eyes · black body: always white · off-white body: always black
      let eye = dark ? EYE_DARK : EYE_LIGHT;
      if (this.colorName === 'black') eye = EYE_LIGHT;
      if (this.colorName === 'offwhite') eye = EYE_DARK;
      this.eyesEl.style.fill = eye;
      this.glyphEl.style.color = eye;
    }

    _exprEyesPx() { return toPx(EXPR[this.exprName]); }

    // designed gaze: piecewise-bilinear over 3x3 key poses (corners = designed/mirrored, center/edges = straight on)
    _gazeEyes(name, x, y) {
      const G = GAZE[name]; if (!G) return null;
      const gx = (clamp(x, -1, 1) + 1), gy = (clamp(y, -1, 1) + 1);          // 0..2
      const i = Math.min(1, Math.floor(gx)), j = Math.min(1, Math.floor(gy)), u = gx - i, v = gy - j;
      const K = [G[j][i], G[j][i + 1], G[j + 1][i], G[j + 1][i + 1]], w = [(1 - u) * (1 - v), u * (1 - v), (1 - u) * v, u * v];
      if (!this._gazeShift[name]) {
        const ex = toPx(EXPR[name]), c = G[1][1].map(e => e.map(p => [C + p[0] * R, C + p[1] * R]));
        this._gazeShift[name] = [0, 1].map(k => bestShift(ex[k], c[k]));
      }
      const sh = this._gazeShift[name];
      return [0, 1].map(k => {
        const out = new Array(M);
        for (let m = 0; m < M; m++) {
          const n = (m + sh[k]) % M; let px = 0, py = 0;
          for (let z = 0; z < 4; z++) { px += w[z] * K[z][k][n][0]; py += w[z] * K[z][k][n][1]; }
          out[m] = [C + px * R, C + py * R];
        }
        return out;
      });
    }

    _kick() { if (!this._raf && typeof requestAnimationFrame !== 'undefined') { this._last = 0; this._raf = requestAnimationFrame(t => this._tick(t)); } }

    _tick(now) {
      this._raf = 0;
      const dt = this._last ? Math.min(0.05, (now - this._last) / 1000) : 1 / 60;
      this._last = now; this.t += dt;
      let busy = false;

      // body morph
      if (this.bodyAnim) {
        const a = this.bodyAnim, p = Math.min(1, (this.t - a.t0) / a.dur), e = ease.inOut(p);
        lerpPts(a.from, a.to, e, this.body); this.eyeScale = a.s0 + (a.s1 - a.s0) * e;
        if (p >= 1) this.bodyAnim = null; busy = true;
      }
      // eye morph
      if (this.eyeAnim) {
        const a = this.eyeAnim, p = Math.min(1, (this.t - a.t0) / a.dur), e = ease.inOut(p);
        for (let k = 0; k < 2; k++) lerpPts(a.from[k], a.to[k], e, this.eyes[k]);
        if (!this.bodyAnim) this.eyeScale = a.s0 + (a.s1 - a.s0) * e;
        if (p >= 1) this.eyeAnim = null; busy = true;
      }

      // gaze target: lookAt > pointer > the state's own (designed) gaze
      const L = this.look; L.tf = 0;
      const pd = this.o.track && pointer.active ? this._pointerDir() : null;
      if (this.manual) { [L.tx, L.ty] = this.manual; L.tf = 1; }
      else if (pd) { [L.tx, L.ty] = pd; L.tf = 1; }
      const r = this.reduced ? 1e3 : 9;
      L.x = smooth(L.x, L.tx, r, dt); L.y = smooth(L.y, L.ty, r, dt); L.f = smooth(L.f, L.tf, r * 0.7, dt);
      this.head.x = smooth(this.head.x, this.head.tx, r * 0.6, dt); this.head.y = smooth(this.head.y, this.head.ty, r * 0.6, dt);
      if (Math.abs(L.x - L.tx) + Math.abs(L.y - L.ty) + Math.abs(L.f - L.tf) + Math.abs(this.head.x - this.head.tx) + Math.abs(this.head.y - this.head.ty) > 1e-3) busy = true;

      if (this.gSwap) { if (this.t - this.gSwap.t0 >= this.gSwap.dur) this.gSwap = null; busy = true; }
      // blink
      if (this.o.blink && !this.reduced) {
        if (!this._nextBlink) this._nextBlink = this.t + 1.5 + Math.random() * 3;
        if (this.t >= this._nextBlink && this._blinkT < 0) { this._blinkT = this.t; this._nextBlink = this.t + 2.6 + Math.random() * 3.6 + (Math.random() < .15 ? -2.3 : 0); }
        busy = true;
      }
      if (this._blinkT >= 0) {
        const p = (this.t - this._blinkT) / 0.17;
        this.blinkAmt = p >= 1 ? 0 : Math.sin(Math.PI * p);
        if (p >= 1) this._blinkT = -1; busy = true;
      }

      this._render();
      if (busy && this._visible) this._raf = requestAnimationFrame(t => this._tick(t));
    }

    // typographic eyes: stroked glyphs that slide toward the gaze; state changes close one glyph and open the next
    _renderGlyphs() {
      const L = this.look;
      let name = this.glyphName || this.exprName, open = 1;
      if (this.gSwap) {
        const p = Math.min(1, (this.t - this.gSwap.t0) / this.gSwap.dur);
        if (p < 0.5) { name = this.gSwap.from; open = 1 - p * 2; } else open = p * 2 - 1;
        open = open * open * (3 - 2 * open);
      }
      const G = GLYPHS[name]; if (!G) return;
      const ox = L.x * 0.2 * L.f * R, oy = L.y * 0.16 * L.f * R;
      let eyes = G.map(eye => eye.map(s => ({ ...s, pts: s.pts.map(p => [C + p[0] * R + ox, C + p[1] * R + oy]) })));
      // keep the glyphs inside the body (with stroke margin)
      const flat = eyes.map(eye => eye.flatMap(s => s.pts));
      const fs = fitScale(this.body, flat), [pcx, pcy] = pairCenter(flat);
      const kq = Math.max(0.06, (1 - 0.9 * this.blinkAmt) * open);
      eyes = eyes.map(eye => {
        const ys = eye.flatMap(s => s.pts.map(p => p[1])); const my = (Math.min(...ys) + Math.max(...ys)) / 2;
        return eye.map(s => ({ ...s, pts: s.pts.map(p => {
          const x = pcx + (p[0] - pcx) * fs, y = pcy + (p[1] - pcy) * fs, m = pcy + (my - pcy) * fs;
          return [x, m + (y - m) * kq];
        }) }));
      });
      const sw = (GLYPH_DATA.w * R * Math.min(1, fs * 1.1)).toFixed(2);
      let html = '';
      for (const eye of eyes) for (const s of eye) {
        if (s.filled) {
          const xs = s.pts.map(p => p[0]), ys = s.pts.map(p => p[1]);
          const rx = (Math.max(...xs) - Math.min(...xs)) / 2 + GLYPH_DATA.w * R / 2, ry = (Math.max(...ys) - Math.min(...ys)) / 2 + GLYPH_DATA.w * R / 2 * kq;
          html += '<ellipse cx="' + ((Math.max(...xs) + Math.min(...xs)) / 2).toFixed(2) + '" cy="' + ((Math.max(...ys) + Math.min(...ys)) / 2).toFixed(2) +
                  '" rx="' + rx.toFixed(2) + '" ry="' + ry.toFixed(2) + '" fill="currentColor"/>';
          continue;
        }
        const d = 'M' + s.pts.map(p => p[0].toFixed(2) + ',' + p[1].toFixed(2)).join('L') + (s.closed ? 'Z' : '');
        html += '<path d="' + d + '" fill="none" stroke="currentColor" stroke-width="' + sw + '" stroke-linecap="' + (s.closed ? 'round' : 'square') + '" stroke-linejoin="miter"/>';
      }
      this.glyphEl.innerHTML = html;
    }

    _pointerDir() {
      const b = this.svg.getBoundingClientRect(); if (!b.width) return null;
      const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      if (this.o.track === 'element' && (pointer.x < b.left || pointer.x > b.right || pointer.y < b.top || pointer.y > b.bottom)) return null;
      const rad = this.o.track === 'element' ? b.width / 2 : Math.max(b.width, 120) * this.o.trackRadius * 2;
      let x = (pointer.x - cx) / rad, y = (pointer.y - cy) / rad;
      // square mapping: a diagonal reaches the grid corner, i.e. the exact (mirrored) designed pose
      return [clamp(x, -1, 1), clamp(y, -1, 1)];
    }

    _render() {
      const L = this.look;
      // head pose: the state's resting direction, blended toward the gaze
      const bx = this.o.followEyes ? this.head.x : 0, by = this.o.followEyes ? this.head.y : 0;
      const hx = bx + (L.x - bx) * L.f, hy = by + (L.y - by) * L.f;
      const rot = hx * 9, tx = hx * 14, ty = hy * 10;
      const sx = 1 - Math.abs(hx) * 0.07, sy = 1 - Math.abs(hy) * 0.04;
      this.headEl.setAttribute('transform',
        'translate(' + (C + tx).toFixed(2) + ' ' + (C + ty).toFixed(2) + ') rotate(' + rot.toFixed(2) + ') scale(' + sx.toFixed(4) + ' ' + sy.toFixed(4) + ') translate(' + -C + ' ' + -C + ')');
      this.bodyEl.setAttribute('d', toPath(this.body));

      // eyes: expression set, blended toward the designed gaze pose
      const [ecx, ecy] = pairCenter(this.eyes);
      let E = this.eyes.map(e => e.map(p => [ecx + (p[0] - ecx) * this.eyeScale, ecy + (p[1] - ecy) * this.eyeScale]));
      if (L.f > 0.002 && GAZE[this.exprName]) {
        let g = this._gazeEyes(this.exprName, L.x, L.y);
        const gs = fitScale(this.body, g), [gcx, gcy] = pairCenter(g);
        if (gs < 1) g = g.map(e => e.map(p => [gcx + (p[0] - gcx) * gs, gcy + (p[1] - gcy) * gs]));
        E = E.map((e, k) => e.map((p, i) => [p[0] + (g[k][i][0] - p[0]) * L.f, p[1] + (g[k][i][1] - p[1]) * L.f]));
      }
      if (this.blinkAmt) {
        const kq = 1 - 0.9 * this.blinkAmt;
        E = E.map(e => { let my = 0; for (const p of e) my += p[1]; my /= e.length; return e.map(p => [p[0], my + (p[1] - my) * kq]); });
      }
      if (this.o.eyes === 'glyph') { this._renderGlyphs(); return; }
      this.eyeL.setAttribute('d', toPath(E[0]));
      this.eyeR.setAttribute('d', toPath(E[1]));
    }
  }

  return AgentFace;
});
