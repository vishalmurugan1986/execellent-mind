import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { runOnJS, SharedValue, useAnimatedStyle, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import { clamp, Counter, fract, frameDt, hash, ON, SceneProps } from './common';

/* Garden controlled by attention: attention on target grows the garden (stems rise, flowers open,
 * the sun climbs, butterflies visit); when attention drops the flowers start to wilt back. */

const FLOWERS = 8;
const PETALS = ['#FF6FA8', '#FFC531', '#B48BFF', '#FF7A5A', '#6C9BFF', '#FF5C7A', '#F79AD3', '#FFD36B'];

function Flower({ i, x, groundY, grow, t }: { i: number; x: number; groundY: number; grow: SharedValue<number>; t: SharedValue<number> }) {
  const stemH = 150 + hash(i + 3) * 120;
  const stem = useAnimatedStyle(() => {
    const s = clamp(grow.value - i);
    return { transform: [{ scaleY: clamp(s / 0.5) }, { rotate: `${Math.sin(t.value * 1.1 + i) * 3}deg` }] };
  });
  const head = useAnimatedStyle(() => {
    const s = clamp(grow.value - i);
    const b = clamp((s - 0.5) / 0.5);
    const lean = Math.sin(t.value * 1.1 + i) * 3;
    return {
      opacity: s > 0.45 ? 1 : 0,
      transform: [
        { translateX: Math.sin((lean * Math.PI) / 180) * stemH },
        { translateY: -clamp(s / 0.5) * stemH },
        { scale: 0.25 + b * 0.75 },
        { rotate: `${b * 30 + Math.sin(t.value * 0.8 + i) * 6}deg` },
      ],
    };
  });
  const color = PETALS[i % PETALS.length];
  return (
    <>
      <Animated.View style={[{ position: 'absolute', left: x - 5, top: groundY - stemH, width: 10, height: stemH, borderRadius: 5, backgroundColor: '#3FA65A', transformOrigin: 'bottom' as any }, stem]}>
        <View style={{ position: 'absolute', left: 6, top: stemH * 0.45, width: 36, height: 18, borderRadius: 18, backgroundColor: '#5CC46F', transform: [{ rotate: '-25deg' }] }} />
        <View style={{ position: 'absolute', left: -32, top: stemH * 0.62, width: 36, height: 18, borderRadius: 18, backgroundColor: '#5CC46F', transform: [{ rotate: '25deg' }] }} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: x - 60, top: groundY - 60, width: 120, height: 120 }, head]}>
        <Svg width={120} height={120} viewBox="0 0 120 120">
          <G>
            {Array.from({ length: 7 }, (_, k) => {
              const a = (k / 7) * Math.PI * 2;
              return <Ellipse key={k} cx={60 + Math.cos(a) * 30} cy={60 + Math.sin(a) * 30} rx={24} ry={16} fill={color} transform={`rotate(${(a * 180) / Math.PI} ${60 + Math.cos(a) * 30} ${60 + Math.sin(a) * 30})`} />;
            })}
          </G>
          <Circle cx={60} cy={60} r={20} fill="#FFE38A" />
          <Circle cx={54} cy={56} r={4} fill="#E5A400" />
          <Circle cx={66} cy={64} r={3} fill="#E5A400" />
        </Svg>
      </Animated.View>
    </>
  );
}

function Butterfly({ j, w, h, t, level }: { j: number; w: number; h: number; t: SharedValue<number>; level: SharedValue<number> }) {
  const colors = ['#FF7A5A', '#6C9BFF', '#B48BFF'];
  const body = useAnimatedStyle(() => ({
    opacity: clamp((level.value - ON) * 4),
    transform: [{ translateX: w * (0.22 + j * 0.28) + Math.sin(t.value * 0.6 + j) * w * 0.1 }, { translateY: h * 0.36 + Math.sin(t.value * 1.3 + j * 2) * h * 0.1 }],
  }));
  const wing = useAnimatedStyle(() => ({ transform: [{ scaleX: 0.2 + Math.abs(Math.sin(t.value * 12 + j)) * 0.8 }] }));
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 60, height: 50 }, body]}>
      <Animated.View style={[StyleSheet.absoluteFill, wing]}>
        <Svg width={60} height={50}>
          <Ellipse cx={17} cy={18} rx={15} ry={13} fill={colors[j]} />
          <Ellipse cx={43} cy={18} rx={15} ry={13} fill={colors[j]} />
          <Ellipse cx={20} cy={36} rx={10} ry={9} fill={colors[j]} opacity={0.8} />
          <Ellipse cx={40} cy={36} rx={10} ry={9} fill={colors[j]} opacity={0.8} />
        </Svg>
      </Animated.View>
      <View style={{ position: 'absolute', left: 27, top: 10, width: 6, height: 32, borderRadius: 3, backgroundColor: '#1D1838' }} />
    </Animated.View>
  );
}

