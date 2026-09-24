import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';

/** طبقة ملمس ورقي ثابتة (ضجيج SVG) بشفافية 6٪ */
export const Grain: React.FC<{opacity?: number}> = ({opacity = 0.06}) => {
  const {width, height} = useVideoConfig();
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity}}>
      <svg width={width} height={height}>
        <filter id="paper-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={3} seed={7} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#paper-grain)" />
      </svg>
    </AbsoluteFill>
  );
};
