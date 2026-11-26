import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { runOnJS, SharedValue, useAnimatedStyle, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path, Polygon } from 'react-native-svg';

import { clamp, Counter, drive, fract, frameDt, hash, ON, SceneProps } from './common';

/* Underwater swim controlled by attention: the fish rises with attention and swims forward only
 * while attention is on target. Bubbles float high, so it takes attention to reach and eat them;
 * each one brings a new friend to the school. */

const FOOD = 5;
const MAX_FRIENDS = 8;
const food = (i: number, dist: number, w: number, h: number) => {
  'worklet';
  const t = i / FOOD + dist;
  const p = fract(t);
  const seed = i + FOOD * Math.floor(t);
  return { p, x: w * 1.1 - p * w * 1.3, y: h * (0.26 + hash(seed) * 0.24) };
};

function Fish({ color, fin, size = 1, tail }: { color: string; fin: string; size?: number; tail: SharedValue<number> }) {
  const wag = useAnimatedStyle(() => ({ transform: [{ rotate: `${Math.sin(tail.value) * 22}deg` }] }));
  return (
    <View style={{ width: 120 * size, height: 80 * size }}>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 18 * size, width: 40 * size, height: 44 * size, transformOrigin: 'right' as any }, wag]}>
        <Svg width={40 * size} height={44 * size} viewBox="0 0 40 44">
          <Polygon points="40,22 2,2 10,22 2,42" fill={fin} />
        </Svg>
      </Animated.View>
      <Svg width={120 * size} height={80 * size} viewBox="0 0 120 80" style={StyleSheet.absoluteFill}>
        <Ellipse cx={72} cy={40} rx={44} ry={30} fill={color} />
        <Path d="M56 12 Q70 0 86 12" fill={fin} />
        <Path d="M60 28 L60 52 M74 24 L74 56" stroke="#FFFFFF" strokeWidth={6} opacity={0.75} />
        <Circle cx={98} cy={34} r={8} fill="#FFFFFF" />
        <Circle cx={100} cy={34} r={4.5} fill="#1D1838" />
        <Path d="M108 48 Q112 50 108 52" stroke="#1D1838" strokeWidth={2} fill="none" />
      </Svg>
    </View>
  );
}

function Food({ i, w, h, dist, eaten, t }: { i: number; w: number; h: number; dist: SharedValue<number>; eaten: SharedValue<number[]>; t: SharedValue<number> }) {
  const st = useAnimatedStyle(() => {
    const f = food(i, dist.value, w, h);
    const e = eaten.value[i];
    return {
      opacity: e === 1 ? 0 : e === -1 ? 0.35 : 0.95,
      transform: [{ translateX: f.x - 22 }, { translateY: f.y - 22 + Math.sin(t.value * 2 + i) * 8 }, { scale: 0.9 + Math.sin(t.value * 4 + i) * 0.1 }],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 44, height: 44 }, st]}>
      <Svg width={44} height={44}>
        <Circle cx={22} cy={22} r={19} fill="#B8FFF2" opacity={0.45} />
        <Circle cx={22} cy={22} r={12} fill="#FFE38A" />
        <Circle cx={18} cy={18} r={4} fill="#FFFFFF" />
      </Svg>
    </Animated.View>
  );
}

function Friend({ j, fx, fy, friends, t, tail }: { j: number; fx: number; fy: SharedValue<number>; friends: SharedValue<number>; t: SharedValue<number>; tail: SharedValue<number> }) {
  const colors = ['#FF6FA8', '#6C9BFF', '#FFC531', '#36D0B5', '#B48BFF', '#FF8A5B', '#5ED16A', '#FF5C7A'];
  const row = j % 2 === 0 ? -1 : 1;
  const st = useAnimatedStyle(() => ({
    opacity: withinFriends(j, friends.value),
    transform: [
      { translateX: fx - 120 - Math.floor(j / 2) * 70 - (j % 2) * 30 },
      { translateY: fy.value - 20 + row * (36 + Math.floor(j / 2) * 6) + Math.sin(t.value * 3 + j) * 10 },
    ],
  }));
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, st]}>
      <Fish color={colors[j]} fin="#FFFFFF" size={0.45} tail={tail} />
    </Animated.View>
  );
}
const withinFriends = (j: number, n: number) => {
  'worklet';
  return clamp(n - j);
};

