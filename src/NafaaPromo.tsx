import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import {scenes, TRANSITION_SECONDS, type Scene} from './script';
import {sec} from './layout';
import {COLORS, FONT_FAMILY} from './theme';
import {loadCairo} from './fonts';
import {AudioLayer} from './components/AudioLayer';
import {Grain} from './components/Grain';
import {Vignette} from './components/Vignette';
import {Logo, LOGO_CORNER} from './components/Logo';
import {Wipe} from './components/Wipe';
import {S1} from './scenes/S1';
import {S2} from './scenes/S2';
import {S3} from './scenes/S3';
import {S4} from './scenes/S4';
import {S5} from './scenes/S5';
import {S6} from './scenes/S6';
import {S7} from './scenes/S7';
import {S8} from './scenes/S8';

loadCairo();

const SCENE_COMPONENTS: Record<Scene['id'], React.FC<{scene: Scene}>> = {S1, S2, S3, S4, S5, S6, S7, S8};

/** المشاهد التي تعرض لوقو خاصًا بها (فيُخفى اللوقو الثابت أثناءها) */
const OWN_LOGO: Scene['id'][] = ['S3', 'S8'];

const CornerLogo: React.FC = () => {
  const frame = useCurrentFrame();
  const current = scenes.find((s) => frame >= sec(s.from) && frame < sec(s.to));
  if (current && OWN_LOGO.includes(current.id)) return null;
  return (
    <div style={{position: 'absolute', top: LOGO_CORNER.top, right: LOGO_CORNER.right, opacity: 0.9}}>
      <Logo height={LOGO_CORNER.height} badge />
    </div>
  );
};

export const NafaaPromo: React.FC = () => {
  const boundaries = scenes.slice(1).map((s) => sec(s.from));
  return (
    <AbsoluteFill style={{background: COLORS.cream, direction: 'rtl', textAlign: 'right', fontFamily: FONT_FAMILY}}>
      {scenes.map((s) => {
        const C = SCENE_COMPONENTS[s.id];
        return (
          <Sequence key={s.id} name={s.id} from={sec(s.from)} durationInFrames={sec(s.to) - sec(s.from)}>
            <C scene={s} />
          </Sequence>
        );
      })}
      <CornerLogo />
      {boundaries.map((b) => (
        <Wipe key={b} at={b} frames={sec(TRANSITION_SECONDS)} />
      ))}
      <Vignette />
      <Grain />
      <AudioLayer />
    </AbsoluteFill>
  );
};
