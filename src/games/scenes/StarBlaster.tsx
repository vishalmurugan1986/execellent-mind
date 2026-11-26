import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { runOnJS, SharedValue, useAnimatedStyle, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { clamp, Counter, fract, frameDt, hash, ON, SceneProps, StarField } from './common';

/* Space shooter controlled by attention: the laser only fires while attention is on target.
 * Asteroids you don't break up crash into the ship's shield. */

const N = 5;
const rock = (i: number, dist: number, w: number, h: number) => {
  'worklet';
  const t = i / N + dist;
  const p = fract(t);
  const seed = i + N * Math.floor(t);
  return { p, x: w * 1.1 - p * w * 1.25, y: h * (0.22 + hash(seed) * 0.56), size: 0.75 + hash(seed * 1.3 + 2) * 0.5 };
};

function Rock({ i, w, h, dist, hp, boom, t }: { i: number; w: number; h: number; dist: SharedValue<number>; hp: SharedValue<number[]>; boom: SharedValue<number[]>; t: SharedValue<number> }) {
  const st = useAnimatedStyle(() => {
    const r = rock(i, dist.value, w, h);
    const life = hp.value[i];
    const shake = life < 1 && life > 0 ? Math.sin(t.value * 60) * 3 : 0;
    return {
      opacity: boom.value[i] > 0 ? 0 : 1,
      transform: [{ translateX: r.x - 55 + shake }, { translateY: r.y - 55 }, { scale: r.size * (0.75 + 0.25 * Math.max(life, 0)) }, { rotate: `${t.value * (20 + i * 9)}deg` }],
    };
  });
  const bang = useAnimatedStyle(() => {
    const r = rock(i, dist.value, w, h);
    const b = boom.value[i];
    return { opacity: b > 0 ? clamp(1 - b / 0.6) : 0, transform: [{ translateX: r.x - 80 }, { translateY: r.y - 80 }, { scale: 0.3 + clamp(b / 0.6) * 1.2 }] };
  });
  return (
    <>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 110, height: 110 }, st]}>
        <Svg width={110} height={110} viewBox="0 0 110 110">
          <Path d="M20 40 L42 14 L74 18 L96 44 L90 78 L60 98 L26 86 L10 62 Z" fill="#8C7B6B" stroke="#5E5146" strokeWidth={4} />
          <Circle cx={44} cy={44} r={10} fill="#6E6155" />
          <Circle cx={70} cy={66} r={13} fill="#6E6155" />
          <Circle cx={36} cy={72} r={6} fill="#6E6155" />
        </Svg>
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 160, height: 160 }, bang]}>
        <Svg width={160} height={160}>
          <Defs>
            <RadialGradient id={`bang${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#FFFFFF" />
              <Stop offset="0.4" stopColor="#FFE38A" />
              <Stop offset="0.75" stopColor="#FF7A3D" stopOpacity="0.7" />
              <Stop offset="1" stopColor="#F2456B" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={80} cy={80} r={80} fill={`url(#bang${i})`} />
        </Svg>
      </Animated.View>
    </>
  );
}

function Dust({ i, w, h, dist, speed }: { i: number; w: number; h: number; dist: SharedValue<number>; speed: number }) {
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: w - fract(hash(i) + dist.value * speed) * (w + 40) }, { translateY: hash(i + 50) * h }] }));
  return <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: speed > 1 ? 30 : 14, height: 3, borderRadius: 2, backgroundColor: '#FFFFFF', opacity: speed > 1 ? 0.6 : 0.35 }, st]} />;
}

