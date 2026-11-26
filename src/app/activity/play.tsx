import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, View } from 'react-native';

import { useSound } from '@/audio/AudioProvider';
import { setDockMarker } from '@/components/LiveDock';
import { C, Protocol, protocolColor } from '@/constants/theme';
import { ACTIVITY_SECONDS, GameId } from '@/content';
import { EngineResult, useFocusEngine } from '@/games/engine';
import { Hud, MindMeter, PauseModal, SensorBanner } from '@/games/Hud';
import { SceneView } from '@/games/scenes';
import { useT } from '@/i18n';
import { ActivityRecord, useApp } from '@/store/AppStore';

export default function Play() {
  const p = useLocalSearchParams<{ game: GameId; protocol: Protocol; threshold: string; dynamic: string; session?: string }>();
  const game = (p.game ?? 'runner') as GameId;
  const protocol = (p.protocol ?? 'focus') as Protocol;
  const inSession = p.session === '1';
  const { t } = useT();
  const app = useApp();
  const sound = useSound();
  const [paused, setPaused] = useState(false);
  const finished = useRef(false);
  const duration = ACTIVITY_SECONDS;

  const finish = (r: EngineResult) => {
    finished.current = true;
    const rec: ActivityRecord = {
      id: Crypto.randomUUID(),
      at: Date.now(),
      game,
      protocol,
      ...r,
      session: inSession && app.active ? { stageId: app.active.stageId, n: app.active.n, slot: app.active.slot } : undefined,
    };
    app.addActivity(rec);
    let complete = false;
    let sessionN = app.active?.n ?? 0;
    if (inSession) complete = app.sessionActivityDone(rec) === 'complete';
    router.replace(
      `/activity/results?id=${rec.id}&game=${game}&protocol=${protocol}&threshold=${p.threshold}&dynamic=${p.dynamic}${inSession ? `&session=1&complete=${complete ? 1 : 0}&n=${sessionN}` : ''}`,
    );
  };

  const eng = useFocusEngine({
    protocol,
    threshold: Number(p.threshold ?? 40),
    dynamic: p.dynamic === '1',
    durationSec: duration,
    running: !paused,
    onLevelUp: () => {
      sound.playReward();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    },
    onFinish: finish,
  });

  // Ambience + dock marker while the activity screen is focused.
  useFocusEffect(
    useCallback(() => {
      sound.startAmbience();
      return () => {
        sound.stopAmbience();
        setDockMarker(null);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );
  useEffect(() => {
    setDockMarker({ protocol, value: eng.threshold });
  }, [eng.threshold, protocol]);
  useEffect(() => {
    if (paused) sound.stopAmbience();
    else sound.startAmbience();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  // Android back button pauses instead of leaving.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        setPaused(true);
        return true;
      });
      return () => sub.remove();
    }, []),
  );

  if (inSession && !app.active && !finished.current) return <Redirect href="/home" />;

  return (
    <View style={{ flex: 1, backgroundColor: C.bgDeep }}>
      <SceneView game={game} level={eng.level} live={!paused} />
      <Hud timeLeft={eng.timeLeft} score={eng.score} mult={eng.mult} streakPct={eng.streakPct} tint={protocolColor(protocol)} onPause={() => setPaused(true)} />
      <MindMeter value={eng.value} target={eng.threshold} signalOk={eng.signalOk} />
      <SensorBanner show={!eng.signalOk} />
      <PauseModal
        visible={paused}
        session={inSession}
        onResume={() => setPaused(false)}
        onStop={() => {
          setPaused(false);
          eng.finishNow();
        }}
        onChange={() => {
          setPaused(false);
          router.replace(`/games?protocol=${protocol}&session=1`);
        }}
        onExpire={() => {
          setPaused(false);
          app.resetSession();
          Alert.alert(t('paused'), t('sessionReset'));
          router.replace(`/games?protocol=${protocol}&session=1`);
        }}
      />
    </View>
  );
}
