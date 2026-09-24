import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import type {Scene} from '../script';
import {TRANSITION_SECONDS} from '../script';
import {sec} from '../layout';
import {DuotoneImage} from '../components/DuotoneImage';
import {Wipe} from '../components/Wipe';
import {PlateStack, relFrame} from './common';

/** المشهد 1: صور دوتون متتابعة لأصول معطّلة */
export const S1: React.FC<{scene: Scene}> = ({scene}) => {
  const images = scene.images ?? [];
  const total = sec(scene.to - scene.from);
  // نقطة تبديل الصورة: منتصف الفجوة بين نهاية سطر وبداية التالي
  const cuts = scene.lines.slice(1).map((l, i) => Math.round((relFrame(scene, scene.lines[i].to) + relFrame(scene, l.from)) / 2));
  const bounds = [0, ...cuts, total];

  return (
    <AbsoluteFill>
      {images.map((img, i) => {
        const from = bounds[i] ?? 0;
        const to = bounds[i + 1] ?? total;
        return (
          <Sequence key={img} from={from} durationInFrames={Math.max(1, to - from)} layout="none">
            <DuotoneImage asset={img} duration={to - from} direction={i % 2 === 0 ? 1 : -1} />
          </Sequence>
        );
      })}
      <PlateStack scene={scene} lines={scene.lines} />
      {cuts.map((c) => (
        <Wipe key={c} at={c} frames={sec(TRANSITION_SECONDS)} />
      ))}
    </AbsoluteFill>
  );
};
