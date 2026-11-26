import { useEffect, useRef, useState } from 'react';
import { useSharedValue, withTiming } from 'react-native-reanimated';

import type { Protocol } from '@/constants/theme';
import { useEeg } from '@/eeg/EegProvider';

export type EngineResult = {
  score: number;
  avg: number;
  pctAbove: number;
  stars: number;
  samples: number[];
  thresholds: number[];
  durationSec: number;
  att?: number; // average attention (Focus) while the signal was good
  med?: number; // average meditation (Calm)
  bands?: number[]; // average relative band power, % of total (delta … mid gamma)
};

const TICK = 250;
const STREAK_SEC = 6; // seconds above target to raise the multiplier
const MAX_MULT = 5;
const DROP_SEC = 2; // seconds below target before the streak resets
const ADAPT_SEC = 15;

type Acc = {
  score: number;
  sum: number;
  validTicks: number;
  aboveTicks: number;
  samples: number[];
  thresholds: number[];
  elapsed: number;
  attSum: number;
  medSum: number;
  bandSum: number[];
  bandN: number;
};

function resultOf(s: Acc): EngineResult {
  const pct = s.validTicks ? s.aboveTicks / s.validTicks : 0;
  const avgOf = (x: number) => (s.validTicks ? Math.round(x / s.validTicks) : 0);
  return {
    score: s.score,
    avg: avgOf(s.sum),
    pctAbove: Math.round(pct * 100),
    stars: starsFor(pct),
    samples: s.samples,
    thresholds: s.thresholds,
    durationSec: Math.round(s.elapsed),
    att: s.validTicks ? avgOf(s.attSum) : undefined,
    med: s.validTicks ? avgOf(s.medSum) : undefined,
    bands: s.bandN ? s.bandSum.map((b) => Math.round((b / s.bandN) * 10) / 10) : undefined,
  };
}

export const starsFor = (pct: number) => (pct >= 0.75 ? 3 : pct >= 0.5 ? 2 : pct >= 0.25 ? 1 : 0);

/**
 * Drives every activity: reads the live protocol value, scores time on target,
 * builds the streak multiplier and (optionally) adapts the target.
 */
export function useFocusEngine(opts: {
  protocol: Protocol;
  threshold: number;
  dynamic: boolean;
  durationSec: number;
  running: boolean;
  onLevelUp?: () => void;
  onFinish: (r: EngineResult) => void;
}) {
  const eeg = useEeg();
  const level = useSharedValue(0); // 0..1 visual intensity for the scene
  const st = useRef({
    elapsed: 0,
    score: 0,
    streak: 0,
    below: 0,
    mult: 1,
    threshold: opts.threshold,
    windowAbove: 0,
    windowTicks: 0,
    aboveTicks: 0,
    validTicks: 0,
    sum: 0,
    samples: [] as number[],
    thresholds: [] as number[],
    secAcc: 0,
    secN: 0,
    adapt: 0,
    done: false,
    attSum: 0,
    medSum: 0,
    bandSum: [0, 0, 0, 0, 0, 0, 0, 0],
    bandN: 0,
    bandsAt: 0,
  });
  const [snap, setSnap] = useState({ timeLeft: opts.durationSec, score: 0, mult: 1, streakPct: 0, threshold: opts.threshold, above: false, value: 0, signalOk: true });
  const cb = useRef(opts);
  cb.current = opts;
  const signalRef = useRef(eeg.signalOk);
  signalRef.current = eeg.signalOk;

  useEffect(() => {
    if (!opts.running) return;
    const id = setInterval(() => {
      const s = st.current;
      if (s.done) return;
      const o = cb.current;
      const live = eeg.live.current;
      const value = o.protocol === 'focus' ? live.attention : live.meditation;
      const ok = signalRef.current;
      const dt = TICK / 1000;
      // Like the original, the clock only runs while the headset is giving a usable signal.
      if (ok) s.elapsed += dt;

      const above = ok && value >= s.threshold;
      if (ok) {
        s.attSum += live.attention;
        s.medSum += live.meditation;
        if (live.bandsAt > s.bandsAt && live.bands.length === 8) {
          s.bandsAt = live.bandsAt;
          const total = live.bands.reduce((a, b) => a + b, 0);
          if (total > 0) {
            live.bands.forEach((b, i) => (s.bandSum[i] += (b / total) * 100));
            s.bandN++;
          }
        }
        s.validTicks++;
        s.sum += value;
        s.windowTicks++;
        if (above) {
          s.aboveTicks++;
          s.windowAbove++;
        }
      }
      if (above) {
        s.score += s.mult;
        s.below = 0;
        s.streak += dt;
        if (s.streak >= STREAK_SEC && s.mult < MAX_MULT) {
          s.mult++;
          s.streak = 0;
          o.onLevelUp?.();
        }
      } else if (ok) {
        s.below += dt;
        if (s.below >= DROP_SEC) {
          s.streak = 0;
          s.mult = 1;
        }
      }

      if (ok) s.adapt += dt;
      if (o.dynamic && s.adapt >= ADAPT_SEC && s.windowTicks > 0) {
        s.adapt = 0;
        const r = s.windowAbove / s.windowTicks;
        if (r > 0.7) s.threshold = Math.min(90, s.threshold + 5);
        else if (r < 0.3) s.threshold = Math.max(10, s.threshold - 5);
        s.windowAbove = 0;
        s.windowTicks = 0;
      }

      if (ok) {
        s.secAcc += value;
        s.secN++;
      }
      if (s.secN >= 1000 / TICK) {
        s.samples.push(Math.round(s.secAcc / s.secN));
        s.thresholds.push(s.threshold);
        s.secAcc = 0;
        s.secN = 0;
      }

      const target = !ok ? 0 : above ? 0.55 + 0.45 * Math.min(1, (value - s.threshold) / Math.max(10, 100 - s.threshold)) : 0.45 * (value / Math.max(1, s.threshold));
      level.value = withTiming(target, { duration: 450 });

      const timeLeft = Math.max(0, o.durationSec - s.elapsed);
      setSnap({
        timeLeft,
        score: s.score,
        mult: s.mult,
        streakPct: s.mult >= MAX_MULT ? 1 : s.streak / STREAK_SEC,
        threshold: s.threshold,
        above,
        value,
        signalOk: ok,
      });

      if (timeLeft <= 0) {
        s.done = true;
        o.onFinish(resultOf(s));
      }
    }, TICK);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.running]);

  /** End early (minigame "Stop") and report what was played so far. */
  const finishNow = () => {
    const s = st.current;
    if (s.done) return;
    s.done = true;
    cb.current.onFinish(resultOf(s));
  };

  return { ...snap, level, finishNow };
}
