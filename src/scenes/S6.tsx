import React from 'react';
import {AbsoluteFill, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Scene} from '../script';
import {sec, useLayout} from '../layout';
import {COLORS} from '../theme';
import {DuotoneImage} from '../components/DuotoneImage';
import {TypePlate} from '../components/TypePlate';
import {relFrame} from './common';

/** المشهد 6: شريط صور يتحرك، ولوح صغير أسفل اليمين يسمّي كل فئة */
export const S6: React.FC<{scene: Scene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {width, height, vertical, pad} = useLayout();
  const cats = scene.categories ?? [];
  const total = sec(scene.to - scene.from);

  const cardW = vertical ? width * 0.78 : width * 0.46;
  const cardH = vertical ? height * 0.52 : height * 0.62;
  const gap = 48;
  const stepPx = cardW + gap;

  // موضع الشريط: كل فئة جديدة تدفع الشريط خطوة عبر spring
  const pos = cats.slice(1).reduce(
    (acc, c) => acc + spring({frame: frame - relFrame(scene, c.from) + 6, fps, config: {damping: 200}, durationInFrames: 18}),
    0,
  );

  return (
    <AbsoluteFill style={{background: COLORS.cream}}>
      <div
        style={{
          position: 'absolute',
          top: (height - cardH) / 2 - (vertical ? 60 : 30),
          // أول بطاقة في المنتصف، والبقية إلى يسارها (قراءة RTL)؛ الشريط يتحرك لليمين
          right: (width - cardW) / 2,
          transform: `translateX(${pos * stepPx}px)`,
          display: 'flex',
          direction: 'ltr',
          flexDirection: 'row-reverse',
          gap,
        }}
      >
        {cats.map((c, i) => {
          const d = Math.abs(i - pos);
          return (
            <div
              key={c.asset}
              style={{
                width: cardW,
                height: cardH,
                position: 'relative',
                overflow: 'hidden',
                opacity: 1 - Math.min(0.55, d * 0.55),
                transform: `scale(${1 - Math.min(0.08, d * 0.08)})`,
              }}
            >
              <Sequence from={0} durationInFrames={total} layout="none">
                <DuotoneImage asset={c.asset} duration={total} direction={i % 2 === 0 ? 1 : -1} />
              </Sequence>
            </div>
          );
        })}
      </div>
      <AbsoluteFill style={{padding: pad, direction: 'rtl', justifyContent: 'flex-end', alignItems: 'flex-start'}}>
        <div style={{position: 'relative', height: vertical ? 90 : 70}}>
          {cats.map((c) => (
            <div key={c.asset} style={{position: 'absolute', right: 0, bottom: 0}}>
              <TypePlate text={c.label} from={relFrame(scene, c.from)} to={relFrame(scene, c.to)} size={vertical ? 'md' : 'sm'} />
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
