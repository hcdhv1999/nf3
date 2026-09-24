import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';
import {FONT_FAMILY} from './theme';

// نطاقات الحروف من @fontsource/cairo — ملف عربي وملف لاتيني لكل وزن.
const ARABIC_RANGE =
  'U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC';
const LATIN_RANGE =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';

const WEIGHTS = ['400', '700', '900'] as const;

let started = false;

/** يحمّل خط Cairo محليًا من public/fonts — يوقف التصيير حتى يكتمل التحميل */
export const loadCairo = () => {
  if (started) return;
  started = true;
  for (const weight of WEIGHTS) {
    loadFont({
      family: FONT_FAMILY,
      url: staticFile(`fonts/cairo-arabic-${weight}-normal.woff2`),
      weight,
      unicodeRange: ARABIC_RANGE,
    });
    loadFont({
      family: FONT_FAMILY,
      url: staticFile(`fonts/cairo-latin-${weight}-normal.woff2`),
      weight,
      unicodeRange: LATIN_RANGE,
    });
  }
};
