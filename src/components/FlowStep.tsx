import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT_FAMILY} from '../theme';

export type FlowIcon = 'verify' | 'camera' | 'booking' | 'handover';

const ICONS: Record<FlowIcon, React.ReactNode> = {
  // مستند + علامة صح
  verify: (
    <>
      <path d="M18 8h20l10 10v38H18z" />
      <path d="M38 8v10h10" />
      <path d="M25 37l6 6 11-13" />
    </>
  ),
  // كاميرا + بطاقة سعر
  camera: (
    <>
      <path d="M10 22h10l4-6h16l4 6h10v28H10z" />
      <circle cx="32" cy="35" r="9" />
    </>
  ),
  // تقويم + بطاقة دفع
  booking: (
    <>
      <path d="M10 14h44v36H10z" />
      <path d="M10 24h44M20 8v10M44 8v10" />
      <path d="M18 34h10M18 42h18" />
    </>
  ),
  // مفتاح
  handover: (
    <>
      <circle cx="22" cy="32" r="10" />
      <path d="M32 32h24M48 32v8M54 32v6" />
    </>
  ),
};

type Props = {icon: FlowIcon; title: string; index: number; start: number; size: number; width?: number};

/** أيقونة بسيطة + عنوان قصير — تظهر بالتتابع */
export const FlowStep: React.FC<Props> = ({icon, title, index, start, size, width = size * 1.7}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pop = spring({frame: frame - start, fps, config: {damping: 14, mass: 0.7}});
  const draw = spring({frame: frame - start - 4, fps, config: {damping: 200}, durationInFrames: 22});

  return (
    <div
      style={{
        width,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: size * 0.18,
        opacity: Math.min(1, pop * 1.4),
        transform: `translateY(${(1 - pop) * 40}px) scale(${0.7 + 0.3 * pop})`,
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: COLORS.dark,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <svg viewBox="0 0 64 64" width={size * 0.56} height={size * 0.56}>
          <g
            fill="none"
            stroke={COLORS.white}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{strokeDasharray: 400, strokeDashoffset: 400 * (1 - draw)}}
          >
            {ICONS[icon]}
          </g>
        </svg>
        <div
          style={{
            position: 'absolute',
            top: -size * 0.04,
            right: -size * 0.04,
            width: size * 0.3,
            height: size * 0.3,
            borderRadius: '50%',
            background: COLORS.primary,
            color: COLORS.white,
            fontFamily: FONT_FAMILY,
            fontWeight: 900,
            fontSize: size * 0.17,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {index + 1}
        </div>
      </div>
      <div
        style={{
          fontFamily: FONT_FAMILY,
          fontWeight: 700,
          fontSize: size * 0.2,
          lineHeight: 1.4,
          color: COLORS.dark,
          textAlign: 'center',
          direction: 'rtl',
        }}
      >
        {title}
      </div>
    </div>
  );
};
