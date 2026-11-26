import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { runOnJS, SharedValue, useAnimatedStyle, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { clamp, Counter, frameDt, hash, ON, SceneProps } from './common';

/* Basketball controlled by attention: attention on target charges the power meter (it drains when
 * attention drops); a full meter shoots the ball into the hoop. */

const FLIGHT = 1.1; // seconds in the air

function Ball({ size = 72 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 72 72">
      <Circle cx={36} cy={36} r={33} fill="#FF8A2B" stroke="#C4570F" strokeWidth={3} />
      <Path d="M3 36 H69 M36 3 V69" stroke="#8A3A08" strokeWidth={3} />
      <Path d="M14 12 Q30 36 14 60 M58 12 Q42 36 58 60" stroke="#8A3A08" strokeWidth={3} fill="none" />
    </Svg>
  );
}

function Confetti({ i, rx, ry, shot }: { i: number; rx: number; ry: number; shot: SharedValue<number> }) {
  const colors = ['#FFC531', '#6C47FF', '#0BA59A', '#F2456B', '#FF7A3D'];
  const a = (i / 12) * Math.PI * 2;
  const st = useAnimatedStyle(() => {
    const p = clamp((shot.value - FLIGHT) / 0.7);
    const on = shot.value >= FLIGHT && p < 1;
    return {
      opacity: on ? 1 - p : 0,
      transform: [{ translateX: rx + Math.cos(a) * p * 150 }, { translateY: ry + Math.sin(a) * p * 110 + p * p * 80 }, { rotate: `${p * 400 + i * 30}deg` }],
    };
  });
  return <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 12, height: 18, borderRadius: 3, backgroundColor: colors[i % colors.length] }, st]} />;
}

