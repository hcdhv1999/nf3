import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Scene} from '../script';
import {useLayout} from '../layout';
import {COLORS} from '../theme';
import {FlowStep} from '../components/FlowStep';
import {PlateStack, relFrame} from './common';

/** المشهد 4: أربع خطوات تظهر بالتتابع مع خط يربطها */
export const S4: React.FC<{scene: Scene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {vertical, pad} = useLayout();
  const steps = scene.steps ?? [];
  const size = vertical ? 190 : 200;

  return (
    <AbsoluteFill style={{background: COLORS.cream}}>
      <PlateStack scene={scene} lines={scene.lines} position="top" />
      <AbsoluteFill
        style={{
          direction: 'rtl',
          display: 'flex',
          flexDirection: vertical ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: vertical ? pad + 90 : 60,
          gap: 0,
        }}
      >
        {steps.map((s, i) => {
          const start = relFrame(scene, s.at);
          const next = steps[i + 1];
          const link = next
            ? spring({frame: frame - relFrame(scene, next.at) + 10, fps, config: {damping: 200}, durationInFrames: 14})
            : 0;
          return (
            <React.Fragment key={i}>
              <FlowStep icon={s.icon} title={s.title} index={i} start={start} size={size} width={vertical ? size * 3 : undefined} />
              {next ? (
                <div
                  style={{
                    width: vertical ? 6 : 90,
                    height: vertical ? 44 : 6,
                    marginBottom: vertical ? 0 : size * 0.55,
                    background: COLORS.primary,
                    borderRadius: 3,
                    transformOrigin: vertical ? 'top' : 'right',
                    transform: vertical ? `scaleY(${link})` : `scaleX(${link})`,
                  }}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
