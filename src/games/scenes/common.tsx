import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { F } from '@/constants/theme';

/**
 * Every game scene gets the same inputs:
 * - level: 0..1 smoothed feedback from the engine (above the target ≈ 0.55..1, below ≈ 0..0.45)
 * - live:  false for thumbnails (scene is frozen on a pleasant frame)
 */
export type SceneProps = { level: SharedValue<number>; w: number; h: number; live: boolean };

export const ON = 0.5; // level above this means "on target"

export const fract = (x: number) => {
  'worklet';
  return x - Math.floor(x);
};

/** Stable 0..1 pseudo-random number for an integer seed (usable in worklets). */
export const hash = (n: number) => {
  'worklet';
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export const clamp = (v: number, lo = 0, hi = 1) => {
  'worklet';
  return Math.min(hi, Math.max(lo, v));
};

/**
 * How hard attention is driving the game, 0..1. Zero below the target (the game stalls),
 * 0.45 right at the target, rising to 1 at full attention. Nothing moves on its own.
 */
export const drive = (level: number) => {
  'worklet';
  return level > ON ? 0.45 + 0.55 * Math.min(1, Math.max(0, (level - 0.55) / 0.45)) : 0;
};

export const frameDt = (ms: number | null) => {
  'worklet';
  return Math.min(0.05, (ms ?? 16) / 1000);
};

export function seeded(n: number, seed = 7) {
  let x = seed;
  const r = () => ((x = (x * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: n }, () => ({ x: r(), y: r(), s: r() }));
}

export function StarField({ w, h, count = 70, maxY = 0.7, seed, color = '#FFF6E0' }: { w: number; h: number; count?: number; maxY?: number; seed?: number; color?: string }) {
  const stars = useMemo(() => seeded(count, seed), [count, seed]);
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((s, i) => (
        <Circle key={i} cx={s.x * w} cy={s.y * h * maxY} r={0.6 + s.s * 1.6} fill={color} opacity={0.3 + s.s * 0.6} />
      ))}
    </Svg>
  );
}

/** Small in-scene counter (coins, rings, baskets …) shown under the HUD, top-left. */
export function Counter({ icon, value, total }: { icon: React.ReactNode; value: number; total?: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 24,
        top: 36,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingLeft: 10,
        paddingRight: 18,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(255,255,255,0.92)',
      }}>
      <View style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
      <Text style={{ fontFamily: F.black, fontSize: 24, color: '#1D1838' }}>
        {value}
        {total != null ? <Text style={{ fontSize: 16, color: '#8D88A5' }}>{` / ${total}`}</Text> : null}
      </Text>
    </View>
  );
}

export function CoinIcon({ size = 30 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 30 30">
      <Circle cx={15} cy={15} r={13} fill="#FFC531" stroke="#E08A00" strokeWidth={2.5} />
      <Circle cx={15} cy={15} r={7} fill="none" stroke="#FFF1B8" strokeWidth={2} />
    </Svg>
  );
}
