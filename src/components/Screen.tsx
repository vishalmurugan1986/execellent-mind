import { LinearGradient } from 'expo-linear-gradient';
import { router, usePathname } from 'expo-router';
import React, { useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { C, F, R } from '@/constants/theme';
import { useT } from '@/i18n';
import { useApp } from '@/store/AppStore';
import { Logo } from './Logo';
import { H1, IconButton, Kicker, Txt } from './ui';

export function Backdrop() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={['#F1ECFF', C.bg, '#E8F8F5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="glowA" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={C.focus} stopOpacity="0.14" />
            <Stop offset="1" stopColor={C.focus} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="glowB" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={C.sun} stopOpacity="0.14" />
            <Stop offset="1" stopColor={C.calm} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="88%" cy="8%" r="320" fill="url(#glowA)" />
        <Circle cx="6%" cy="92%" r="380" fill="url(#glowB)" />
      </Svg>
    </View>
  );
}

function NavLink({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ paddingHorizontal: 20, height: 44, borderRadius: R.pill, justifyContent: 'center', backgroundColor: active ? C.card : 'transparent' }}>
      <Txt style={{ fontFamily: F.bold, fontSize: 16, color: active ? C.focus : C.text }}>{label}</Txt>
    </Pressable>
  );
}

export function TopBar() {
  const { t } = useT();
  const { user, signOut } = useApp();
  const path = usePathname();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const go = (to: any) => {
    setOpen(false);
    if (path !== to) router.push(to);
  };

  const items: { label: string; onPress: () => void; danger?: boolean }[] = [
    { label: t('settings'), onPress: () => go('/settings') },
    { label: t('home'), onPress: () => (setOpen(false), router.dismissTo(user ? '/home' : '/')) },
    ...(user
      ? [
          {
            label: t('logout'),
            onPress: () => {
              setOpen(false);
              signOut();
              router.dismissTo('/');
            },
          },
        ]
      : []),
    { label: t('quit'), onPress: () => BackHandler.exitApp(), danger: true },
  ];

  return (
    <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 24, paddingBottom: 4 }}>
      <View
        style={{
          height: 60,
          borderRadius: R.pill,
          backgroundColor: 'rgba(255,255,255,0.9)',
          borderWidth: 1,
          borderColor: C.line,
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: 22,
          paddingRight: 10,
        }}>
        <Pressable onPress={() => router.dismissTo(user ? '/home' : '/')}>
          <Logo size={30} />
        </Pressable>
        <View style={{ flex: 1 }} />
        {user && <NavLink label={t('profile')} active={path === '/profile'} onPress={() => go('/profile')} />}
        <NavLink label={t('home')} active={path === '/home' || path === '/'} onPress={() => router.dismissTo(user ? '/home' : '/')} />
        <View style={{ width: 8 }} />
        <IconButton name="menu" label="Menu" onPress={() => setOpen(true)} bg={open ? C.focus : C.card} tint={open ? C.ink : C.text} />
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)}>
          <View
            style={{
              position: 'absolute',
              top: insets.top + 76,
              right: 36,
              width: 260,
              backgroundColor: C.surface,
              borderRadius: R.lg,
              borderWidth: 1,
              borderColor: C.line,
              paddingVertical: 10,
            }}>
            {items.map((it, i) => (
              <Pressable
                key={it.label}
                onPress={it.onPress}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  paddingHorizontal: 22,
                  height: 54,
                  backgroundColor: pressed ? C.card : 'transparent',
                  borderTopWidth: it.danger ? 1 : 0,
                  borderTopColor: C.line,
                  marginTop: it.danger && i > 0 ? 6 : 0,
                })}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: it.danger ? C.coral : C.focus }} />
                <Txt style={{ fontFamily: F.semibold, fontSize: 17, color: it.danger ? C.coral : C.text }}>{it.label}</Txt>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

/** Standard page: backdrop, top bar, optional back button + heading, scrollable body. */
export function Screen({
  children,
  back,
  kicker,
  title,
  subtitle,
  center,
  scroll = true,
}: {
  children?: React.ReactNode;
  back?: boolean | (() => void);
  kicker?: string;
  title?: string;
  subtitle?: string;
  center?: boolean;
  scroll?: boolean;
}) {
  const onBack = typeof back === 'function' ? back : () => (router.canGoBack() ? router.back() : router.replace('/'));
  const header = !title && back ? (
    <View style={{ position: 'absolute', left: 36, top: 12, zIndex: 5 }}>
      <IconButton name="back" label="Back" onPress={onBack} size={52} />
    </View>
  ) : (title || back) && (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 20, marginBottom: 28 }}>
      {back ? <IconButton name="back" label="Back" onPress={onBack} size={52} /> : null}
      <View style={{ flex: 1, alignItems: center ? 'center' : 'flex-start', marginRight: center && back ? 72 : 0, gap: 8 }}>
        {kicker && <Kicker>{kicker}</Kicker>}
        {title && <H1 style={{ textAlign: center ? 'center' : 'left' }}>{title}</H1>}
        {subtitle && <Txt style={{ color: C.textDim, fontSize: 17, textAlign: center ? 'center' : 'left' }}>{subtitle}</Txt>}
      </View>
    </View>
  );
  const body = (
    <View style={{ paddingHorizontal: 36, paddingTop: 10, paddingBottom: 20, flexGrow: 1 }}>
      {header}
      {children}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      <TopBar />
      {scroll ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            {body}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </View>
  );
}
