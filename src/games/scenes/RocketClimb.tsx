import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { runOnJS, SharedValue, useAnimatedStyle, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import { clamp, Counter, drive, fract, frameDt, hash, SceneProps, StarField } from './common';

/* Vertical climb controlled by attention: attention on target is thrust and the rocket climbs
 * toward space; when attention drops the engine cuts out and the rocket sinks back. */

const space = (alt: number) => {
  'worklet';
  return clamp((alt - 0.25) * 1.6);
};

function Cloud({ i, w, h, dist, alt }: { i: number; w: number; h: number; dist: SharedValue<number>; alt: SharedValue<number> }) {
  const st = useAnimatedStyle(() => ({
    opacity: 1 - space(alt.value),
    transform: [{ translateX: hash(i * 3 + 1) * w - 110 }, { translateY: -h * 0.25 + fract(i / 5 + dist.value * 0.45 + hash(i)) * h * 1.5 }],
  }));
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 220, height: 90 }, st]}>
      <Svg width={220} height={90}>
        <Ellipse cx={70} cy={58} rx={60} ry={26} fill="#FFFFFF" opacity={0.9} />
        <Ellipse cx={120} cy={44} rx={56} ry={34} fill="#FFFFFF" opacity={0.9} />
        <Ellipse cx={168} cy={60} rx={44} ry={22} fill="#FFFFFF" opacity={0.9} />
      </Svg>
    </Animated.View>
  );
}

function Streak({ i, w, h, dist, alt }: { i: number; w: number; h: number; dist: SharedValue<number>; alt: SharedValue<number> }) {
  const st = useAnimatedStyle(() => ({
    opacity: space(alt.value) * 0.8,
    transform: [{ translateX: hash(i * 7 + 2) * w }, { translateY: -40 + fract(i / 14 + dist.value * 1.2 + hash(i)) * (h + 80) }],
  }));
  return <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 3, height: 26, borderRadius: 2, backgroundColor: '#FFFFFF' }, st]} />;
}

function Puff({ i, cx, cy, t, level }: { i: number; cx: number; cy: number; t: SharedValue<number>; level: SharedValue<number> }) {
  const st = useAnimatedStyle(() => {
    const p = fract(i / 7 + t.value * (0.5 + level.value));
    return {
      opacity: (1 - p) * (0.25 + level.value * 0.5),
      transform: [{ translateX: cx - 30 + (hash(i) - 0.5) * 60 * p }, { translateY: cy + p * 260 }, { scale: 0.4 + p * 1.8 }],
    };
  });
  return <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 60, height: 60, borderRadius: 30, backgroundColor: '#F4F1FF' }, st]} />;
}

