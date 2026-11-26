import { router } from 'expo-router';
import { useState, useSyncExternalStore } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, F, R } from '@/constants/theme';
import { signalBars, useEeg } from '@/eeg/EegProvider';
import { useT } from '@/i18n';
import { useApp } from '@/store/AppStore';
import { Icon } from './Icon';
import { Txt } from './ui';
import { BandBars, Gauge, RawWave, SignalBars } from './viz';

type Marker = { protocol: 'focus' | 'calm'; value: number } | null;
let markerState: Marker = null;
const listeners = new Set<() => void>();
/** Games publish their current target here so the dock gauge can show it. */
export function setDockMarker(m: Marker) {
  markerState = m;
  listeners.forEach((l) => l());
}
function useDockMarker() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => markerState,
  );
}

/** Persistent bottom panel: raw EEG / brainwaves, attention gauge, signal status. */
export function LiveDock() {
  const marker = useDockMarker();
  const { t } = useT();
  const eeg = useEeg();
  const { settings, setSettings } = useApp();
  const [view, setView] = useState<'raw' | 'waves'>('raw');
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = width < 900;
  const [panelW, setPanelW] = useState(0);

  if (settings.dockHidden) {
    return (
      <Pressable
        onPress={() => setSettings({ dockHidden: false })}
        style={{
          position: 'absolute',
          right: 18 + insets.right,
          bottom: 14 + insets.bottom,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 16,
          height: 44,
          borderRadius: R.pill,
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: C.line,
          elevation: 3,
        }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: eeg.signalOk ? C.good : C.coral }} />
        <Txt style={{ fontFamily: F.bold, fontSize: 14 }}>
          {t('focus')} {eeg.attention}
        </Txt>
        <Icon name="up" size={18} color={C.textDim} />
      </Pressable>
    );
  }

  const status =
    eeg.status === 'connected'
      ? t('connected')
      : eeg.status === 'connecting'
        ? t('connecting')
        : eeg.status === 'error'
          ? t('reconnecting')
          : t('connectHeadset');

  return (
    <View
      style={{
        backgroundColor: C.surface,
        borderTopWidth: 1,
        borderTopColor: C.line,
        paddingLeft: 16 + insets.left,
        paddingRight: 20 + insets.right,
        paddingTop: 10,
        paddingBottom: 10 + Math.min(insets.bottom, 24),
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
      }}>
      <View
        style={{ flex: 1, minWidth: 200, height: 86, backgroundColor: C.bg, borderRadius: R.md, paddingHorizontal: 10, overflow: 'hidden', borderWidth: 1, borderColor: C.line }}
        onLayout={(e) => setPanelW(Math.round(e.nativeEvent.layout.width))}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, position: 'absolute', left: 12, top: 7, zIndex: 2 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: eeg.signalOk ? C.calm : C.textMute }} />
          <Txt style={{ fontFamily: F.bold, fontSize: 11, color: C.calm, letterSpacing: 1.5 }}>{t('live')}</Txt>
        </View>
        {view === 'raw' ? (
          <View style={{ marginTop: 22 }}>{panelW > 0 && <RawWave width={panelW - 22} height={58} />}</View>
        ) : (
          <View style={{ marginTop: 6 }}>{panelW > 0 && <BandBars width={panelW - 22} height={76} labels={t('bandNames').split('|')} />}</View>
        )}
      </View>

      {!compact && (
        <View style={{ gap: 8 }}>
          {(['raw', 'waves'] as const).map((v) => (
            <Pressable
              key={v}
              onPress={() => setView(v)}
              style={{
                width: 132,
                height: 38,
                borderRadius: R.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: view === v ? C.cardHi : C.surface,
                borderWidth: 1,
                borderColor: view === v ? C.calm : C.line,
              }}>
              <Txt style={{ fontFamily: F.semibold, fontSize: 14, color: view === v ? C.text : C.textDim }}>{t(v === 'raw' ? 'rawEeg' : 'waves')}</Txt>
            </Pressable>
          ))}
        </View>
      )}

      <Gauge size={76} value={eeg.attention} color={C.focus} label={t('focus')} marker={marker?.protocol === 'focus' ? marker.value : null} />

      <View style={{ alignItems: 'flex-end', gap: 8, minWidth: 118 }}>
        <Pressable onPress={() => setSettings({ dockHidden: true })} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} hitSlop={8}>
          <Txt style={{ fontFamily: F.semibold, fontSize: 13, color: C.textDim }}>{t('hide')}</Txt>
          <Icon name="down" size={16} color={C.textDim} />
        </Pressable>
        <Pressable onPress={() => router.push('/settings?tab=headset')} style={{ alignItems: 'flex-end', gap: 6 }} hitSlop={8}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Txt style={{ fontSize: 13, color: C.textDim }}>{t('signal')}</Txt>
            <SignalBars level={signalBars(eeg.poorSignal)} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Txt style={{ fontSize: 13, color: C.textDim }}>{status}</Txt>
            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: eeg.status === 'connected' ? C.good : eeg.status === 'connecting' || eeg.status === 'error' ? C.warn : C.coral }} />
          </View>
        </Pressable>
      </View>
    </View>
  );
}
