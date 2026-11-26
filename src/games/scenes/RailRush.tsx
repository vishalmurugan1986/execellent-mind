import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { runOnJS, SharedValue, useAnimatedStyle, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Polygon, Rect } from 'react-native-svg';

import { clamp, CoinIcon, Counter, drive, fract, frameDt, hash, ON, SceneProps } from './common';

/*
 * Endless runner controlled by attention.
 * Attention is the engine: below the target the runner slows to a stop.
 * Coins are only collected, and hurdles only jumped, while attention is on target —
 * lose attention as a hurdle arrives and the runner trips over it.
 */

const ROWS = 6;
const SLEEPERS = 12;
const Z_RUN = 0.8;
const D_RUN = Math.sqrt(Z_RUN);
const JUMP_SEC = 0.6;
const TRIP_SEC = 1.1;

type Geo = { hy: number; yb: number; cx: number; tt: number; tb: number };

const laneW = (g: Geo, z: number) => {
  'worklet';
  return (g.tt + (g.tb - g.tt) * z) / 3;
};
const depthY = (g: Geo, z: number) => {
  'worklet';
  return g.hy + (g.yb - g.hy) * z;
};
/** Each row has either a coin or a hurdle in the runner's lane, plus an occasional train on a side track. */
const rowInfo = (k: number, dist: number) => {
  'worklet';
  const t = (k + dist) / ROWS;
  const d = fract(t);
  const seed = k + ROWS * Math.floor(t);
  const hurdle = hash(seed * 3.1 + 5) < 0.3;
  const side = hash(seed * 1.7 + 3) < 0.45 ? (hash(seed * 2.3 + 1) > 0.5 ? 1 : -1) : 0;
  return { d, z: d * d, hurdle, side };
};

function Coin({ k, g, dist, phase, state }: { k: number; g: Geo; dist: SharedValue<number>; phase: SharedValue<number>; state: SharedValue<number[]> }) {
  const st = useAnimatedStyle(() => {
    const r = rowInfo(k, dist.value);
    const s = laneW(g, r.z) / laneW(g, Z_RUN);
    const y = depthY(g, r.z);
    const flag = state.value[k];
    const p = flag === 1 ? clamp((r.d - D_RUN) / 0.06) : 0;
    return {
      zIndex: Math.round(r.d * 1000) + 1,
      opacity: r.hurdle ? 0 : clamp(r.z * 14) * (flag === 1 ? 1 - p : flag === -1 ? 0.35 : 1),
      transform: [
        { translateX: g.cx - 32 },
        { translateY: y - 56 * s - 32 - p * 120 },
        { scale: s * (1 + p * 0.8) },
        { scaleX: flag === 1 ? 1 : 0.25 + 0.75 * Math.abs(Math.cos(phase.value * 0.5 + k)) },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 64, height: 64 }, st]}>
      <CoinIcon size={64} />
    </Animated.View>
  );
}

function Hurdle({ k, g, dist, state }: { k: number; g: Geo; dist: SharedValue<number>; state: SharedValue<number[]> }) {
  const W = 210;
  const H = 130;
  const st = useAnimatedStyle(() => {
    const r = rowInfo(k, dist.value);
    const s = laneW(g, r.z) / laneW(g, Z_RUN);
    const y = depthY(g, r.z);
    const tripped = state.value[k] === -2;
    return {
      zIndex: Math.round(r.d * 1000),
      opacity: r.hurdle ? clamp(r.z * 14) * (tripped ? 0.55 : 1) : 0,
      transform: [{ translateX: g.cx - W / 2 }, { translateY: y - (H * s) / 2 - H / 2 }, { scale: s }, { rotate: tripped ? '-70deg' : '0deg' }],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: W, height: H }, st]}>
      <Svg width={W} height={H} viewBox="0 0 210 130">
        <Rect x={22} y={40} width={16} height={90} rx={6} fill="#5A5A70" />
        <Rect x={172} y={40} width={16} height={90} rx={6} fill="#5A5A70" />
        <Rect x={4} y={22} width={202} height={52} rx={12} fill="#FFFFFF" />
        {[0, 1, 2, 3, 4].map((i) => (
          <Polygon key={i} points={`${14 + i * 40},22 ${40 + i * 40},22 ${20 + i * 40},74 ${-6 + i * 40},74`} fill="#F2456B" />
        ))}
        <Rect x={4} y={22} width={202} height={52} rx={12} fill="none" stroke="#C7354F" strokeWidth={4} />
      </Svg>
    </Animated.View>
  );
}

