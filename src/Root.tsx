import React from 'react';
import {Composition} from 'remotion';
import {NafaaPromo} from './NafaaPromo';
import {DURATION_SECONDS, FPS} from './script';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="NafaaPromo"
      component={NafaaPromo}
      durationInFrames={DURATION_SECONDS * FPS}
      fps={FPS}
      width={1920}
      height={1080}
    />
    <Composition
      id="NafaaPromoVertical"
      component={NafaaPromo}
      durationInFrames={DURATION_SECONDS * FPS}
      fps={FPS}
      width={1080}
      height={1920}
    />
  </>
);
