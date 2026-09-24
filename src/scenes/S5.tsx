import React from 'react';
import {AbsoluteFill} from 'remotion';
import type {Scene} from '../script';
import {useLayout} from '../layout';
import {COLORS} from '../theme';
import {SplitBar} from '../components/SplitBar';
import {PlateStack, relFrame} from './common';

/** المشهد 5: تقسيم الإيراد 70/30 */
export const S5: React.FC<{scene: Scene}> = ({scene}) => {
  const {width, vertical} = useLayout();
  const split = scene.split;
  return (
    <AbsoluteFill style={{background: COLORS.cream}}>
      <PlateStack scene={scene} lines={scene.lines} position="top" />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', paddingTop: 80}}>
        {split ? (
          <SplitBar
            start={relFrame(scene, split.at)}
            right={split.right}
            left={split.left}
            suffix={split.suffix}
            width={vertical ? width - 140 : width * 0.72}
            height={vertical ? 150 : 170}
          />
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
