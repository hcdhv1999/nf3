import React, {useId} from 'react';
import {AbsoluteFill, Img, interpolate, useCurrentFrame} from 'remotion';
import {resolveAsset} from '../assets';
import {COLORS} from '../theme';
import {Placeholder} from './Placeholder';

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

// الظلال → الأخضر الداكن، الإضاءات → الكريمي (حسب الإضاءة النسبية للبكسل)
const [sr, sg, sb] = hex(COLORS.dark);
const [hr, hg, hb] = hex(COLORS.cream);
const row = (s: number, h: number) => {
  const d = h - s;
  return `${d * 0.2126} ${d * 0.7152} ${d * 0.0722} 0 ${s}`;
};
const DUOTONE_MATRIX = `${row(sr, hr)} ${row(sg, hg)} ${row(sb, hb)} 0 0 0 1 0`;

type Props = {
  asset: string;
  /** مدة الحركة بالإطارات (نسبة إلى بداية العنصر) */
  duration: number;
  /** اتجاه الانزلاق: 1 لليسار، -1 لليمين */
  direction?: 1 | -1;
  style?: React.CSSProperties;
};

/** صورة بتأثير دوتون (SVG feColorMatrix) مع بارالاكس بطيء: انزلاق أفقي + تكبير 4٪ */
export const DuotoneImage: React.FC<Props> = ({asset, duration, direction = 1, style}) => {
  const frame = useCurrentFrame();
  const filterId = `duo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const {src, label} = resolveAsset(asset);

  // البارالاكس هو الحركة الوحيدة الخطية في المشروع (مقصود)
  const t = interpolate(frame, [0, Math.max(1, duration)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scale = 1.04 + 0.04 * t;
  const shift = direction * (1 - 2 * t) * 1.2; // ٪

  return (
    <AbsoluteFill style={{overflow: 'hidden', background: COLORS.dark, ...style}}>
      <svg width={0} height={0} style={{position: 'absolute'}} aria-hidden>
        <filter id={filterId} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values={DUOTONE_MATRIX} />
        </filter>
      </svg>
      <AbsoluteFill style={{transform: `translateX(${shift}%) scale(${scale})`}}>
        {src ? (
          <Img
            src={src}
            style={{width: '100%', height: '100%', objectFit: 'cover', filter: `url(#${filterId})`}}
          />
        ) : (
          <Placeholder label={label} asset={asset} />
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
