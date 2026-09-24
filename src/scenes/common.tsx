import React from 'react';
import {AbsoluteFill} from 'remotion';
import type {Line, Scene} from '../script';
import {sec, useLayout} from '../layout';
import {TypePlate} from '../components/TypePlate';
import {LOGO_CORNER} from '../components/Logo';

/** يحوّل وقتًا مطلقًا (ثانية) إلى إطار نسبةً إلى بداية المشهد */
export const relFrame = (scene: Scene, seconds: number) => sec(seconds - scene.from);

/** ألواح نصية مكدّسة في زاوية (أسفل اليمين افتراضيًا) */
export const PlateStack: React.FC<{
  scene: Scene;
  lines: Line[];
  position?: 'bottom' | 'center' | 'top';
  align?: 'right' | 'center';
  maxWidth?: number;
}> = ({scene, lines, position = 'bottom', align = 'right', maxWidth}) => {
  const {pad} = useLayout();
  return (
    <AbsoluteFill
      style={{
        padding: pad,
        // لا يتداخل اللوح العلوي مع اللوقو الثابت
        paddingTop: position === 'top' ? LOGO_CORNER.top + LOGO_CORNER.height + 60 : pad,
        direction: 'rtl',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: position === 'bottom' ? 'flex-end' : position === 'top' ? 'flex-start' : 'center',
        alignItems: align === 'right' ? 'flex-start' : 'center',
        gap: 14,
      }}
    >
      {lines.map((l, i) => (
        <TypePlate
          key={i}
          text={l.text}
          from={relFrame(scene, l.from)}
          to={relFrame(scene, l.to)}
          size={l.size}
          maxWidth={maxWidth}
        />
      ))}
    </AbsoluteFill>
  );
};