function Sparkle({ i, xs, groundY, grow, t, level }: { i: number; xs: number[]; groundY: number; grow: SharedValue<number>; t: SharedValue<number>; level: SharedValue<number> }) {
  const st = useAnimatedStyle(() => {
    const k = Math.min(FLOWERS - 1, Math.floor(grow.value));
    const p = fract(t.value * 0.7 + i / 8);
    return {
      opacity: clamp((level.value - ON) * 4) * (1 - p),
      transform: [{ translateX: xs[k] + (hash(i) - 0.5) * 90 }, { translateY: groundY - 260 + p * 220 }, { rotate: `${p * 180}deg` }],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 16, height: 16 }, st]}>
      <Svg width={16} height={16} viewBox="0 0 16 16">
        <Path d="M8 0 L10 6 L16 8 L10 10 L8 16 L6 10 L0 8 L6 6 Z" fill="#FFFFFF" />
      </Svg>
    </Animated.View>
  );
}

export default function MagicGarden({ level, w, h, live }: SceneProps) {
  const groundY = h * 0.84;
  const xs = Array.from({ length: FLOWERS }, (_, i) => w * (0.08 + (i / (FLOWERS - 1)) * 0.84));
  const grow = useSharedValue(live ? 0.2 : 5.4);
  const t = useSharedValue(0);
  const shown = useSharedValue(0);
  const [blooms, setBlooms] = useState(0);

  const clock = useFrameCallback((f) => {
    const dt = frameDt(f.timeSincePreviousFrame);
    const lv = level.value;
    t.value += dt;
    grow.value = clamp(grow.value + (lv > ON ? dt * (0.06 + lv * 0.05) : -dt * 0.03), 0, FLOWERS);
    const b = Math.floor(grow.value);
    if (b !== shown.value) {
      shown.value = b;
      runOnJS(setBlooms)(b);
    }
  }, live);
  useEffect(() => clock.setActive(live), [clock, live]);

  const day = useAnimatedStyle(() => ({ opacity: clamp(grow.value / 5 + level.value * 0.2) }));
  const sun = useAnimatedStyle(() => ({ transform: [{ translateX: w * 0.82 - 70 }, { translateY: h * (0.5 - clamp(grow.value / FLOWERS + level.value * 0.15) * 0.4) - 70 }] }));
  const clouds = useAnimatedStyle(() => ({ transform: [{ translateX: fract(t.value * 0.01) * w * 1.4 - w * 0.4 }] }));

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={['#5E5BB8', '#C98BC4', '#FFD0A8']} style={StyleSheet.absoluteFill} />
      <Animated.View style={[StyleSheet.absoluteFill, day]}>
        <LinearGradient colors={['#69C3FF', '#B6E3FF', '#FFF3D6']} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 140, height: 140 }, sun]}>
        <Svg width={140} height={140}>
          <Circle cx={70} cy={70} r={68} fill="#FFE38A" opacity={0.35} />
          <Circle cx={70} cy={70} r={46} fill="#FFC531" />
        </Svg>
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: 0, top: h * 0.1, width: w * 0.5, height: 120 }, clouds]}>
        <Svg width={w * 0.5} height={120}>
          <Ellipse cx={90} cy={60} rx={70} ry={26} fill="#FFFFFF" opacity={0.85} />
          <Ellipse cx={140} cy={46} rx={50} ry={30} fill="#FFFFFF" opacity={0.85} />
          <Ellipse cx={w * 0.36} cy={80} rx={60} ry={20} fill="#FFFFFF" opacity={0.7} />
        </Svg>
      </Animated.View>
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Path d={`M0 ${h * 0.7} Q${w * 0.3} ${h * 0.58} ${w * 0.6} ${h * 0.7} T${w} ${h * 0.66} L${w} ${h} L0 ${h} Z`} fill="#8FD486" />
        <Path d={`M0 ${groundY - 10} Q${w * 0.5} ${groundY - 40} ${w} ${groundY - 10} L${w} ${h} L0 ${h} Z`} fill="#62B85A" />
        <Path d={`M0 ${groundY + 20} L${w} ${groundY + 20} L${w} ${h} L0 ${h} Z`} fill="#8A5A3C" />
        {xs.map((x, i) => (
          <Ellipse key={i} cx={x} cy={groundY + 4} rx={34} ry={10} fill="#6B4430" />
        ))}
      </Svg>
      {xs.map((x, i) => (
        <Flower key={i} i={i} x={x} groundY={groundY} grow={grow} t={t} />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <Sparkle key={'s' + i} i={i} xs={xs} groundY={groundY} grow={grow} t={t} level={level} />
      ))}
      {[0, 1, 2].map((j) => (
        <Butterfly key={j} j={j} w={w} h={h} t={t} level={level} />
      ))}
      {live && (
        <Counter
          value={blooms}
          total={FLOWERS}
          icon={
            <Svg width={30} height={30} viewBox="0 0 120 120">
              {Array.from({ length: 6 }, (_, k) => {
                const a = (k / 6) * Math.PI * 2;
                return <Circle key={k} cx={60 + Math.cos(a) * 32} cy={60 + Math.sin(a) * 32} r={24} fill="#FF6FA8" />;
              })}
              <Circle cx={60} cy={60} r={22} fill="#FFC531" />
            </Svg>
          }
        />
      )}
    </View>
  );
}