function Train({ k, g, dist }: { k: number; g: Geo; dist: SharedValue<number> }) {
  const W = 230;
  const H = 290;
  const st = useAnimatedStyle(() => {
    const r = rowInfo(k, dist.value);
    const s = laneW(g, r.z) / laneW(g, Z_RUN);
    const y = depthY(g, r.z);
    return {
      zIndex: Math.round(r.d * 1000),
      opacity: r.side !== 0 ? clamp(r.z * 14) : 0,
      transform: [{ translateX: g.cx + r.side * laneW(g, r.z) - W / 2 }, { translateY: y - (H * s) / 2 - H / 2 }, { scale: s }],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: W, height: H }, st]}>
      <Svg width={W} height={H} viewBox="0 0 230 290">
        <Rect x={8} y={10} width={214} height={270} rx={34} fill="#2F6FED" />
        <Rect x={8} y={196} width={214} height={84} rx={20} fill="#1F4FBF" />
        <Rect x={30} y={34} width={170} height={98} rx={18} fill="#BFE3FF" />
        <Path d="M40 120 L190 46" stroke="#FFFFFF" strokeWidth={8} opacity={0.5} />
        <Circle cx={52} cy={232} r={16} fill="#FFF3B0" />
        <Circle cx={178} cy={232} r={16} fill="#FFF3B0" />
        <Rect x={90} y={150} width={50} height={22} rx={8} fill="#FFC531" />
      </Svg>
    </Animated.View>
  );
}

function Sleeper({ j, g, dist }: { j: number; g: Geo; dist: SharedValue<number> }) {
  const st = useAnimatedStyle(() => {
    const d = fract(j / SLEEPERS + dist.value / ROWS);
    const z = d * d;
    const tw = laneW(g, z) * 3;
    return {
      opacity: clamp(z * 10),
      transform: [{ translateX: g.cx - g.tb / 2 }, { translateY: depthY(g, z) - 9 }, { scaleX: tw / g.tb }, { scaleY: 0.2 + z * 0.9 }],
    };
  });
  return <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: g.tb, height: 18, borderRadius: 6, backgroundColor: '#8A6A4F' }, st]} />;
}

