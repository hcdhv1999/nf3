import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS} from '../theme';

type Props = {
  /** الإطار الذي يغطي فيه المسح الشاشة كاملة (لحظة القطع) */
  at: number;
  /** المدة الكلية بالإطارات (0.4 ثانية = 12 إطارًا) */
  frames: number;
};

/** انتقال موحّد: مسح أفقي من اليمين لليسار بلون الهوية */
export const Wipe: React.FC<Props> = ({at, frames}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const half = Math.round(frames / 2);
  if (frame < at - half || frame >= at + half) return null;

  const cover = spring({frame: frame - (at - half), fps, config: {damping: 200}, durationInFrames: half});
  const leave = spring({frame: frame - at, fps, config: {damping: 200}, durationInFrames: half});
  // يدخل من اليمين حتى يغطي، ثم يخرج من اليسار
  const x = frame < at ? (1 - cover) * width : -leave * width;

  return (
    <AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: width + 40,
          transform: `translateX(${x}px)`,
          background: COLORS.primary,
          borderLeft: `18px solid ${COLORS.dark}`,
        }}
      />
    </AbsoluteFill>
  );
};
