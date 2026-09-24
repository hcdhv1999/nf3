import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Scene} from '../script';
import {sec, useLayout} from '../layout';
import {COLORS} from '../theme';
import {DuotoneImage} from '../components/DuotoneImage';
import {Logo, LOGO_CORNER} from '../components/Logo';
import {PlateStack} from './common';

const CENTER_LOGO_HEIGHT = 240;

/** المشهد 3: الخلفية تصفو، لوقو نفع يظهر في المنتصف ثم ينزاح لأعلى اليمين */
export const S3: React.FC<{scene: Scene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {width, height, vertical} = useLayout();

  const clear = spring({frame, fps, config: {damping: 200}, durationInFrames: 30});
  const appear = spring({frame: frame - 8, fps, config: {damping: 12, mass: 0.8}});
  const move = spring({frame: frame - sec(2.6), fps, config: {damping: 200}, durationInFrames: 24});

  const scale = (CENTER_LOGO_HEIGHT + (LOGO_CORNER.height - CENTER_LOGO_HEIGHT) * move) / CENTER_LOGO_HEIGHT;
  // من المنتصف إلى الزاوية العليا اليمنى (الحافة اليمنى والعليا للوقو)
  const startRight = width / 2;
  const startTop = height / 2;
  const right = startRight + (LOGO_CORNER.right - startRight) * move;
  const top = startTop + (LOGO_CORNER.top - startTop) * move;
  const centerAnchor = 1 - move; // 1 = اللوقو متمركز، 0 = مثبت من زاويته

  return (
    <AbsoluteFill style={{background: COLORS.cream}}>
      <AbsoluteFill style={{opacity: 1 - clear, filter: `blur(${clear * 18}px)`}}>
        <DuotoneImage asset="charityBuilding" duration={30} />
      </AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          right,
          top,
          transformOrigin: 'top right',
          transform: `translate(${50 * centerAnchor}%, ${-50 * centerAnchor}%) scale(${scale})`,
          opacity: 0.9 + 0.1 * centerAnchor,
        }}
      >
        <div style={{transform: `scale(${appear})`, transformOrigin: 'center'}}>
          <Logo height={CENTER_LOGO_HEIGHT} />
        </div>
      </div>
      <PlateStack
        scene={scene}
        lines={scene.lines}
        position="center"
        align="center"
        maxWidth={vertical ? width - 144 : undefined}
      />
    </AbsoluteFill>
  );
};
