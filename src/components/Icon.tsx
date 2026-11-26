import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { C } from '@/constants/theme';

export type IconName =
  | 'back'
  | 'menu'
  | 'arrow'
  | 'pause'
  | 'play'
  | 'user'
  | 'sound'
  | 'globe'
  | 'info'
  | 'headset'
  | 'lock'
  | 'check'
  | 'close'
  | 'refresh'
  | 'film'
  | 'spark'
  | 'route'
  | 'chart'
  | 'down'
  | 'up'
  | 'bluetooth'
  | 'external';

export function Icon({ name, size = 22, color = C.text, stroke = 2 }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  const p = { stroke: color, strokeWidth: stroke, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'back' && <Path d="M15 5l-7 7 7 7" {...p} />}
      {name === 'arrow' && <Path d="M5 12h14M13 6l6 6-6 6" {...p} />}
      {name === 'down' && <Path d="M6 9l6 6 6-6" {...p} />}
      {name === 'up' && <Path d="M6 15l6-6 6 6" {...p} />}
      {name === 'menu' && (
        <>
          <Path d="M4 7h16M4 12h16M4 17h10" {...p} />
        </>
      )}
      {name === 'pause' && <Path d="M9 6v12M15 6v12" {...p} strokeWidth={stroke + 1} />}
      {name === 'play' && <Path d="M8 5.5v13l10-6.5z" {...p} fill={color} />}
      {name === 'user' && (
        <>
          <Circle cx="12" cy="8.5" r="3.5" {...p} />
          <Path d="M5 20c1.2-3.5 4-5 7-5s5.8 1.5 7 5" {...p} />
        </>
      )}
      {name === 'sound' && (
        <>
          <Path d="M4 10v4h4l5 4V6L8 10z" {...p} />
          <Path d="M16.5 9a4 4 0 010 6M19 6.5a7.5 7.5 0 010 11" {...p} />
        </>
      )}
      {name === 'globe' && (
        <>
          <Circle cx="12" cy="12" r="8.5" {...p} />
          <Path d="M3.5 12h17M12 3.5c2.5 2.6 3.6 5.4 3.6 8.5s-1.1 5.9-3.6 8.5c-2.5-2.6-3.6-5.4-3.6-8.5S9.5 6.1 12 3.5z" {...p} />
        </>
      )}
      {name === 'info' && (
        <>
          <Circle cx="12" cy="12" r="8.5" {...p} />
          <Path d="M12 11v5M12 8h.01" {...p} />
        </>
      )}
      {name === 'headset' && (
        <>
          <Path d="M3.5 13.5c0-5 3.8-8.5 8.5-8.5s8.5 3.5 8.5 8.5" {...p} />
          <Rect x="3" y="13" width="4" height="6" rx="1.6" {...p} />
          <Rect x="17" y="13" width="4" height="6" rx="1.6" {...p} />
        </>
      )}
      {name === 'lock' && (
        <>
          <Rect x="5" y="10.5" width="14" height="9.5" rx="2.5" {...p} />
          <Path d="M8 10.5V8a4 4 0 018 0v2.5" {...p} />
        </>
      )}
      {name === 'check' && <Path d="M5 12.5l4.5 4.5L19 7.5" {...p} />}
      {name === 'close' && <Path d="M6 6l12 12M18 6L6 18" {...p} />}
      {name === 'refresh' && <Path d="M19.5 12a7.5 7.5 0 11-2.2-5.3M19.5 4.5v4h-4" {...p} />}
      {name === 'film' && (
        <>
          <Rect x="3.5" y="5.5" width="17" height="13" rx="2.5" {...p} />
          <Path d="M10 9.5v5l4.5-2.5z" {...p} fill={color} />
        </>
      )}
      {name === 'spark' && <Path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4zM18.5 16l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" {...p} />}
      {name === 'route' && (
        <>
          <Circle cx="6" cy="18" r="2.2" {...p} />
          <Circle cx="18" cy="6" r="2.2" {...p} />
          <Path d="M8.2 18H15a3 3 0 000-6H9a3 3 0 010-6h6.8" {...p} />
        </>
      )}
      {name === 'chart' && <Path d="M4 19.5h16M7 16v-4M12 16V7M17 16v-6" {...p} />}
      {name === 'bluetooth' && <Path d="M7 7.5l10 9-5 4.5v-18l5 4.5-10 9" {...p} />}
      {name === 'external' && <Path d="M14 5h5v5M19 5l-8 8M17 14v4.5a1.5 1.5 0 01-1.5 1.5h-10A1.5 1.5 0 014 18.5v-10A1.5 1.5 0 015.5 7H10" {...p} />}
    </Svg>
  );
}
