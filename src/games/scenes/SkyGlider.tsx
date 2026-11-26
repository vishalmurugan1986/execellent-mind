import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { runOnJS, SharedValue, useAnimatedStyle, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

import { clamp, Counter, drive, fract, frameDt, hash, ON, SceneProps } from './common';

/*
 * Glider controlled by attention: its height follows attention directly (more attention = higher),
 * and it only flies forward while attention is on target. Rings sit high, so only strong
 * attention threads them; when attention drops the glider sinks toward the hills.
 */

const RINGS = 3;
const ringInfo = (i: number, dist: number, w: number, h: number) => {
  'worklet';
  const t = i / RINGS + dist;
  const p = fract(t);
  const seed = i + RINGS * Math.floor(t);
  return { p, seed, x: w * 1.15 - p * w * 1.45, y: h * (0.3 + hash(seed) * 0.2) };
};

function Cloud({ i, w, h, dist, layer }: { i: number; w: number; h: number; dist: SharedValue<number>; layer: number }) {
  const s = layer === 0 ? 0.6 : 1.1;
  const st = useAnimatedStyle(() => {
    const p = fract(i / 4 + dist.value * (layer === 0 ? 0.35 : 0.8) + hash(i + layer * 7) * 0.2);
    return { transform: [{ translateX: w * 1.1 - p * w * 1.5 }, { translateY: h * (0.08 + hash(i * 3 + layer) * 0.35) }, { scale: s }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 220, height: 90, opacity: layer === 0 ? 0.7 : 0.95 }, st]}>
      <Svg width={220} height={90}>
        <Ellipse cx={70} cy={58} rx={60} ry={28} fill="#FFFFFF" />
        <Ellipse cx={120} cy={42} rx={56} ry={36} fill="#FFFFFF" />
        <Ellipse cx={165} cy={60} rx={48} ry={24} fill="#FFFFFF" />
      </Svg>
    </Animated.View>
  );
}

function Ring({ i, w, h, dist, state }: { i: number; w: number; h: number; dist: SharedValue<number>; state: SharedValue<number[]> }) {
  const st = useAnimatedStyle(() => {
    const r = ringInfo(i, dist.value, w, h);
    const flag = state.value[i];
    return {
      opacity: flag === -1 ? 0.45 : 1,
      transform: [{ translateX: r.x - 45 }, { translateY: r.y - 90 }, { scale: flag === 1 ? 1.12 : 1 }],
    };
  });
  const glow = useAnimatedStyle(() => ({ opacity: state.value[i] === 1 ? 1 : 0 }));
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 90, height: 180 }, st]}>
      <Svg width={90} height={180} style={StyleSheet.absoluteFill}>
        <Ellipse cx={45} cy={90} rx={30} ry={78} stroke="#FFB020" strokeWidth={14} fill="none" />
        <Ellipse cx={45} cy={90} rx={30} ry={78} stroke="#FFE38A" strokeWidth={4} fill="none" />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, glow]}>
        <Svg width={90} height={180}>
          <Ellipse cx={45} cy={90} rx={30} ry={78} stroke="#3EE08F" strokeWidth={14} fill="none" />
          <Circle cx={45} cy={10} r={6} fill="#FFFFFF" />
          <Circle cx={80} cy={70} r={4} fill="#FFFFFF" />
          <Circle cx={10} cy={120} r={5} fill="#FFFFFF" />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

