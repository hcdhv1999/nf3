import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT_FAMILY, TEXT_SIZES} from '../theme';

type Props = {
  text: string;
  /** إطار الظهور (نسبة إلى بداية المشهد) */
  from: number;
  /** إطار الاختفاء (نسبة إلى بداية المشهد) */
  to: number;
  size?: keyof typeof TEXT_SIZES;
  maxWidth?: number;
  style?: React.CSSProperties;
};

const OUT_FRAMES = 10;

/**
 * نص أبيض داخل لوح أخضر داكن، ينكشف من اليمين لليسار بقناع clip-path.
 * ⚠️ النص عقدة نصية واحدة — لا يُقسَّم إلى حروف أو span حتى لا تنفصل الحروف العربية.
 */
export const TypePlate: React.FC<Props> = ({text, from, to, size = 'md', maxWidth, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (frame < from || frame >= to) return null;

  const reveal = spring({frame: frame - from, fps, config: {damping: 200}, durationInFrames: 18});
  const hide = spring({
    frame: frame - (to - OUT_FRAMES),
    fps,
    config: {damping: 200},
    durationInFrames: OUT_FRAMES,
  });
  const nudge = spring({frame: frame - from, fps, config: {damping: 18, mass: 0.6}});

  const fontSize = TEXT_SIZES[size];
  // الكشف: الحافة اليسرى للقناع تتحرك من اليمين لليسار. الإخفاء: الحافة اليمنى تلحقها.
  const clipPath = `inset(0 ${hide * 100}% 0 ${(1 - reveal) * 100}%)`;

  return (
    <div
      style={{
        display: 'inline-block',
        direction: 'rtl',
        textAlign: 'right',
        background: COLORS.dark,
        color: COLORS.white,
        fontFamily: FONT_FAMILY,
        fontWeight: size === 'sm' ? 700 : 900,
        fontSize,
        lineHeight: 1.45,
        padding: `${fontSize * 0.12}px ${fontSize * 0.45}px ${fontSize * 0.2}px`,
        letterSpacing: 0,
        whiteSpace: maxWidth ? 'normal' : 'nowrap',
        maxWidth,
        clipPath,
        transform: `translateX(${(1 - nudge) * 24}px)`,
        ...style,
      }}
    >
      {text}
    </div>
  );
};
