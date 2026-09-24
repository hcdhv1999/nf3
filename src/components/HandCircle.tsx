import React, {useMemo} from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS} from '../theme';

type Props = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** إطار بدء الرسم */
  start: number;
  /** مدة الرسم بالإطارات */
  drawFrames?: number;
  strokeWidth?: number;
};

/** مسار بيضاوي غير منتظم يشبه الرسم باليد، يتجاوز نقطة البداية قليلًا */
const handEllipse = (cx: number, cy: number, rx: number, ry: number) => {
  const turns = 1.1;
  const steps = 120;
  const tilt = (-8 * Math.PI) / 180;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = -Math.PI * 0.6 + (i / steps) * Math.PI * 2 * turns;
    const k = 1 + 0.035 * Math.sin(3 * a + 0.7) + 0.02 * Math.cos(5 * a) + 0.05 * (i / steps);
    const x = rx * k * Math.cos(a);
    const y = ry * k * Math.sin(a);
    pts.push(
      `${(cx + x * Math.cos(tilt) - y * Math.sin(tilt)).toFixed(1)},${(cy + x * Math.sin(tilt) + y * Math.cos(tilt)).toFixed(1)}`,
    );
  }
  return `M${pts.join(' L')}`;
};

/** دائرة تعليق يدوية بلون التمييز تُرسم عبر stroke-dasharray/dashoffset */
export const HandCircle: React.FC<Props> = ({cx, cy, rx, ry, start, drawFrames = 26, strokeWidth = 9}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const d = useMemo(() => handEllipse(cx, cy, rx, ry), [cx, cy, rx, ry]);
  const p = spring({frame: frame - start, fps, config: {damping: 200}, durationInFrames: drawFrames});
  if (frame < start) return null;
  return (
    <svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
      <path
        d={d}
        pathLength={1}
        fill="none"
        stroke={COLORS.accent}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="1 1"
        strokeDashoffset={1 - p}
      />
    </svg>
  );
};