function Runner({ g, h, phase, speed, air, trip }: { g: Geo; h: number; phase: SharedValue<number>; speed: SharedValue<number>; air: SharedValue<number>; trip: SharedValue<number> }) {
  const yR = depthY(g, Z_RUN);
  const pos = useAnimatedStyle(() => {
    const jump = air.value >= 0 ? Math.sin(Math.PI * air.value) * h * 0.16 : 0;
    const wobble = trip.value > 0 ? Math.sin(trip.value * 30) * 10 * (trip.value / TRIP_SEC) : 0;
    return { transform: [{ translateX: g.cx - 43 }, { translateY: yR - 140 - 35 - jump }, { scale: 1.5 }, { rotate: `${wobble}deg` }] };
  });
  const body = useAnimatedStyle(() => ({ transform: [{ translateY: -Math.abs(Math.sin(phase.value)) * (1 + speed.value * 9) }] }));
  const amp = (sign: number) => {
    'worklet';
    return sign * Math.sin(phase.value) * (4 + speed.value * 34);
  };
  const legL = useAnimatedStyle(() => ({ transform: [{ rotate: `${amp(1)}deg` }] }));
  const legR = useAnimatedStyle(() => ({ transform: [{ rotate: `${amp(-1)}deg` }] }));
  const armL = useAnimatedStyle(() => ({ transform: [{ rotate: `${amp(-1) * 1.3}deg` }] }));
  const armR = useAnimatedStyle(() => ({ transform: [{ rotate: `${amp(1) * 1.3}deg` }] }));
  const leg = { position: 'absolute' as const, top: 84, width: 17, height: 50, borderRadius: 8, backgroundColor: '#2D3A8C', transformOrigin: 'top' as any };
  const arm = { position: 'absolute' as const, top: 48, width: 13, height: 40, borderRadius: 7, backgroundColor: '#FF7A3D', transformOrigin: 'top' as any };
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 86, height: 140, zIndex: Math.round(D_RUN * 1000) }, pos]}>
      <View style={{ position: 'absolute', left: 13, top: 128, width: 60, height: 12, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.22)' }} />
      <Animated.View style={[leg, { left: 25 }, legL]}>
        <View style={{ position: 'absolute', bottom: -2, left: -2, width: 21, height: 12, borderRadius: 6, backgroundColor: '#FFFFFF' }} />
      </Animated.View>
      <Animated.View style={[leg, { left: 44 }, legR]}>
        <View style={{ position: 'absolute', bottom: -2, left: -2, width: 21, height: 12, borderRadius: 6, backgroundColor: '#FFFFFF' }} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, body]}>
        <Animated.View style={[arm, { left: 8 }, armL]} />
        <Animated.View style={[arm, { left: 65 }, armR]} />
        <View style={{ position: 'absolute', left: 17, top: 40, width: 52, height: 52, borderRadius: 18, backgroundColor: '#FF7A3D' }} />
        <View style={{ position: 'absolute', left: 24, top: 47, width: 38, height: 36, borderRadius: 10, backgroundColor: '#6C47FF' }} />
        <View style={{ position: 'absolute', left: 30, top: 54, width: 26, height: 6, borderRadius: 3, backgroundColor: '#9C85FF' }} />
        <View style={{ position: 'absolute', left: 23, top: 2, width: 40, height: 40, borderRadius: 20, backgroundColor: '#3B2A20' }} />
        <View style={{ position: 'absolute', left: 21, top: 0, width: 44, height: 22, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: '#F2456B' }} />
      </Animated.View>
    </Animated.View>
  );
}

function Streak({ i, w, h, phase, speed }: { i: number; w: number; h: number; phase: SharedValue<number>; speed: SharedValue<number> }) {
  const left = i % 2 === 0;
  const st = useAnimatedStyle(() => {
    const p = fract(phase.value * 0.35 + i / 6);
    return {
      opacity: clamp((speed.value - 0.5) * 2.5) * (1 - p) * 0.8,
      transform: [{ translateX: left ? w * (0.06 + (i % 3) * 0.03) : w * (0.9 - (i % 3) * 0.03) }, { translateY: h * (0.35 + p * 0.7) }, { scaleY: 0.5 + p * 2 }],
    };
  });
  return <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 5, height: 70, borderRadius: 3, backgroundColor: '#FFFFFF' }, st]} />;
}

