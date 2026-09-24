import React from 'react';
import {AbsoluteFill} from 'remotion';

/** تظليل خفيف للحواف — طبقة علوية ثابتة */
export const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      pointerEvents: 'none',
      background: 'radial-gradient(ellipse at center, rgba(14,79,73,0) 55%, rgba(14,79,73,0.22) 100%)',
    }}
  />
);
