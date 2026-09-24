import React from 'react';
import {AbsoluteFill} from 'remotion';
import type {Scene} from '../script';
import {sec, useLayout} from '../layout';
import {COLORS} from '../theme';
import {NajranMap} from '../components/NajranMap';
import {PlateStack} from './common';

/** المشهد 7: خريطة نجران مع نقاط متوهجة تظهر تباعًا */
export const S7: React.FC<{scene: Scene}> = ({scene}) => {
  const {width, height, vertical, pad} = useLayout();
  const mapW = vertical ? width - pad * 2 : width * 0.46;
  const mapH = vertical ? height * 0.46 : height * 0.74;
  return (
    <AbsoluteFill style={{background: COLORS.cream}}>
      <div
        style={{
          position: 'absolute',
          left: vertical ? pad : pad * 0.8,
          top: vertical ? height * 0.14 : (height - mapH) / 2 + 20,
        }}
      >
        <NajranMap width={mapW} height={mapH} start={sec(0.2)} />
      </div>
      <PlateStack
        scene={scene}
        lines={scene.lines}
        position={vertical ? 'bottom' : 'center'}
        maxWidth={vertical ? width - pad * 2 : width * 0.4}
      />
    </AbsoluteFill>
  );
};