export default function RailRush({ level, w, h, live }: SceneProps) {
  const g: Geo = { hy: h * 0.34, yb: h * 1.12, cx: w / 2, tt: w * 0.07, tb: w * 0.95 };
  const dist = useSharedValue(0.4);
  const phase = useSharedValue(0.6);
  const speed = useSharedValue(live ? 0 : 0.8);
  const air = useSharedValue(-1);
  const trip = useSharedValue(0);
  const state = useSharedValue<number[]>(new Array(ROWS).fill(0));
  const [coins, setCoins] = useState(0);
  const addCoin = () => setCoins((c) => c + 1);

  const clock = useFrameCallback((f) => {
    const dt = frameDt(f.timeSincePreviousFrame);
    const on = level.value > ON;
    // Attention is the engine: no attention, no running.
    if (trip.value > 0) {
      trip.value = Math.max(0, trip.value - dt);
      speed.value = 0;
    } else {
      const want = drive(level.value);
      speed.value += (want - speed.value) * Math.min(1, dt * (want > speed.value ? 2.5 : 1.6));
    }
    if (air.value >= 0) air.value = air.value + dt / JUMP_SEC >= 1 ? -1 : air.value + dt / JUMP_SEC;
    const prev = dist.value;
    const next = prev + dt * speed.value * 2.8;
    dist.value = next;
    phase.value += dt * speed.value * 16;
    const arr = state.value.slice();
    for (let k = 0; k < ROWS; k++) {
      const a = fract((k + prev) / ROWS);
      const r = rowInfo(k, next);
      if (r.d < a) arr[k] = 0;
      else if (a < D_RUN && r.d >= D_RUN) {
        if (r.hurdle) {
          if (on) {
            arr[k] = 2;
            air.value = 0; // attention on target: jump the hurdle
          } else {
            arr[k] = -2;
            trip.value = TRIP_SEC; // attention lost: trip over it
          }
        } else {
          arr[k] = on ? 1 : -1;
          if (on) runOnJS(addCoin)();
        }
      }
    }
    state.value = arr;
  }, live);
  useEffect(() => clock.setActive(live), [clock, live]);

  const rail = (lane: number, side: number) => {
    const x0 = g.cx + lane * (g.tt / 3) + side * (g.tt / 3) * 0.32;
    const x1 = g.cx + lane * (g.tb / 3) + side * (g.tb / 3) * 0.32;
    return <Line key={`${lane}${side}`} x1={x0} y1={g.hy} x2={x1} y2={g.yb} stroke="#C9CCD8" strokeWidth={5} />;
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={['#3FA4FF', '#9FD6FF', '#FFE3C2']} locations={[0, 0.25, 0.34]} style={StyleSheet.absoluteFill} />
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Circle cx={w * 0.8} cy={h * 0.12} r={h * 0.06} fill="#FFF3B0" />
        {Array.from({ length: 16 }, (_, i) => {
          const bw = w * (0.04 + hash(i) * 0.04);
          const bh = h * (0.06 + hash(i + 9) * 0.14);
          return <Rect key={i} x={(i / 16) * w} y={g.hy - bh} width={bw} height={bh + 2} rx={4} fill={i % 2 ? '#9AA7E6' : '#B3BEF0'} />;
        })}
        <Rect x={0} y={g.hy} width={w} height={h - g.hy} fill="#78C96F" />
        <Polygon points={`${g.cx - g.tt / 2 - 10},${g.hy} ${g.cx + g.tt / 2 + 10},${g.hy} ${g.cx + g.tb / 2 + 40},${g.yb} ${g.cx - g.tb / 2 - 40},${g.yb}`} fill="#B9A58E" />
      </Svg>
      {Array.from({ length: SLEEPERS }, (_, j) => (
        <Sleeper key={j} j={j} g={g} dist={dist} />
      ))}
      <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
        {[-1, 0, 1].flatMap((l) => [rail(l, -1), rail(l, 1)])}
      </Svg>
      {Array.from({ length: ROWS }, (_, k) => (
        <Train key={'t' + k} k={k} g={g} dist={dist} />
      ))}
      {Array.from({ length: ROWS }, (_, k) => (
        <Hurdle key={'h' + k} k={k} g={g} dist={dist} state={state} />
      ))}
      {Array.from({ length: ROWS }, (_, k) => (
        <Coin key={'c' + k} k={k} g={g} dist={dist} phase={phase} state={state} />
      ))}
      <Runner g={g} h={h} phase={phase} speed={speed} air={air} trip={trip} />
      {Array.from({ length: 6 }, (_, i) => (
        <Streak key={i} i={i} w={w} h={h} phase={phase} speed={speed} />
      ))}
      {live && <Counter icon={<CoinIcon />} value={coins} />}
    </View>
  );
}