export default function HoopShot({ level, w, h, live }: SceneProps) {
  const bx = w * 0.24;
  const by = h * 0.68;
  const rimX = w * 0.74;
  const rimY = h * 0.36;
  const charge = useSharedValue(live ? 0 : 0.7);
  const shot = useSharedValue(-1); // -1 idle; 0..FLIGHT flying; FLIGHT.. scoring
  const t = useSharedValue(0);
  const [baskets, setBaskets] = useState(0);
  const score = () => setBaskets((b) => b + 1);

  const clock = useFrameCallback((f) => {
    const dt = frameDt(f.timeSincePreviousFrame);
    const on = level.value > ON;
    t.value += dt;
    if (shot.value < 0) {
      charge.value = clamp(charge.value + (on ? dt * (0.28 + level.value * 0.2) : -dt * 0.25));
      if (charge.value >= 1) {
        shot.value = 0;
        charge.value = 0;
      }
    } else {
      const before = shot.value;
      shot.value += dt;
      if (before < FLIGHT && shot.value >= FLIGHT) runOnJS(score)();
      if (shot.value > FLIGHT + 1.0) shot.value = -1;
    }
  }, live);
  useEffect(() => clock.setActive(live), [clock, live]);

  const ball = useAnimatedStyle(() => {
    const s = shot.value;
    let x = bx;
    let y = by + Math.sin(t.value * 3) * 3 * (1 - charge.value);
    let o = 1;
    if (s >= 0 && s < FLIGHT) {
      const p = s / FLIGHT;
      const mx = (bx + rimX) / 2;
      const my = h * 0.02;
      x = (1 - p) * (1 - p) * bx + 2 * (1 - p) * p * mx + p * p * rimX;
      y = (1 - p) * (1 - p) * by + 2 * (1 - p) * p * my + p * p * (rimY - 20);
    } else if (s >= FLIGHT) {
      const p = clamp((s - FLIGHT) / 0.5);
      x = rimX;
      y = rimY - 20 + p * 150;
      o = 1 - clamp((s - FLIGHT - 0.5) / 0.3);
    }
    return { opacity: o, transform: [{ translateX: x - 36 }, { translateY: y - 36 }, { rotate: `${s >= 0 ? s * 540 : 0}deg` }, { scale: s < 0 ? 1 + charge.value * 0.12 : 1 }] };
  });
  const glow = useAnimatedStyle(() => ({ opacity: shot.value < 0 ? charge.value * 0.9 : 0, transform: [{ translateX: bx - 70 }, { translateY: by - 70 }, { scale: 0.8 + charge.value * 0.5 }] }));
  const meter = useAnimatedStyle(() => ({ height: `${Math.round(charge.value * 100)}%` as any, backgroundColor: charge.value > 0.8 ? '#1FAE5B' : level.value > ON ? '#6C47FF' : '#B5A8F5' }));
  const net = useAnimatedStyle(() => {
    const p = shot.value >= FLIGHT ? clamp((shot.value - FLIGHT) / 0.35) : 0;
    return { transform: [{ scaleY: 1 + Math.sin(p * Math.PI) * 0.45 }] };
  });

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={['#2B2160', '#43348F', '#6A54C8']} style={StyleSheet.absoluteFill} />
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        {Array.from({ length: 70 }, (_, i) => (
          <Circle key={i} cx={hash(i) * w} cy={h * (0.08 + hash(i + 40) * 0.32)} r={5 + hash(i + 80) * 4} fill={['#FF9F6B', '#FFD36B', '#9C85FF', '#6BD6C8'][i % 4]} opacity={0.35} />
        ))}
        {[0.15, 0.4, 0.65, 0.9].map((x, i) => (
          <Circle key={'l' + i} cx={w * x} cy={h * 0.04} r={18} fill="#FFF7D6" opacity={0.8} />
        ))}
        <Rect x={0} y={h * 0.8} width={w} height={h * 0.2} fill="#D99A5B" />
        {Array.from({ length: 12 }, (_, i) => (
          <Rect key={'p' + i} x={(i / 12) * w} y={h * 0.8} width={3} height={h * 0.2} fill="#C4854A" />
        ))}
        <Path d={`M${w * 0.5} ${h * 0.8} A ${w * 0.22} ${h * 0.12} 0 0 1 ${w * 0.94} ${h * 0.8}`} stroke="#FFFFFF" strokeWidth={4} fill="none" opacity={0.7} />
        <Rect x={rimX + 70} y={rimY - 20} width={16} height={h * 0.8 - rimY + 20} fill="#8E8AA8" />
        <Rect x={rimX + 20} y={rimY - 120} width={24} height={150} rx={6} fill="#FFFFFF" stroke="#C9C6DD" strokeWidth={3} />
        <Rect x={rimX + 26} y={rimY - 70} width={12} height={50} fill="none" stroke="#F2456B" strokeWidth={3} />
      </Svg>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 140, height: 140, borderRadius: 70, backgroundColor: '#FFE38A' }, glow]} />
      <Animated.View style={[{ position: 'absolute', left: rimX - 48, top: rimY - 2, width: 96, height: 70, transformOrigin: 'top' as any }, net]}>
        <Svg width={96} height={70}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Path key={i} d={`M${6 + i * 17} 0 L${20 + i * 11} 66`} stroke="#FFFFFF" strokeWidth={2.5} />
          ))}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Path key={'x' + i} d={`M${90 - i * 17} 0 L${76 - i * 11} 66`} stroke="#FFFFFF" strokeWidth={2.5} />
          ))}
        </Svg>
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 72, height: 72 }, ball]}>
        <Ball />
      </Animated.View>
      <View style={{ position: 'absolute', left: rimX - 52, top: rimY - 8, width: 104, height: 12, borderRadius: 6, backgroundColor: '#F2456B' }} />
      {Array.from({ length: 12 }, (_, i) => (
        <Confetti key={i} i={i} rx={rimX} ry={rimY} shot={shot} />
      ))}
      <View style={{ position: 'absolute', left: bx - 150, top: by - 110, width: 30, height: 200, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 3, borderColor: '#FFFFFF', overflow: 'hidden', justifyContent: 'flex-end' }}>
        <Animated.View style={[{ width: '100%', borderRadius: 12 }, meter]} />
      </View>
      {live && <Counter value={baskets} icon={<Ball size={30} />} />}
    </View>
  );
}
