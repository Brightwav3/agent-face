# Changelog

## 1.1.0

- New typographic eye style: `eyes: 'glyph'` and `setEyes()`, with a glyph for each of the 11 states.
- `AgentFace.eyeStyles`.

## 1.0.0

First release.

- 14 morphable bodies normalized to 128 points, with smooth morphing between any two.
- 11 states, taken from the Affinity eye designs, each with its own resting gaze.
- Designed gaze: 9 key poses per state (drawn corners, left/right and up/down mirrors, straight-on capsules), blended while the pointer is over the face.
- The body turns toward where the eyes look.
- Blinking, an 11-color palette, and theme-aware eye color.
- `prefers-reduced-motion` support, off-screen pausing and an accessible label.
- TypeScript types, a vanilla HTML example and a React wrapper.
- Licensed under GPL-3.0.
