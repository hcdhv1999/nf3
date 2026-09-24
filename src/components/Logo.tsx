import React from 'react';
import {Img, staticFile} from 'remotion';
import {hasPublicFile, LOGO_FILE} from '../assets';
import {COLORS, FONT_FAMILY} from '../theme';

type Props = {
  height: number;
  color?: string;
  dotColor?: string;
  /** خلفية كريمية صغيرة خلف اللوقو ليبقى مقروءًا فوق الصور الداكنة */
  badge?: boolean;
  style?: React.CSSProperties;
};

/** لوقو نفع من public/logo.png — وإن لم يوجد يُرسم شعار نصي بديل */
export const Logo: React.FC<Props> = ({height, color = COLORS.dark, dotColor = COLORS.primary, badge, style}) => {
  const badgeStyle: React.CSSProperties = badge
    ? {background: COLORS.cream, padding: `${height * 0.14}px ${height * 0.26}px`, borderRadius: height * 0.14}
    : {};
  if (hasPublicFile(LOGO_FILE)) {
    return (
      <div style={{...badgeStyle, ...style}}>
        <Img src={staticFile(LOGO_FILE)} style={{height, width: 'auto', display: 'block'}} />
      </div>
    );
  }
  return (
    <div
      style={{
        height,
        display: 'flex',
        alignItems: 'center',
        gap: height * 0.12,
        direction: 'rtl',
        boxSizing: 'content-box',
        ...badgeStyle,
        ...style,
      }}
    >
      <div
        style={{
          fontFamily: FONT_FAMILY,
          fontWeight: 900,
          fontSize: height * 0.82,
          lineHeight: 1,
          color,
          paddingBottom: height * 0.12,
        }}
      >
        نفع
      </div>
      <div style={{width: height * 0.2, height: height * 0.2, borderRadius: '50%', background: dotColor}} />
    </div>
  );
};

/** موضع اللوقو الثابت أعلى يمين الشاشة */
export const LOGO_CORNER = {top: 44, right: 56, height: 72};
