import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { runOnJS, SharedValue, useAnimatedStyle, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { F } from '@/constants/theme';
import { clamp, Counter, drive, fract, frameDt, hash, ON, SceneProps } from './common';

/* Two-lane race controlled by attention: the rival drives at a steady pace, your kart's speed is your
 * attention. On target you catch up and overtake; when attention drops you fall behind. */

function Kart({ body, accent, helmet, wheel }: { body: string; accent: string; helmet: string; wheel: SharedValue<number> }) {
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${wheel.value}deg` }] }));
  const W = (x: number) => (
    <Animated.View key={x} style={[{ position: 'absolute', left: x - 24, top: 62, width: 48, height: 48 }, spin]}>
      <Svg width={48} height={48}>
        <Circle cx={24} cy={24} r={22} fill="#26243A" />
        <Circle cx={24} cy={24} r={10} fill="#C9C6DD" />
        <Rect x={21} y={4} width={6} height={40} fill="#4A4766" />
      </Svg>
    </Animated.View>
  );
  return (
    <View style={{ width: 210, height: 112 }}>
      <Svg width={210} height={100} style={StyleSheet.absoluteFill}>
        <Path d="M14 74 L22 50 L70 44 L96 22 L132 22 L150 44 L196 52 L202 76 Z" fill={body} />
        <Path d="M22 74 L196 74 L190 86 L28 86 Z" fill={accent} />
        <Rect x={176} y={40} width={26} height={10} rx={4} fill={accent} />
        <Circle cx={112} cy={22} r={18} fill={helmet} />
        <Rect x={114} y={14} width={18} height={10} rx={4} fill="#BFE3FF" />
      </Svg>
      {W(52)}
      {W(166)}
    </View>
  );
}

export default function TurboKart({ level, w, h, live }: SceneProps) {
  const roadTop = h * 0.58;
  const laneBack = h * 0.67;
  const laneFront = h * 0.84;
  const dist = useSharedValue(0.2);
  const t = useSharedValue(0);
  const wheel = useSharedValue(0);
  const px = useSharedValue(live ? w * 0.4 : w * 0.62);
  const ahead = useSharedValue(0);
  const [passes, setPasses] = useState(0);
  const [lead, setLead] = useState(false);
  const pass = () => setPasses((p) => p + 1);

  const clock = useFrameCallback((f) => {
    const dt = frameDt(f.timeSincePreviousFrame);
    const d = drive(level.value);
    t.value += dt;
    dist.value += dt * (0.2 + d * 2.7);
    wheel.value = (wheel.value + dt * (120 + d * 1300)) % 360;
    const target = clamp(w * 0.5 + (d - 0.55) * w * 0.62, w * 0.1, w * 0.78);
    px.value += (target - px.value) * Math.min(1, dt * 0.9);
    const rival = w * 0.5 + Math.sin(t.value * 0.6) * w * 0.03;
    const isAhead = px.value > rival + 60 ? 1 : 0;
    if (isAhead !== ahead.value) {
      if (isAhead === 1) runOnJS(pass)();
      ahead.value = isAhead;
      runOnJS(setLead)(isAhead === 1);
    }
  }, live);
  useEffect(() => clock.setActive(live), [clock, live]);

  const rival = useAnimatedStyle(() => ({ transform: [{ translateX: w * 0.5 - 105 + Math.sin(t.value * 0.6) * w * 0.03 }, { translateY: laneBack - 40 + Math.sin(t.value * 9) * 1.5 }] }));
  const player = useAnimatedStyle(() => ({ transform: [{ translateX: px.value - 105 }, { translateY: laneFront - 40 + Math.sin(t.value * 11) * 1.5 }] }));
  const turbo = useAnimatedStyle(() => ({ opacity: clamp((level.value - ON) * 3), transform: [{ scaleX: 0.8 + Math.sin(t.value * 30) * 0.2 }] }));
  const dashes = useAnimatedStyle(() => ({ transform: [{ translateX: -fract(dist.value) * 240 }] }));
  const city = useAnimatedStyle(() => ({ transform: [{ translateX: -fract(dist.value * 0.04) * w }] }));
  const trees = useAnimatedStyle(() => ({ transform: [{ translateX: -fract(dist.value * 0.22) * w }] }));

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={['#FF9A8B', '#FFC3A0', '#FFE7C4']} style={StyleSheet.absoluteFill} />
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Circle cx={w * 0.2} cy={h * 0.2} r={h * 0.08} fill="#FFF1B8" />
      </Svg>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: w * 2, height: roadTop, flexDirection: 'row' }, city]}>
        {[0, 1].map((k) => (
          <Svg key={k} width={w} height={roadTop}>
            {Array.from({ length: 14 }, (_, i) => {
              const bw = w * (0.05 + hash(i + 3) * 0.04);
              const bh = roadTop * (0.25 + hash(i + 11) * 0.4);
              return <Rect key={i} x={(i / 14) * w} y={roadTop - bh} width={bw} height={bh} rx={6} fill={i % 2 ? '#B48BD6' : '#C9A2E6'} />;
            })}
          </Svg>
        ))}
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: w * 2, height: roadTop, flexDirection: 'row' }, trees]}>
        {[0, 1].map((k) => (
          <Svg key={k} width={w} height={roadTop}>
            {Array.from({ length: 7 }, (_, i) => {
              const x = (i / 7) * w + 40;
              return (
                <React.Fragment key={i}>
                  <Rect x={x - 6} y={roadTop - 60} width={12} height={60} fill="#8A5A3C" />
                  <Circle cx={x} cy={roadTop - 76} r={34} fill={i % 2 ? '#4CB85C' : '#5FCB6E'} />
                </React.Fragment>
              );
            })}
          </Svg>
        ))}
      </Animated.View>
      <View style={{ position: 'absolute', left: 0, top: roadTop, width: w, height: h - roadTop, backgroundColor: '#5B5873' }} />
      <View style={{ position: 'absolute', left: 0, top: roadTop, width: w, height: 10, backgroundColor: '#F2456B' }} />
      <View style={{ position: 'absolute', left: 0, top: h - 14, width: w, height: 14, backgroundColor: '#F2456B' }} />
      <Animated.View style={[{ position: 'absolute', left: 0, top: (laneBack + laneFront) / 2 + 36, width: w + 480, height: 8, flexDirection: 'row' }, dashes]}>
        {Array.from({ length: Math.ceil(w / 240) + 3 }, (_, i) => (
          <View key={i} style={{ width: 130, height: 8, borderRadius: 4, marginRight: 110, backgroundColor: '#FFFFFF' }} />
        ))}
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, rival]}>
        <Kart body="#FF9F1C" accent="#E07A00" helmet="#FFFFFF" wheel={wheel} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, player]}>
        <Animated.View style={[{ position: 'absolute', left: -60, top: 52, width: 80, height: 26, transformOrigin: 'right' as any }, turbo]}>
          <Svg width={80} height={26}>
            <Path d="M80 2 L0 13 L80 24 Z" fill="#FF7A3D" />
            <Path d="M80 7 L26 13 L80 19 Z" fill="#FFE38A" />
          </Svg>
        </Animated.View>
        <Kart body="#6C47FF" accent="#4F2FE0" helmet="#F2456B" wheel={wheel} />
      </Animated.View>
      {live && (
        <>
          <Counter
            value={passes}
            icon={
              <Svg width={30} height={30} viewBox="0 0 24 24">
                <Path d="M4 20 L4 4 M4 4 L18 4 L15 8 L18 12 L4 12" stroke="#1D1838" strokeWidth={2.4} fill="#6C47FF" strokeLinejoin="round" />
              </Svg>
            }
          />
          <View style={{ position: 'absolute', right: 24, top: 36, height: 52, paddingHorizontal: 20, borderRadius: 26, justifyContent: 'center', backgroundColor: lead ? '#6C47FF' : 'rgba(255,255,255,0.92)' }}>
            <Text style={{ fontFamily: F.black, fontSize: 22, color: lead ? '#FFFFFF' : '#1D1838' }}>{lead ? '1st' : '2nd'}</Text>
          </View>
        </>
      )}
    </View>
  );
}
