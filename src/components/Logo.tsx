import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { BRAND } from '@/constants/brand';
import { C, F } from '@/constants/theme';
import { Txt } from './ui';

/** The Excellent Mind mark: a violet tile with a rising brainwave and a sun spark. */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Defs>
        <LinearGradient id="emTile" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#8B6BFF" />
          <Stop offset="1" stopColor={C.focusDeep} />
        </LinearGradient>
      </Defs>
      <Rect x="2" y="2" width="44" height="44" rx="14" fill="url(#emTile)" />
      <Path d="M9 29 C13 29 14 20 18 20 C22 20 22 33 26 33 C30 33 30 16 34 16 C36 16 37 19 39 19" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Circle cx="37" cy="11" r="4.5" fill={C.sun} />
    </Svg>
  );
}

export function Logo({ size = 34, showName = true }: { size?: number; showName?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <LogoMark size={size} />
      {showName && <Txt style={{ fontFamily: F.black, fontSize: size * 0.66, letterSpacing: 0.2, color: C.text }}>{BRAND.name}</Txt>}
    </View>
  );
}
