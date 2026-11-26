import * as Crypto from 'expo-crypto';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';

import { useSound } from '@/audio/AudioProvider';
import { setDockMarker } from '@/components/LiveDock';
import { Protocol, protocolColor } from '@/constants/theme';
import { EngineResult, useFocusEngine } from '@/games/engine';
import { Hud, PauseModal, SensorBanner } from '@/games/Hud';
import { useApp } from '@/store/AppStore';

export default function VideoPlay() {
  const { uri = '', protocol: pr = 'focus' } = useLocalSearchParams<{ uri: string; protocol: Protocol }>();
  const protocol = pr as Protocol;
  const app = useApp();
  const sound = useSound();
  const [paused, setPaused] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const player = useVideoPlayer(decodeURIComponent(uri), (p) => {
    p.loop = false;
  });

  // Wait for the video's length; it becomes the activity length.
  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => {
      if (player.duration > 0) {
        setDuration(player.duration);
        clearInterval(id);
      } else if (Date.now() - started > 4000) {
        setDuration(300);
        clearInterval(id);
      }
    }, 200);
    return () => clearInterval(id);
  }, [player]);

  const finish = (r: EngineResult) => {
    const id = Crypto.randomUUID();
    app.addActivity({ id, at: Date.now(), game: 'video', protocol, ...r });
    router.replace(`/activity/results?id=${id}&game=video&protocol=${protocol}&threshold=0&dynamic=0`);
  };

  const eng = useFocusEngine({
    protocol,
    threshold: 40,
    dynamic: true,
    durationSec: duration ?? 300,
    running: duration != null && !paused,
    onLevelUp: () => {},
    onFinish: finish,
  });

  useEffect(() => {
    if (duration == null) return;
    if (paused || !eng.signalOk) player.pause();
    else player.play();
  }, [paused, duration, player, eng.signalOk]);

  useEffect(() => {
    const vol = app.settings.master;
    player.volume = eng.above || !eng.signalOk ? vol : vol * 0.15;
  }, [eng.above, eng.signalOk, app.settings.master, player]);

  useEffect(() => {
    setDockMarker({ protocol, value: eng.threshold });
  }, [eng.threshold, protocol]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        setPaused(true);
        return true;
      });
      return () => {
        sub.remove();
        setDockMarker(null);
      };
    }, []),
  );

  const dim = useAnimatedStyle(() => ({ opacity: interpolate(eng.level.value, [0.3, 0.6], [0.78, 0], 'clamp') }));

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#05060E' }, dim]} />
      <Hud timeLeft={eng.timeLeft} score={eng.score} mult={eng.mult} streakPct={eng.streakPct} tint={protocolColor(protocol)} onPause={() => setPaused(true)} />
      <SensorBanner show={!eng.signalOk} />
      <PauseModal
        visible={paused}
        session={false}
        onResume={() => setPaused(false)}
        onStop={() => {
          setPaused(false);
          player.pause();
          eng.finishNow();
        }}
      />
    </View>
  );
}
