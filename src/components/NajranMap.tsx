import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS} from '../theme';

/*
 * خريطة تخطيطية مبسّطة (وليست مرجعًا جغرافيًا دقيقًا).
 * الإحداثيات [خط الطول، خط العرض] تقريبية لإعطاء الشكل العام.
 */
const SAUDI: [number, number][] = [
  [34.95, 29.36], [36.07, 29.2], [36.5, 29.5], [37.5, 29.95], [38.0, 30.5], [37.0, 31.5],
  [39.2, 32.15], [40.4, 31.9], [42.1, 31.1], [44.7, 29.2], [46.5, 29.1], [47.4, 29.0],
  [47.7, 28.5], [48.4, 28.5], [48.8, 27.7], [49.3, 27.1], [50.1, 26.7], [50.2, 25.6],
  [50.8, 24.75], [51.3, 24.3], [51.6, 24.2], [52.6, 22.9], [55.1, 22.6], [55.7, 22.0],
  [55.0, 20.0], [52.0, 19.0], [49.1, 18.6], [48.2, 18.2], [47.5, 17.1], [46.4, 17.2],
  [45.2, 17.4], [44.0, 17.4], [43.4, 17.5], [43.1, 16.9], [42.8, 16.4], [42.6, 16.8],
  [41.8, 17.8], [40.9, 19.5], [39.6, 21.0], [39.1, 21.9], [38.7, 23.0], [37.5, 24.3],
  [36.6, 25.7], [35.6, 27.3], [35.0, 28.1], [34.6, 28.1],
];

/** منطقة نجران — تقريبية */
const NAJRAN: [number, number][] = [
  [43.6, 17.5], [44.0, 17.4], [45.2, 17.4], [46.4, 17.2], [47.5, 17.1], [48.2, 18.2],
  [49.1, 18.6], [49.5, 19.6], [47.0, 20.3], [45.0, 19.8], [44.0, 19.0], [43.6, 18.2],
];

/** نقاط الأصول (مواقع تقريبية داخل المنطقة) */
const DOTS: [number, number][] = [
  [44.13, 17.49], [44.45, 17.85], [43.95, 17.95], [44.75, 18.55], [45.6, 18.1],
  [47.12, 17.47], [46.2, 18.9], [44.35, 18.95], [48.3, 18.9],
];

const LON = [34.4, 56.0];
const LAT = [16.0, 32.5];
const K = Math.cos((24 * Math.PI) / 180);

type Props = {width: number; height: number; start: number};

export const NajranMap: React.FC<Props> = ({width, height, start}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const geoW = (LON[1] - LON[0]) * K;
  const geoH = LAT[1] - LAT[0];
  const s = Math.min(width / geoW, height / geoH);
  const ox = (width - geoW * s) / 2;
  const oy = (height - geoH * s) / 2;
  const proj = ([lon, lat]: [number, number]) =>
    [ox + (lon - LON[0]) * K * s, oy + (LAT[1] - lat) * s] as const;
  const toPath = (pts: [number, number][]) =>
    `M${pts.map((p) => proj(p).map((v) => v.toFixed(1)).join(',')).join(' L')} Z`;

  const f = frame - start;
  const outline = spring({frame: f, fps, config: {damping: 200}, durationInFrames: 40});
  const region = spring({frame: f - 22, fps, config: {damping: 200}, durationInFrames: 20});
  const zoom = spring({frame: f - 30, fps, config: {damping: 200}, durationInFrames: 45});

  // تقريب خفيف حول نجران (دون إخراج الخريطة من الإطار)
  const [nx, ny] = proj([45.8, 18.5]);
  const z = 1 + zoom * 0.12;

  return (
    <svg width={width} height={height} style={{overflow: 'visible'}}>
      <defs>
        <radialGradient id="dotGlow">
          <stop offset="0%" stopColor={COLORS.accent} stopOpacity={0.9} />
          <stop offset="100%" stopColor={COLORS.accent} stopOpacity={0} />
        </radialGradient>
      </defs>
      <g transform={`translate(${nx} ${ny}) scale(${z}) translate(${-nx} ${-ny})`}>
        <path
          d={toPath(SAUDI)}
          fill={COLORS.dark}
          fillOpacity={0.06 * outline}
          stroke={COLORS.dark}
          strokeWidth={3 / z}
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1 - outline}
        />
        <path
          d={toPath(NAJRAN)}
          fill={COLORS.primary}
          fillOpacity={0.85 * region}
          stroke={COLORS.dark}
          strokeWidth={2 / z}
          strokeOpacity={region}
        />
        {DOTS.map((d, i) => {
          const p = spring({frame: f - 45 - i * 6, fps, config: {damping: 12, mass: 0.5}});
          const [x, y] = proj(d);
          return (
            <g key={i} opacity={Math.min(1, p)}>
              <circle cx={x} cy={y} r={(26 * p) / z} fill="url(#dotGlow)" />
              <circle cx={x} cy={y} r={(7 * p) / z} fill={COLORS.accent} stroke={COLORS.cream} strokeWidth={1.5 / z} />
            </g>
          );
        })}
      </g>
    </svg>
  );
};