export default function SkyGlider({ level, w, h, live }: SceneProps) {
  const px = w * 0.28;
  const dist = useSharedValue(0.18);
  const y = useSharedValue(h * 0.45);
  const vy = useSharedValue(0);
  const t = useSharedValue(0);
  const state = useSharedValue<number[]>(new Array(RINGS).fill(0));
  const [rings, setRings] = useState(0);
  const add = () => setRings((r) => r + 1);

  const clock = useFrameCallback((f) => {
    const dt = frameDt(f.timeSincePreviousFrame);
    const lv = level.value;
    t.value += dt;
    const prev = dist.value;
    const next = prev + dt * (0.015 + drive(lv) * 0.11);
    dist.value = next;
    // Height follows attention directly.
    const aim = h * (0.86 - clamp(lv) * 0.62);
    const arr = state.value.slice();
    {
      for (let i = 0; i < RINGS; i++) {
        const a = ringInfo(i, prev, w, h);
        const b = ringInfo(i, next, w, h);
        if (b.p < a.p) arr[i] = 0;
        else if (a.x > px && b.x <= px) {
          const hit = Math.abs(y.value - b.y) < h * 0.09;
          arr[i] = hit ? 1 : -1;
          if (hit) runOnJS(add)();
        }
      }
      state.value = arr;
    }
    const ny = y.value + (aim - y.value) * Math.min(1, dt * 1.8);
    vy.value = (ny - y.value) / Math.max(dt, 0.001);
    y.value = ny;
  }, live);
  useEffect(() => clock.setActive(live), [clock, live]);

  const plane = useAnimatedStyle(() => ({
    transform: [{ translateX: px - 80 }, { translateY: y.value - 40 + Math.sin(t.value * 2.4) * 6 }, { rotate: `${clamp(vy.value / 14, -22, 22)}deg` }],
  }));
  const trail = useAnimatedStyle(() => ({ opacity: clamp((level.value - ON) * 3) }));
  const hillsFar = useAnimatedStyle(() => ({ transform: [{ translateX: -fract(dist.value * 0.25) * w }] }));
  const hillsNear = useAnimatedStyle(() => ({ transform: [{ translateX: -fract(dist.value * 0.7) * w }] }));

  const hills = (base: number, amp: number, color: string, seed: number) => {
    let d = `M0 ${h} L0 ${base}`;
    for (let i = 0; i < 8; i++) d += ` Q${(w * (i + 0.5)) / 8} ${base - amp * (0.4 + hash(i * seed) * 0.8)} ${(w * (i + 1)) / 8} ${base}`;
    return <Path d={`${d} L${w} ${h} Z`} fill={color} />;
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={['#5EC2FF', '#BDE9FF', '#FFF1D6']} style={StyleSheet.absoluteFill} />
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Circle cx={w * 0.86} cy={h * 0.16} r={h * 0.07} fill="#FFE38A" />
      </Svg>
      {[0, 1, 2, 3].map((i) => (
        <Cloud key={'f' + i} i={i} w={w} h={h} dist={dist} layer={0} />
      ))}
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: w * 2, height: h, flexDirection: 'row' }, hillsFar]}>
        {[0, 1].map((k) => (
          <Svg key={k} width={w} height={h}>
            {hills(h * 0.8, h * 0.18, '#9ED9A0', 3)}
          </Svg>
        ))}
      </Animated.View>
      {Array.from({ length: RINGS }, (_, i) => (
        <Ring key={i} i={i} w={w} h={h} dist={dist} state={state} />
      ))}
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 160, height: 80 }, plane]}>
        <Animated.View style={[{ position: 'absolute', left: -70, top: 36, width: 90, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' }, trail]} />
        <Svg width={160} height={80} viewBox="0 0 160 80">
          <Path d="M10 44 L150 30 L40 18 Z" fill="#FFFFFF" />
          <Path d="M10 44 L150 30 L58 60 Z" fill="#E4E9FF" />
          <Path d="M40 18 L58 60 L66 36 Z" fill="#C3CCF5" />
          <Path d="M10 44 L150 30" stroke="#6C47FF" strokeWidth={3} />
          <Circle cx={118} cy={33} r={6} fill="#FF7A3D" />
        </Svg>
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: w * 2, height: h, flexDirection: 'row' }, hillsNear]} pointerEvents="none">
        {[0, 1].map((k) => (
          <Svg key={k} width={w} height={h}>
            {hills(h * 0.92, h * 0.12, '#5DBB63', 5)}
          </Svg>
        ))}
      </Animated.View>
      {[0, 1, 2].map((i) => (
        <Cloud key={'n' + i} i={i} w={w} h={h} dist={dist} layer={1} />
      ))}
      {live && (
        <Counter
          value={rings}
          icon={
            <Svg width={30} height={30}>
              <Ellipse cx={15} cy={15} rx={8} ry={13} stroke="#FFB020" strokeWidth={4} fill="none" />
            </Svg>
          }
        />
      )}
    </View>
  );
}
