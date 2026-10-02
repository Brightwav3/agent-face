import { useEffect, useRef } from 'react';
import AgentFaceCore from 'agent-face';

type Props = {
  state?: AgentFaceCore.State;
  shape?: AgentFaceCore.Shape;
  color?: AgentFaceCore.ColorName | (string & {});
  size?: number;
  options?: Omit<AgentFaceCore.Options, 'state' | 'shape' | 'color'>;
};

/** React wrapper: creates the face once, then forwards prop changes as animated transitions. */
export function AgentFace({ state = 'Idle', shape = 'Pebble', color = 'gray', size = 96, options }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const face = useRef<AgentFaceCore | null>(null);

  useEffect(() => {
    face.current = new AgentFaceCore(ref.current!, { state, shape, color, ...options });
    return () => { face.current?.destroy(); face.current = null; };
    // created once; later changes go through the effects below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { face.current?.setState(state); }, [state]);
  useEffect(() => { face.current?.setShape(shape); }, [shape]);
  useEffect(() => { face.current?.setColor(color); }, [color]);

  return <div ref={ref} style={{ width: size, height: size }} />;
}

// Usage:
//   <AgentFace state={isThinking ? 'Busy' : 'Idle'} shape="Heart" color="pink" size={48} />
