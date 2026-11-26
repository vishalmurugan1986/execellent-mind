import { useEffect, useState } from 'react';
import { Modal, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Body, Button, H1, IconButton, Kicker, Txt } from '@/components/ui';
import { C, F, R } from '@/constants/theme';
import { PAUSE_LIMIT_SECONDS } from '@/content';
import { useT } from '@/i18n';

export const fmt = (sec: number) => {
  const s = Math.max(0, Math.ceil(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export function Hud({ timeLeft, score, mult, streakPct, tint, onPause }: { timeLeft: number; score: number; mult: number; streakPct: number; tint: string; onPause: () => void }) {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ position: 'absolute', top: insets.top + 18, left: 0, right: 0, alignItems: 'center' }} pointerEvents="box-none">
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 26,
          paddingLeft: 30,
          paddingRight: 12,
          height: 88,
          borderRadius: R.pill,
          backgroundColor: 'rgba(255,255,255,0.94)',
          borderWidth: 1,
          borderColor: C.line,
        }}>
        <View style={{ alignItems: 'center', minWidth: 96 }}>
          <Txt style={{ fontSize: 12, letterSpacing: 1.5, color: C.textDim, fontFamily: F.semibold }}>{t('timeLeft').toUpperCase()}</Txt>
          <Txt style={{ fontFamily: F.black, fontSize: 30 }}>{fmt(timeLeft)}</Txt>
        </View>
        <View style={{ width: 1, height: 46, backgroundColor: C.line }} />
        <View style={{ alignItems: 'center', minWidth: 80 }}>
          <Txt style={{ fontSize: 12, letterSpacing: 1.5, color: C.textDim, fontFamily: F.semibold }}>{t('score').toUpperCase()}</Txt>
          <Txt style={{ fontFamily: F.black, fontSize: 30 }}>{score}</Txt>
        </View>
        <View style={{ width: 1, height: 46, backgroundColor: C.line }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 150, height: 10, borderRadius: 5, backgroundColor: C.line, overflow: 'hidden' }}>
            <View style={{ width: `${Math.round(streakPct * 100)}%`, height: 10, borderRadius: 5, backgroundColor: tint }} />
          </View>
          <Txt style={{ fontFamily: F.black, fontSize: 26, color: tint, minWidth: 40 }}>×{mult}</Txt>
        </View>
        <IconButton name="pause" onPress={onPause} size={62} bg={C.cardHi} label="Pause" />
      </View>
    </View>
  );
}

/** Live attention meter beside the game: the bar is the child's attention, the line is the target. */
export function MindMeter({ value, target, signalOk }: { value: number; target: number; signalOk: boolean }) {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const on = signalOk && value >= target;
  const H = 300;
  const fill = signalOk ? Math.max(0, Math.min(100, value)) : 0;
  return (
    <>
      <View pointerEvents="none" style={{ position: 'absolute', right: 24 + insets.right, top: insets.top + 130, alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: R.lg, paddingVertical: 14, paddingHorizontal: 12, borderWidth: 1, borderColor: C.line }}>
        <Txt style={{ fontFamily: F.bold, fontSize: 11, letterSpacing: 1.5, color: C.textDim }}>{t('focus').toUpperCase()}</Txt>
        <Txt style={{ fontFamily: F.black, fontSize: 28, color: on ? C.focus : C.textMute }}>{signalOk ? Math.round(value) : '–'}</Txt>
        <View style={{ width: 30, height: H, borderRadius: 15, backgroundColor: C.card, overflow: 'hidden', justifyContent: 'flex-end' }}>
          <View style={{ height: (H * fill) / 100, backgroundColor: on ? C.focus : '#B9B2D8', borderRadius: 15 }} />
          <View style={{ position: 'absolute', left: -2, right: -2, bottom: (H * target) / 100 - 2, height: 4, backgroundColor: C.coral }} />
        </View>
        <Txt style={{ fontSize: 11, color: C.coral, fontFamily: F.bold }}>{t('targetShort', { n: Math.round(target) })}</Txt>
      </View>
      {signalOk && (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 26, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 22, height: 50, borderRadius: R.pill, backgroundColor: on ? C.focus : 'rgba(255,255,255,0.95)', borderWidth: 1, borderColor: on ? C.focus : C.line }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: on ? '#FFFFFF' : C.warn }} />
            <Txt style={{ fontFamily: F.bold, fontSize: 17, color: on ? '#FFFFFF' : C.text }}>{on ? t('cueOn') : t('cueOff')}</Txt>
          </View>
        </View>
      )}
    </>
  );
}

export function SensorBanner({ show }: { show: boolean }) {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  if (!show) return null;
  return (
    <View style={{ position: 'absolute', top: insets.top + 124, left: 0, right: 0, alignItems: 'center' }} pointerEvents="none">
      <View style={{ backgroundColor: '#FFF4D6', paddingHorizontal: 26, paddingVertical: 14, borderRadius: R.md, maxWidth: 820 }}>
        <Txt style={{ color: '#8A4B00', fontFamily: F.semibold, textAlign: 'center' }}>{t('sensorOff')}</Txt>
      </View>
    </View>
  );
}

/** Pause sheet. In a journey session it shows a countdown; when it ends `onExpire` fires. */
export function PauseModal({
  visible,
  session,
  onResume,
  onStop,
  onChange,
  onExpire,
}: {
  visible: boolean;
  session: boolean;
  onResume: () => void;
  onStop?: () => void;
  onChange?: () => void;
  onExpire?: () => void;
}) {
  const { t } = useT();
  const [left, setLeft] = useState(PAUSE_LIMIT_SECONDS);
  useEffect(() => {
    if (!visible || !session) return;
    setLeft(PAUSE_LIMIT_SECONDS);
    const started = Date.now();
    const id = setInterval(() => {
      const l = PAUSE_LIMIT_SECONDS - (Date.now() - started) / 1000;
      setLeft(l);
      if (l <= 0) {
        clearInterval(id);
        onExpire?.();
      }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, session]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onResume}>
      <View style={{ flex: 1, backgroundColor: 'rgba(29,24,56,0.55)', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 640, maxWidth: '90%', backgroundColor: C.surface, borderRadius: R.xl, padding: 40, gap: 18, borderWidth: 1, borderColor: C.line }}>
          <Kicker>{t('paused')}</Kicker>
          <H1>{t('breathe')}</H1>
          <Body>{t('pausedBody')}</Body>
          {session && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, backgroundColor: C.sunSoft, borderRadius: R.md, padding: 18 }}>
              <Txt style={{ fontFamily: F.black, fontSize: 34, color: C.warn, minWidth: 110 }}>{fmt(left)}</Txt>
              <Body style={{ flex: 1, color: C.text }}>{t('pauseTimer')}</Body>
            </View>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            {session ? <Button title={t('changeActivity')} kind="ghost" onPress={onChange} /> : <Button title={t('stop')} kind="danger" onPress={onStop} />}
            <Button title={t('resume')} icon="play" onPress={onResume} style={{ minWidth: 200 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