export default function RocketClimb({ level, w, h, live }: SceneProps) {
  const cx = w / 2;
  const ry = h * 0.42;
  const alt = useSharedValue(live ? 0 : 0.35);
  const dist = useSharedValue(0.3);
  const t = useSharedValue(0);
  const shown = useSharedValue(0);
  const vel = useSharedValue(live ? 0 : 0.012);
  const [km, setKm] = useState(0);

  const clock = useFrameCallback((f) => {
    const dt = frameDt(f.timeSincePreviousFrame);
    const d = drive(level.value);
    t.value += dt;
    vel.value += ((d > 0 ? d * 0.016 : -0.008) - vel.value) * Math.min(1, dt * 1.5);
    alt.value = Math.max(0, alt.value + dt * vel.value);
    dist.value += dt * vel.value * 70; // clouds stream down when climbing, up when falling
    const k = Math.floor(alt.value * 120);
    if (k !== shown.value) {
      shown.value = k;
      runOnJS(setKm)(k);
    }
  }, live);
  useEffect(() => clock.setActive(live), [clock, live]);

  const spaceSt = useAnimatedStyle(() => ({ opacity: space(alt.value) }));
  const ground = useAnimatedStyle(() => ({ transform: [{ translateY: alt.value * h * 5 }] }));
  const planet = useAnimatedStyle(() => ({
    opacity: clamp((space(alt.value) - 0.4) * 2),
    transform: [{ translateX: w * 0.72 }, { translateY: -h * 0.6 + fract(dist.value * 0.05 + 0.4) * h * 2 }],
  }));
  const rocket = useAnimatedStyle(() => ({
    transform: [{ translateX: cx - 60 + Math.sin(t.value * 1.7) * 6 }, { translateY: ry - 110 + Math.sin(t.value * 2.3) * 4 }, { rotate: `${Math.sin(t.value * 1.7) * 2}deg` }],
  }));
  const flame = useAnimatedStyle(() => {
    const p = clamp(vel.value / 0.016);
    return { opacity: p > 0.02 ? 1 : 0, transform: [{ scaleY: 0.15 + p * 1.6 + Math.sin(t.value * 40) * 0.08 * p }, { scaleX: 0.6 + p * 0.5 }] };
  });

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={['#4AB3FF', '#A8DBFF', '#E9F6FF']} style={StyleSheet.absoluteFill} />
      <Animated.View style={[StyleSheet.absoluteFill, spaceSt]}>
        <LinearGradient colors={['#05051A', '#151240', '#2B1F6B']} style={StyleSheet.absoluteFill} />
        <StarField w={w} h={h} count={120} maxY={1} seed={23} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 240, height: 240 }, planet]}>
        <Svg width={240} height={240}>
          <Circle cx={120} cy={120} r={70} fill="#FF9F6B" />
          <Path d="M58 100 Q120 80 182 100" stroke="#E5734A" strokeWidth={10} fill="none" />
          <Path d="M54 132 Q120 150 186 132" stroke="#E5734A" strokeWidth={8} fill="none" />
          <Ellipse cx={120} cy={120} rx={116} ry={26} stroke="#FFD9A8" strokeWidth={8} fill="none" />
        </Svg>
      </Animated.View>
      {Array.from({ length: 14 }, (_, i) => (
        <Streak key={'s' + i} i={i} w={w} h={h} dist={dist} alt={alt} />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <Cloud key={'c' + i} i={i} w={w} h={h} dist={dist} alt={alt} />
      ))}
      <Animated.View style={[{ position: 'absolute', left: 0, top: h * 0.78, width: w, height: h * 0.4 }, ground]}>
        <Svg width={w} height={h * 0.4}>
          <Path d={`M0 ${h * 0.08} Q${w * 0.25} 0 ${w * 0.5} ${h * 0.06} T${w} ${h * 0.05} L${w} ${h * 0.4} L0 ${h * 0.4} Z`} fill="#6CC46A" />
          <Rect x={cx - 110} y={h * 0.03} width={220} height={26} rx={8} fill="#8E8AA8" />
          <Rect x={cx - 130} y={-h * 0.18} width={16} height={h * 0.24} fill="#B7B2CF" />
        </Svg>
      </Animated.View>
      {Array.from({ length: 7 }, (_, i) => (
        <Puff key={'p' + i} i={i} cx={cx} cy={ry + 90} t={t} level={level} />
      ))}
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 120, height: 260 }, rocket]}>
        <Animated.View style={[{ position: 'absolute', left: 36, top: 186, width: 48, height: 80, transformOrigin: 'top' as any }, flame]}>
          <Svg width={48} height={80}>
            <Path d="M4 0 Q24 90 44 0 Z" fill="#FF7A3D" />
            <Path d="M14 0 Q24 56 34 0 Z" fill="#FFE38A" />
          </Svg>
        </Animated.View>
        <Svg width={120} height={200} viewBox="0 0 120 200">
          <Path d="M28 130 L6 178 L36 168 Z" fill="#F2456B" />
          <Path d="M92 130 L114 178 L84 168 Z" fill="#F2456B" />
          <Path d="M60 4 C96 40 96 120 88 172 L32 172 C24 120 24 40 60 4 Z" fill="#FFFFFF" />
          <Path d="M60 4 C74 18 82 32 86 48 L34 48 C38 32 46 18 60 4 Z" fill="#F2456B" />
          <Rect x={30} y={120} width={60} height={12} fill="#6C47FF" />
          <Circle cx={60} cy={84} r={17} fill="#6C47FF" />
          <Circle cx={60} cy={84} r={11} fill="#BFE3FF" />
          <Rect x={40} y={170} width={40} height={14} rx={4} fill="#5A5A70" />
        </Svg>
      </Animated.View>
      {live && (
        <Counter
          value={km}
          icon={
            <Svg width={30} height={30} viewBox="0 0 24 24">
              <Path d="M12 2 C17 6 17 14 15 18 L9 18 C7 14 7 6 12 2 Z" fill="#6C47FF" />
              <Path d="M9 18 L12 23 L15 18 Z" fill="#FF7A3D" />
            </Svg>
          }
        />
      )}
    </View>
  );
}