function Weed({ x, h, t, k }: { x: number; h: number; t: SharedValue<number>; k: number }) {
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${Math.sin(t.value * 1.2 + k) * 8}deg` }] }));
  const H = 120 + (k % 3) * 50;
  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: h - H - 10, width: 40, height: H, transformOrigin: 'bottom' as any }, st]}>
      <Svg width={40} height={H}>
        <Path d={`M20 ${H} Q4 ${H * 0.66} 20 ${H * 0.4} T20 0`} stroke={k % 2 ? '#2FAF6B' : '#4CC27A'} strokeWidth={10} fill="none" strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

function Rise({ i, w, h, t }: { i: number; w: number; h: number; t: SharedValue<number> }) {
  const st = useAnimatedStyle(() => {
    const p = fract(t.value * 0.12 + hash(i));
    return { opacity: 0.5 * (1 - p), transform: [{ translateX: hash(i + 7) * w + Math.sin(t.value * 2 + i) * 8 }, { translateY: h - p * h }] };
  });
  return <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#FFFFFF' }, st]} />;
}

export default function ReefFriends({ level, w, h, live }: SceneProps) {
  const fx = w * 0.42;
  const dist = useSharedValue(0.3);
  const t = useSharedValue(0);
  const tail = useSharedValue(0);
  const fy = useSharedValue(h * 0.5);
  const eaten = useSharedValue<number[]>(new Array(FOOD).fill(0));
  const friends = useSharedValue(live ? 0 : 4);
  const [count, setCount] = useState(0);
  const add = () => setCount((c) => c + 1);

  const clock = useFrameCallback((f) => {
    const dt = frameDt(f.timeSincePreviousFrame);
    const lv = level.value;
    const on = lv > ON;
    t.value += dt;
    tail.value += dt * (2 + drive(lv) * 15);
    const prev = dist.value;
    const next = prev + dt * (0.012 + drive(lv) * 0.11);
    dist.value = next;
    const arr = eaten.value.slice();
    // Height follows attention directly.
    const aim = h * (0.8 - clamp(lv) * 0.6) + Math.sin(t.value * 1.3) * 6;
    for (let i = 0; i < FOOD; i++) {
      const a = food(i, prev, w, h);
      const b = food(i, next, w, h);
      if (b.p < a.p) arr[i] = 0;
      else if (a.x > fx + 50 && b.x <= fx + 50 && arr[i] === 0) {
        const hit = on && Math.abs(fy.value - b.y) < 60;
        arr[i] = hit ? 1 : -1;
        if (hit) {
          friends.value = Math.min(MAX_FRIENDS, friends.value + 1);
          runOnJS(add)();
        }
      }
    }
    eaten.value = arr;
    fy.value += (aim - fy.value) * Math.min(1, dt * 1.8);
  }, live);
  useEffect(() => clock.setActive(live), [clock, live]);

  const me = useAnimatedStyle(() => ({ transform: [{ translateX: fx - 60 }, { translateY: fy.value - 40 }, { rotate: `${Math.sin(t.value * 2) * 4}deg` }] }));
  const rays = useAnimatedStyle(() => ({ opacity: 0.15 + level.value * 0.45 }));
  const dark = useAnimatedStyle(() => ({ opacity: 0.45 * (1 - clamp(level.value * 1.6)) }));
  const sand = useAnimatedStyle(() => ({ transform: [{ translateX: -fract(dist.value * 0.5) * w }] }));

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={['#3ED0E6', '#1A8FC4', '#0D4F8C']} style={StyleSheet.absoluteFill} />
      <Animated.View style={[StyleSheet.absoluteFill, rays]} pointerEvents="none">
        <Svg width={w} height={h}>
          {[0.1, 0.3, 0.55, 0.78].map((x, i) => (
            <Polygon key={i} points={`${w * x},0 ${w * (x + 0.08)},0 ${w * (x + 0.2)},${h} ${w * (x + 0.06)},${h}`} fill="#FFFFFF" opacity={0.18} />
          ))}
        </Svg>
      </Animated.View>
      {Array.from({ length: 12 }, (_, i) => (
        <Rise key={'r' + i} i={i} w={w} h={h} t={t} />
      ))}
      <Animated.View style={[{ position: 'absolute', left: 0, top: h * 0.82, width: w * 2, height: h * 0.18, flexDirection: 'row' }, sand]}>
        {[0, 1].map((k) => (
          <Svg key={k} width={w} height={h * 0.18}>
            <Path d={`M0 ${h * 0.05} Q${w * 0.25} 0 ${w * 0.5} ${h * 0.05} T${w} ${h * 0.05} L${w} ${h} L0 ${h} Z`} fill="#F2D59B" />
            {Array.from({ length: 6 }, (_, i) => (
              <Circle key={i} cx={(i / 6) * w + 60} cy={h * 0.06} r={18 + (i % 3) * 8} fill={['#FF7A8A', '#FF9F6B', '#B48BFF'][i % 3]} />
            ))}
          </Svg>
        ))}
      </Animated.View>
      {Array.from({ length: 9 }, (_, k) => (
        <Weed key={'w' + k} k={k} x={(k / 9) * w + 20} h={h} t={t} />
      ))}
      {Array.from({ length: FOOD }, (_, i) => (
        <Food key={'f' + i} i={i} w={w} h={h} dist={dist} eaten={eaten} t={t} />
      ))}
      {Array.from({ length: MAX_FRIENDS }, (_, j) => (
        <Friend key={'fr' + j} j={j} fx={fx} fy={fy} friends={friends} t={t} tail={tail} />
      ))}
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, me]}>
        <Fish color="#FF8A2B" fin="#FFD08A" tail={tail} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#06264D' }, dark]} pointerEvents="none" />
      {live && (
        <Counter
          value={count}
          icon={
            <Svg width={30} height={30}>
              <Circle cx={15} cy={15} r={11} fill="#FFE38A" />
              <Circle cx={12} cy={12} r={3} fill="#FFFFFF" />
            </Svg>
          }
        />
      )}
    </View>
  );
}
