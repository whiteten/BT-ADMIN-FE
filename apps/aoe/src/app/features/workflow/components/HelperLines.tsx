import { type CSSProperties } from 'react';
import { useStore } from '@xyflow/react';

interface HelperLinesProps {
  horizontal?: number;
  vertical?: number;
}

const overlayStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
};

export default function HelperLines({ horizontal, vertical }: HelperLinesProps) {
  const width = useStore((s) => s.width);
  const height = useStore((s) => s.height);
  const transform = useStore((s) => s.transform);

  if (!width || !height) return null;
  if (horizontal === undefined && vertical === undefined) return null;

  const [tx, ty, scale] = transform;

  return (
    <svg style={overlayStyle}>
      {vertical !== undefined && <line x1={vertical * scale + tx} x2={vertical * scale + tx} y1={0} y2={height} stroke="#3b82f6" strokeWidth={1} strokeDasharray="4 4" />}
      {horizontal !== undefined && <line x1={0} x2={width} y1={horizontal * scale + ty} y2={horizontal * scale + ty} stroke="#3b82f6" strokeWidth={1} strokeDasharray="4 4" />}
    </svg>
  );
}
