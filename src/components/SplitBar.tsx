import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT_FAMILY} from '../theme';

type Side = {label: string; percent: number};
type Props = {start: number; right: Side; left: Side; suffix: string; width: number; height?: number};

/** شريط أفقي ينقسم إلى جزأين (يمين للجمعية، يسار لنفع) مع عدّاد تصاعدي */
export const SplitBar: React.FC<Props> = ({start, right, left, suffix, width, height = 130}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f = frame - start;
  const grow = spring({frame: f, fps, config: {damping: 200}, durationInFrames: 24});
  const split = spring({frame: f - 24, fps, config: {damping: 15, mass: 0.8}});
  const count = spring({frame: f - 26, fps, config: {damping: 200}, durationInFrames: 45});
  const labels = spring({frame: f - 40, fps, config: {damping: 200}, durationInFrames: 20});

  const gap = 28 * split;
  const total = right.percent + left.percent;
  const inner = width - gap;
  const rightW = (inner * right.percent) / total;
  const leftW = (inner * left.percent) / total;

  const segment = (side: Side, w: number, bg: string) => (
    <div style={{width: w, display: 'flex', flexDirection: 'column', gap: 22}}>
      <div
        style={{
          height,
          background: bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontFamily: FONT_FAMILY,
            fontWeight: 900,
            fontSize: height * 0.62,
            color: COLORS.white,
            opacity: split,
            direction: 'rtl',
          }}
        >
          {`${Math.round(side.percent * count)}${suffix}`}
        </span>
      </div>
      <div
        style={{
          fontFamily: FONT_FAMILY,
          fontWeight: 700,
          fontSize: 50,
          color: COLORS.dark,
          textAlign: 'center',
          opacity: labels,
          transform: `translateY(${(1 - labels) * 20}px)`,
        }}
      >
        {side.label}
      </div>
    </div>
  );

  return (
    <div style={{width, direction: 'rtl'}}>
      {/* الشريط ينمو من اليمين */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap,
          width,
          clipPath: `inset(0 0 0 ${(1 - grow) * 100}%)`,
        }}
      >
        {segment(right, rightW, COLORS.dark)}
        {segment(left, leftW, COLORS.primary)}
      </div>
    </div>
  );
};
