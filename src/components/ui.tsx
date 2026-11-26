import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  View,
  ViewStyle,
} from 'react-native';

import { C, F, R } from '@/constants/theme';
import { Icon, IconName } from './Icon';

export function Txt({ style, ...p }: TextProps) {
  return <Text {...p} style={[{ color: C.text, fontFamily: F.regular, fontSize: 16 }, style]} />;
}

export const Kicker = ({ children, color = C.focus }: { children: React.ReactNode; color?: string }) => (
  <Txt style={{ fontFamily: F.bold, fontSize: 13, letterSpacing: 2.2, color, textTransform: 'uppercase' }}>{children}</Txt>
);

export const H1 = ({ children, style }: { children: React.ReactNode; style?: any }) => (
  <Txt style={[{ fontFamily: F.black, fontSize: 40, lineHeight: 48, letterSpacing: -0.5 }, style]}>{children}</Txt>
);

export const H2 = ({ children, style }: { children: React.ReactNode; style?: any }) => (
  <Txt style={[{ fontFamily: F.bold, fontSize: 24, lineHeight: 30 }, style]}>{children}</Txt>
);

export const Body = ({ children, style, dim = true }: { children: React.ReactNode; style?: any; dim?: boolean }) => (
  <Txt style={[{ fontSize: 16, lineHeight: 24, color: dim ? C.textDim : C.text }, style]}>{children}</Txt>
);

type BtnKind = 'primary' | 'ghost' | 'danger' | 'calm' | 'quiet';

export function Button({
  title,
  onPress,
  kind = 'primary',
  icon,
  disabled,
  loading,
  style,
  small,
}: {
  title: string;
  onPress?: () => void;
  kind?: BtnKind;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const bg =
    kind === 'primary' ? C.focus : kind === 'calm' ? C.calm : kind === 'danger' ? 'transparent' : kind === 'quiet' ? C.card : 'transparent';
  const fg = kind === 'primary' || kind === 'calm' ? C.ink : kind === 'danger' ? C.coral : C.text;
  const border = kind === 'ghost' ? C.line : kind === 'danger' ? C.coral : 'transparent';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          height: small ? 44 : 56,
          paddingHorizontal: small ? 18 : 28,
          borderRadius: R.pill,
          backgroundColor: bg,
          borderWidth: 1.5,
          borderColor: border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          opacity: disabled ? 0.4 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          <Txt style={{ fontFamily: F.bold, fontSize: small ? 15 : 17, color: fg }}>{title}</Txt>
          {icon && <Icon name={icon} color={fg} size={small ? 18 : 20} />}
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ name, onPress, size = 48, tint = C.text, bg = C.card, label }: { name: IconName; onPress?: () => void; size?: number; tint?: string; bg?: string; label?: string }) {
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}>
      <Icon name={name} color={tint} size={size * 0.46} />
    </Pressable>
  );
}

export function Card({ children, style, pad = 28 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; pad?: number }) {
  return <View style={[{ backgroundColor: C.surface, borderRadius: R.xl, padding: pad, borderWidth: 1, borderColor: C.line }, style]}>{children}</View>;
}

export function PressCard({ children, style, ...p }: PressableProps & { style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      {...p}
      style={({ pressed }) => [
        {
          backgroundColor: C.surface,
          borderRadius: R.xl,
          borderWidth: 1,
          borderColor: pressed ? C.focus : C.line,
          transform: [{ scale: pressed ? 0.985 : 1 }],
          opacity: p.disabled ? 0.5 : 1,
        },
        style,
      ]}>
      {children}
    </Pressable>
  );
}

export function Field({ label, error, style, ...p }: TextInputProps & { label: string; error?: boolean }) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={[{ gap: 8 }, style as any]}>
      {!!label && <Txt style={{ fontFamily: F.semibold, fontSize: 14, color: C.textDim }}>{label}</Txt>}
      <TextInput
        placeholderTextColor={C.textMute}
        {...p}
        style={{
          height: 50,
          borderRadius: R.md,
          backgroundColor: C.bgDeep,
          borderWidth: 1.5,
          borderColor: error ? C.coral : focus ? C.focus : C.line,
          paddingHorizontal: 18,
          color: C.text,
          fontFamily: F.medium,
          fontSize: 17,
        }}
        onFocus={(e) => {
          setFocus(true);
          p.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocus(false);
          p.onBlur?.(e);
        }}
      />
    </View>
  );
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable onPress={() => onChange(!checked)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} hitSlop={6}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 9,
          borderWidth: 2,
          borderColor: checked ? C.focus : C.line,
          backgroundColor: checked ? C.focus : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {checked && <Icon name="check" color={C.ink} size={18} stroke={3} />}
      </View>
      <Txt style={{ color: C.textDim, fontFamily: F.medium }}>{label}</Txt>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, accent = C.focus }: { label: string; selected?: boolean; onPress?: () => void; accent?: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 20,
        height: 46,
        borderRadius: R.pill,
        borderWidth: 1.5,
        borderColor: selected ? accent : C.line,
        backgroundColor: selected ? accent : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}>
      <Txt style={{ fontFamily: F.semibold, color: selected ? C.ink : C.text, fontSize: 15 }}>{label}</Txt>
    </Pressable>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: C.bgDeep, borderRadius: R.pill, padding: 5, alignSelf: 'flex-start' }}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            style={{ paddingHorizontal: 22, height: 42, borderRadius: R.pill, backgroundColor: on ? C.cardHi : 'transparent', justifyContent: 'center' }}>
            <Txt style={{ fontFamily: on ? F.bold : F.medium, color: on ? C.text : C.textMute, fontSize: 15 }}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Lightweight horizontal slider built on the responder system (works in Expo Go). */
export function Slider({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  accent = C.focus,
  onEnd,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  accent?: string;
  onEnd?: (v: number) => void;
}) {
  const width = useRef(1);
  const last = useRef(value);
  const pct = (value - min) / (max - min);
  const fromX = (e: GestureResponderEvent) => {
    const x = Math.max(0, Math.min(width.current, e.nativeEvent.locationX));
    const raw = min + (x / width.current) * (max - min);
    const v = Math.round(raw / step) * step;
    last.current = v;
    onChange(Number(v.toFixed(4)));
  };
  return (
    <View
      style={{ height: 44, justifyContent: 'center' }}
      onLayout={(e) => (width.current = e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={fromX}
      onResponderMove={fromX}
      onResponderRelease={() => onEnd?.(last.current)}>
      <View pointerEvents="none" style={{ height: 8, borderRadius: 4, backgroundColor: C.line }}>
        <View style={{ width: `${pct * 100}%`, height: 8, borderRadius: 4, backgroundColor: accent }} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: `${pct * 100}%`,
          marginLeft: -14,
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: C.paper,
          borderWidth: 4,
          borderColor: accent,
        }}
      />
    </View>
  );
}

export const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
