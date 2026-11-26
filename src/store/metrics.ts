import type { ActivityRecord } from './AppStore';

/** Brainwave families built from the eight ThinkGear bands (delta, theta, low/high alpha, low/high beta, low/mid gamma). */
export const BAND_GROUPS = [
  { key: 'delta', idx: [0], color: '#7C83FF' },
  { key: 'theta', idx: [1], color: '#B48BFF' },
  { key: 'alpha', idx: [2, 3], color: '#0BA59A' },
  { key: 'beta', idx: [4, 5], color: '#FF9F1C' },
  { key: 'gamma', idx: [6, 7], color: '#F2456B' },
] as const;

export type MetricKey = 'focus' | 'calm' | 'tbr' | 'delta' | 'theta' | 'alpha' | 'beta' | 'gamma';
export type Metrics = Record<MetricKey, number | null>;

/** Focus/Calm averages and brainwave shares for one activity (null when not recorded). */
export function activityMetrics(a: ActivityRecord): Metrics {
  const focus = a.att ?? (a.protocol === 'focus' ? a.avg : null);
  const calm = a.med ?? (a.protocol === 'calm' ? a.avg : null);
  const m: Metrics = { focus, calm, tbr: null, delta: null, theta: null, alpha: null, beta: null, gamma: null };
  if (a.bands && a.bands.length === 8) {
    for (const g of BAND_GROUPS) m[g.key] = (g.idx as readonly number[]).reduce((s: number, i) => s + a.bands![i], 0);
    if (m.beta && m.beta > 0) m.tbr = Math.round(((m.theta ?? 0) / m.beta) * 100) / 100;
  }
  return m;
}

const mean = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x != null && Number.isFinite(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

export type ChildSummary = {
  count: number;
  first: Metrics; // mean of the first few activities
  latest: Metrics; // mean of the most recent few
  series: Metrics[]; // chronological, one per activity
  minutes: number;
  lastAt: number | null;
  /** True once there are enough activities for first and latest to be different rounds. */
  hasTrend: boolean;
};

/** Compares the first `n` activities with the latest `n` (activities may be stored newest first). */
export function summarize(activities: ActivityRecord[], maxN = 3): ChildSummary {
  // Rounds stopped before the headset gave any usable signal carry no measurement.
  const all = [...activities].sort((a, b) => a.at - b.at);
  const chrono = all.filter((a) => a.durationSec >= 5);
  const series = chrono.map(activityMetrics);
  // Never let the 'first' and 'latest' windows overlap.
  const n = Math.max(1, Math.min(maxN, Math.floor(chrono.length / 2)));
  const keys: MetricKey[] = ['focus', 'calm', 'tbr', 'delta', 'theta', 'alpha', 'beta', 'gamma'];
  const pick = (from: 'start' | 'end') => {
    const out = {} as Metrics;
    for (const k of keys) {
      const vals = series.map((s) => s[k]).filter((x) => x != null);
      const part = from === 'start' ? vals.slice(0, n) : vals.slice(-n);
      const m = mean(part);
      out[k] = m == null ? null : Math.round(m * (k === 'tbr' ? 100 : 10)) / (k === 'tbr' ? 100 : 10);
    }
    return out;
  };
  return {
    count: chrono.length,
    first: pick('start'),
    latest: pick('end'),
    series,
    minutes: Math.round(all.reduce((s, a) => s + a.durationSec, 0) / 60),
    lastAt: all.length ? all[all.length - 1].at : null,
    hasTrend: chrono.length >= 2,
  };
}

/** Is a change in this metric an improvement? (null = neutral, just different) */
export const better = (k: MetricKey, delta: number): boolean | null => {
  if (Math.abs(delta) < (k === 'tbr' ? 0.05 : 1)) return null;
  if (k === 'focus' || k === 'calm') return delta > 0;
  if (k === 'tbr') return delta < 0;
  return null;
};

