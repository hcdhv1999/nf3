import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Scene} from '../script';
import {useLayout} from '../layout';
import {COLORS} from '../theme';
import {Logo} from '../components/Logo';
import {TypePlate} from '../components/TypePlate';
import {relFrame} from './common';

/** السطر الذي ينتهي مع نهاية الفيديو يبقى ثابتًا دون حركة خروج */
const endOrHold = (scene: Scene, to: number) => (to >= scene.to ? 1e6 : relFrame(scene, to));

/** المشهد 8: خلفية خضراء، لوقو في المنتصف، دعوة الفعل والرابط */
export const S8: React.FC<{scene: Scene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {width, vertical} = useLayout();
  const appear = spring({frame: frame - 4, fps, config: {damping: 12, mass: 0.8}});
  const [cta, link] = scene.lines;

  return (
    <AbsoluteFill
      style={{
        background: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        direction: 'rtl',
        gap: vertical ? 70 : 54,
      }}
    >
      <div style={{transform: `scale(${appear})`}}>
        <Logo height={vertical ? 230 : 200} color={COLORS.white} dotColor={COLORS.dark} />
      </div>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, minHeight: 170}}>
        {cta ? (
          <TypePlate
            text={cta.text}
            from={relFrame(scene, cta.from)}
            to={endOrHold(scene, cta.to)}
            size={cta.size}
            maxWidth={vertical ? width - 140 : undefined}
          />
        ) : null}
        {link ? (
          <TypePlate text={link.text} from={relFrame(scene, link.from)} to={endOrHold(scene, link.to)} size={link.size} />
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