export default function StarBlaster({ level, w, h, live }: SceneProps) {
  const sx = w * 0.14;
  const dist = useSharedValue(0.25);
  const t = useSharedValue(0);
  const sy = useSharedValue(h * 0.5);
  const hp = useSharedValue<number[]>(new Array(N).fill(1));
  const boom = useSharedValue<number[]>(new Array(N).fill(0));
  const beam = useSharedValue({ on: 0, len: 0, ang: 0 });
  const hit = useSharedValue(0);
  const [hits, setHits] = useState(0);
  const add = () => setHits((x) => x + 1);

  const clock = useFrameCallback((f) => {
    const dt = frameDt(f.timeSincePreviousFrame);
    const lv = level.value;
    const on = lv > ON;
    t.value += dt;
    const prev = dist.value;
    const next = prev + dt * (0.05 + lv * 0.05);
    dist.value = next;
    const life = hp.value.slice();
    const bm = boom.value.slice();
    let target = -1;
    let bestX = 1e9;
    for (let i = 0; i < N; i++) {
      const a = rock(i, prev, w, h);
      const r = rock(i, next, w, h);
      if (r.p < a.p) {
        life[i] = 1;
        bm[i] = 0;
      } else if (life[i] > 0 && a.x > sx && r.x <= sx) hit.value = 1; // missed rock hits the shield
      if (bm[i] > 0) bm[i] += dt;
      if (life[i] > 0 && r.x > sx + 90 && r.x < w * 0.92 && r.x < bestX) {
        bestX = r.x;
        target = i;
      }
    }
    let aimY = h * 0.5 + Math.sin(t.value * 0.8) * h * 0.08;
    if (target >= 0) {
      const r = rock(target, next, w, h);
      aimY = r.y;
      const close = Math.abs(sy.value - r.y) < 40;
      if (on && close) {
        life[target] -= dt * (0.7 + lv);
        if (life[target] <= 0) {
          bm[target] = 0.001;
          runOnJS(add)();
        }
        const dx = r.x - (sx + 70);
        const dy = r.y - sy.value;
        beam.value = { on: 1, len: Math.sqrt(dx * dx + dy * dy), ang: (Math.atan2(dy, dx) * 180) / Math.PI };
      } else beam.value = { on: 0, len: 0, ang: 0 };
    } else beam.value = { on: 0, len: 0, ang: 0 };
    hp.value = life;
    boom.value = bm;
    hit.value = Math.max(0, hit.value - dt * 1.5);
    sy.value += (aimY - sy.value) * Math.min(1, dt * (on ? 3 : 1.2));
  }, live);
  useEffect(() => clock.setActive(live), [clock, live]);

  const ship = useAnimatedStyle(() => ({ transform: [{ translateX: sx - 70 + Math.sin(t.value * 70) * 8 * hit.value }, { translateY: sy.value - 45 + Math.sin(t.value * 3) * 3 }] }));
  const shield = useAnimatedStyle(() => ({ opacity: hit.value * 0.35 }));
  const flame = useAnimatedStyle(() => ({ transform: [{ scaleX: 0.5 + level.value * 1.2 + Math.sin(t.value * 40) * 0.1 }] }));
  const laser = useAnimatedStyle(() => ({
    opacity: beam.value.on * (0.75 + Math.sin(t.value * 50) * 0.25),
    width: beam.value.len,
    transform: [{ translateX: sx + 70 }, { translateY: sy.value + Math.sin(t.value * 3) * 3 - 5 }, { rotate: `${beam.value.ang}deg` }],
  }));

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={['#0A0A26', '#1B1250', '#3A1E6B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <StarField w={w} h={h} count={90} maxY={1} seed={31} />
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Circle cx={w * 0.82} cy={h * 0.8} r={h * 0.22} fill="#4F3FB0" opacity={0.55} />
        <Circle cx={w * 0.78} cy={h * 0.76} r={h * 0.18} fill="#6D5CD6" opacity={0.5} />
      </Svg>
      {Array.from({ length: 16 }, (_, i) => (
        <Dust key={'d' + i} i={i} w={w} h={h} dist={dist} speed={i % 3 === 0 ? 2.4 : 0.8} />
      ))}
      {Array.from({ length: N }, (_, i) => (
        <Rock key={i} i={i} w={w} h={h} dist={dist} hp={hp} boom={boom} t={t} />
      ))}
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, height: 10, borderRadius: 5, backgroundColor: '#5CF2E0', transformOrigin: 'left' as any }, laser]}>
        <View style={{ position: 'absolute', left: 0, right: 0, top: 3, height: 4, borderRadius: 2, backgroundColor: '#FFFFFF' }} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 150, height: 90 }, ship]}>
        <Animated.View style={[{ position: 'absolute', left: -30, top: 33, width: 50, height: 24, transformOrigin: 'right' as any }, flame]}>
          <Svg width={50} height={24}>
            <Path d="M50 2 L0 12 L50 22 Z" fill="#FF7A3D" />
            <Path d="M50 7 L18 12 L50 17 Z" fill="#FFE38A" />
          </Svg>
        </Animated.View>
        <Svg width={150} height={90} viewBox="0 0 150 90">
          <Path d="M30 20 L70 30 L60 45 Z" fill="#F2456B" />
          <Path d="M30 70 L70 60 L60 45 Z" fill="#F2456B" />
          <Path d="M14 32 L110 32 Q146 45 110 58 L14 58 Z" fill="#E9E6FF" />
          <Path d="M14 52 L120 52 Q132 48 136 45 L140 45 Q130 58 110 58 L14 58 Z" fill="#B9B2E6" />
          <Path d="M70 34 Q96 34 104 45 L70 45 Z" fill="#5CC8FF" />
          <Path d="M14 32 L24 45 L14 58 Z" fill="#6C47FF" />
        </Svg>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#F2456B' }, shield]} />
      {live && (
        <Counter
          value={hits}
          icon={
            <Svg width={30} height={30} viewBox="0 0 110 110">
              <Path d="M20 40 L42 14 L74 18 L96 44 L90 78 L60 98 L26 86 L10 62 Z" fill="#8C7B6B" />
            </Svg>
          }
        />
      )}
    </View>
  );
}
