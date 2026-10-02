// Type definitions for agent-face.js

type AgentFaceState =
  | 'Idle' | 'Attentive' | 'Curious' | 'Shy' | 'Excited' | 'Focused'
  | 'Startled' | 'Busy' | 'Suspicious' | 'Sleep' | 'Irritated';

type AgentFaceShape =
  | 'Pebble' | 'Circle' | 'Cloud' | 'Triangle' | 'Hexagon' | 'Pill' | 'Flower'
  | 'Cube' | 'Cylinder' | 'Bulb' | 'Droplet' | 'Egg' | 'Heart' | 'Pentagon';

type AgentFaceColorName =
  | 'gray' | 'black' | 'offwhite' | 'orange' | 'yellow' | 'pink'
  | 'brown' | 'turquoise' | 'blue' | 'purple' | 'green';

type AgentFaceEyeStyle = 'drawn' | 'glyph';

interface AgentFaceOptions {
  /** Body shape. Default `'Pebble'`. */
  shape?: AgentFaceShape;
  /** State (eye design). Case-insensitive. Default `'Idle'`. */
  state?: AgentFaceState;
  /** Palette name or any CSS color. Default `'gray'`. */
  color?: AgentFaceColorName | (string & {});
  /** Eye color: light = white eyes, dark = black eyes, auto = system. Default `'auto'`. */
  theme?: 'auto' | 'light' | 'dark';
  /** Pointer tracking: over the face, anywhere, or off. Default `'element'`. */
  track?: 'element' | 'window' | false;
  /** Reach of `'window'` tracking relative to the face size. Default `0.9`. */
  trackRadius?: number;
  /** Turn the body toward the state's resting gaze. Default `true`. */
  followEyes?: boolean;
  /** Automatic blinking. Default `true`. */
  blink?: boolean;
  /** Accessible name. Default `'AI agent'`. */
  label?: string;
  /** Eye style: the drawn designs or the typographic glyph set. Default `'drawn'`. */
  eyes?: AgentFaceEyeStyle;
}

interface AgentFaceTransition {
  /** Duration in ms. */
  duration?: number;
  /** Skip the animation. */
  instant?: boolean;
}

interface AgentFaceStateInfo {
  meaning: string;
  useFor: string;
}

declare class AgentFace {
  constructor(container: Element | string, options?: AgentFaceOptions);

  readonly el: Element;
  readonly svg: SVGSVGElement;
  readonly state: AgentFaceState;
  readonly shapeName: AgentFaceShape;

  setState(name: AgentFaceState | (string & {}), transition?: AgentFaceTransition): this;
  setShape(name: AgentFaceShape | (string & {}), transition?: AgentFaceTransition): this;
  setColor(color: AgentFaceColorName | (string & {})): this;
  /** Hold the gaze on a direction (-1..1, +x right, +y down); `null` releases it. */
  lookAt(x: number | null, y?: number): this;
  /** Switch the eye style. */
  setEyes(style: AgentFaceEyeStyle): this;
  blink(): this;
  destroy(): void;

  static readonly states: AgentFaceState[];
  static readonly shapes: AgentFaceShape[];
  static readonly eyeStyles: AgentFaceEyeStyle[];
  static readonly colors: Record<AgentFaceColorName, string>;
  static readonly stateInfo: Record<AgentFaceState, AgentFaceStateInfo>;
}

declare namespace AgentFace {
  export type State = AgentFaceState;
  export type Shape = AgentFaceShape;
  export type ColorName = AgentFaceColorName;
  export type Options = AgentFaceOptions;
  export type Transition = AgentFaceTransition;
  export type StateInfo = AgentFaceStateInfo;
  export type EyeStyle = AgentFaceEyeStyle;
}

export = AgentFace;
export as namespace AgentFace;
