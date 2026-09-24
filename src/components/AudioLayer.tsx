import React, {useMemo} from 'react';
import {Audio, interpolate, staticFile, useVideoConfig} from 'remotion';
import {hasPublicFile, MUSIC_FILE, VO_FILE} from '../assets';
import {scenes} from '../script';

const MUSIC_UNDER_VO = 0.15;
const MUSIC_GAP = 0.4;
const RAMP_FRAMES = 12;

/**
 * التعليق الصوتي + الموسيقى. الموسيقى تنخفض إلى 15٪ أثناء فترات التعليق
 * (من script.ts) وترجع إلى 40٪ في الفواصل. إن غاب أي ملف يُتجاهل بصمت.
 */
export const AudioLayer: React.FC = () => {
  const {fps, durationInFrames} = useVideoConfig();
  const hasVo = hasPublicFile(VO_FILE);
  const hasMusic = hasPublicFile(MUSIC_FILE);

  const musicVolume = useMemo(() => {
    const ranges = scenes
      .filter((s) => s.vo.to > s.vo.from)
      .map((s) => [Math.round(s.vo.from * fps), Math.round(s.vo.to * fps)] as const);
    const raw = Array.from({length: durationInFrames}, (_, f) =>
      hasVo && ranges.some(([a, b]) => f >= a && f < b) ? MUSIC_UNDER_VO : MUSIC_GAP,
    );
    // تنعيم الانتقال بين المستويين (متوسط متحرك)
    return raw.map((_, f) => {
      let sum = 0;
      let n = 0;
      for (let i = f - RAMP_FRAMES; i <= f + RAMP_FRAMES; i++) {
        if (i >= 0 && i < raw.length) {
          sum += raw[i];
          n++;
        }
      }
      return sum / n;
    });
  }, [fps, durationInFrames, hasVo]);

  return (
    <>
      {hasVo ? <Audio src={staticFile(VO_FILE)} /> : null}
      {hasMusic ? (
        <Audio
          src={staticFile(MUSIC_FILE)}
          loop
          volume={(f) => {
            const fade = interpolate(f, [0, 15, durationInFrames - 45, durationInFrames], [0, 1, 1, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            return (musicVolume[f] ?? MUSIC_GAP) * fade;
          }}
        />
      ) : null}
    </>
  );
};
