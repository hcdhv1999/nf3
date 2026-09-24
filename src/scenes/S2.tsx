import React from 'react';
import {AbsoluteFill} from 'remotion';
import type {Scene} from '../script';
import {sec, useLayout} from '../layout';
import {DuotoneImage} from '../components/DuotoneImage';
import {HandCircle} from '../components/HandCircle';
import {PlateStack} from './common';

/** المشهد 2: مبنى الجمعية + دائرة تعليق على الأصل */
export const S2: React.FC<{scene: Scene}> = ({scene}) => {
  const {width, height, vertical} = useLayout();
  const total = sec(scene.to - scene.from);
  const circle = vertical
    ? {cx: width * 0.5, cy: height * 0.36, rx: width * 0.34, ry: height * 0.12}
    : {cx: width * 0.36, cy: height * 0.42, rx: width * 0.2, ry: height * 0.24};

  return (
    <AbsoluteFill>
      <DuotoneImage asset={scene.images?.[0] ?? 'charityBuilding'} duration={total} />
      <HandCircle {...circle} start={sec(1.2)} drawFrames={28} />
      <PlateStack scene={scene} lines={scene.lines} maxWidth={vertical ? width - 144 : undefined} />
    </AbsoluteFill>
  );
};
