import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import React, { createContext, useCallback, useContext, useEffect, useRef } from 'react';

import { Settings, useApp } from '@/store/AppStore';

const REWARDS = {
  chime: require('../../assets/audio/reward-chime.wav'),
  pulse: require('../../assets/audio/reward-pulse.wav'),
  drop: require('../../assets/audio/reward-drop.wav'),
};
const AMBIENCE = {
  rain: require('../../assets/audio/amb-rain.wav'),
  breeze: require('../../assets/audio/amb-breeze.wav'),
  ocean: require('../../assets/audio/amb-ocean.wav'),
  night: require('../../assets/audio/amb-night.wav'),
};

type Ctx = {
  playReward: () => void;
  startAmbience: () => void;
  stopAmbience: () => void;
  previewReward: (k: Settings['reward']) => void;
  previewAmbience: (k: Settings['ambience']) => void;
};

const AudioCtx = createContext<Ctx | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useApp();
  const s = useRef(settings);
  s.current = settings;
  const reward = useRef<AudioPlayer | null>(null);
  const amb = useRef<AudioPlayer | null>(null);
  const ambKind = useRef<string | null>(null);
  const ambOn = useRef(false);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => {});
    return () => {
      reward.current?.remove();
      amb.current?.remove();
    };
  }, []);

  const fx = () => s.current.master * s.current.effects;
  const mus = () => s.current.master * s.current.music;

  const playRewardKind = useCallback((k: Settings['reward']) => {
    try {
      reward.current?.remove();
      const p = createAudioPlayer(REWARDS[k]);
      p.volume = fx();
      p.play();
      reward.current = p;
    } catch {}
  }, []);

  const ensureAmb = (k: Settings['ambience']) => {
    if (k === 'none') {
      amb.current?.pause();
      return null;
    }
    if (ambKind.current !== k || !amb.current) {
      amb.current?.remove();
      amb.current = createAudioPlayer(AMBIENCE[k]);
      amb.current.loop = true;
      ambKind.current = k;
    }
    amb.current.volume = mus();
    return amb.current;
  };

  // Keep live volumes in sync with the sliders.
  useEffect(() => {
    if (amb.current) amb.current.volume = mus();
    if (ambOn.current && settings.ambience !== ambKind.current) {
      const p = ensureAmb(settings.ambience);
      p?.play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.master, settings.music, settings.ambience]);

  const value: Ctx = {
    playReward: () => playRewardKind(s.current.reward),
    previewReward: playRewardKind,
    startAmbience: () => {
      ambOn.current = true;
      try {
        ensureAmb(s.current.ambience)?.play();
      } catch {}
    },
    stopAmbience: () => {
      ambOn.current = false;
      amb.current?.pause();
    },
    previewAmbience: (k) => {
      try {
        if (previewTimer.current) clearTimeout(previewTimer.current);
        const p = ensureAmb(k);
        if (!p) return;
        p.play();
        previewTimer.current = setTimeout(() => {
          if (!ambOn.current) amb.current?.pause();
        }, 4000);
      } catch {}
    },
  };

  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}

export function useSound() {
  const c = useContext(AudioCtx);
  if (!c) throw new Error('useSound outside AudioProvider');
  return c;
}
