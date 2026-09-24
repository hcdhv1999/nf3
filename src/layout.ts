import {useVideoConfig} from 'remotion';
import {FPS} from './script';

export const useLayout = () => {
  const {width, height} = useVideoConfig();
  const vertical = height > width;
  return {width, height, vertical, pad: vertical ? 72 : 110};
};

export const sec = (s: number) => Math.round(s * FPS);
