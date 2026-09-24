import React from 'react';
import {AbsoluteFill} from 'remotion';
import {ASSETS} from '../assets';
import {COLORS, FONT_FAMILY} from '../theme';

/** مربع بديل بلون الهوية يحمل اسم الأصل — يظهر عند غياب الصورة بدل إيقاف التصيير */
export const Placeholder: React.FC<{label: string; asset: string}> = ({label, asset}) => {
  const file = (ASSETS as Record<string, {file: string}>)[asset]?.file ?? asset;
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${COLORS.dark} 0%, ${COLORS.primary} 140%)`,
        alignItems: 'center',
        justifyContent: 'center',
        direction: 'rtl',
        fontFamily: FONT_FAMILY,
      }}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.07}}
      >
        {Array.from({length: 14}).map((_, i) => (
          <line key={i} x1={i * 8 - 10} y1={0} x2={i * 8 + 10} y2={100} stroke={COLORS.cream} strokeWidth={0.25} />
        ))}
      </svg>
      <div style={{color: COLORS.cream, fontWeight: 900, fontSize: 96, lineHeight: 1.3, opacity: 0.9}}>{label}</div>
      <div style={{color: COLORS.cream, fontWeight: 400, fontSize: 26, opacity: 0.55, direction: 'ltr', marginTop: 24}}>
        public/{file}
      </div>
    </AbsoluteFill>
  );
};
