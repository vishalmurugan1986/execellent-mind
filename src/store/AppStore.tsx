import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import type { Protocol } from '@/constants/theme';
import { ACTIVITIES_PER_SESSION, GameId, JOURNEY } from '@/content';
import type { Lang } from '@/i18n/strings';

/* ---------------- types ---------------- */

export type Settings = {
  lang: Lang;
  master: number;
  effects: number;
  music: number;
  reward: 'chime' | 'pulse' | 'drop';
  ambience: 'none' | 'rain' | 'breeze' | 'ocean' | 'night';
  dockHidden: boolean;
};

export type User = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  birthday: string; // YYYY-MM-DD
  gender: 'male' | 'female' | 'other' | '';
  country: string;
  salt: string;
  hash: string;
  createdAt: number;
  memberUntil: number;
  /** Stable id used by the school dashboard (same child on every sync). */
  uid?: string;
  /** Optional school details shown on the dashboard. */
  studentId?: string;
  className?: string;
};

export type ProfilePatch = Partial<Pick<User, 'firstName' | 'lastName' | 'birthday' | 'gender' | 'studentId' | 'className'>>;

export type ActivityRecord = {
  id: string;
  at: number;
  game: GameId | 'video';
  protocol: Protocol;
  score: number;
  avg: number;
  pctAbove: number;
  stars: number;
  durationSec: number;
  samples: number[];
  thresholds: number[];
  att?: number; // average Focus during the activity
  med?: number; // average Calm during the activity
  bands?: number[]; // average relative band power (%), delta … mid gamma
  notes?: string;
  session?: { stageId: string; n: number; slot: number };
};

export type SessionRecord = {
  at: number;
  stageId: string;
  n: number;
  protocol: Protocol;
  avg: number;
  avgScore: number;
};

export type SurveyRecord = { at: number; answers: (number | null)[]; score: number; answered: number };

export type UserData = {
  activities: ActivityRecord[];
  sessions: SessionRecord[];
  surveys: SurveyRecord[];
};

export type ActiveSession = {
  protocol: Protocol;
  stageId: string;
  n: number;
  slot: number; // 0-based index of the activity being played
  results: ActivityRecord[];
  threshold: number;
};

const DEFAULT_SETTINGS: Settings = {
  lang: 'en',
  master: 0.7,
  effects: 0.6,
  music: 0.4,
  reward: 'chime',
  ambience: 'rain',
  dockHidden: false,
};

const EMPTY: UserData = { activities: [], sessions: [], surveys: [] };

const K = {
  settings: 'em.settings.v1',
  users: 'em.users.v1',
  current: 'em.current.v1',
  data: (email: string) => `em.data.v1.${email}`,
};

/* ---------------- helpers ---------------- */

const norm = (e: string) => e.trim().toLowerCase();

async function hashPw(pw: string, salt: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pw}`);
}

async function load<T>(key: string, fallback: T): Promise<T> {
  try {
    const v = await AsyncStorage.getItem(key);
    return v ? { ...fallback, ...JSON.parse(v) } : fallback;
  } catch {
    return fallback;
  }
}

/* ---------------- context ---------------- */

type SignUp = Omit<User, 'salt' | 'hash' | 'createdAt' | 'memberUntil'> & { password: string };

type Ctx = {
  ready: boolean;
  settings: Settings;
  setSettings: (p: Partial<Settings>) => void;
  user: User | null;
  data: UserData;
  signUp: (u: SignUp) => Promise<'ok' | 'exists'>;
  signIn: (email: string, pw: string, remember: boolean) => Promise<boolean>;
  resetPassword: (email: string, birthday: string, pw: string) => Promise<boolean>;
  signOut: () => void;
  updateUser: (p: ProfilePatch) => Promise<void>;
  addActivity: (a: ActivityRecord) => void;
  updateNotes: (id: string, notes: string) => void;
  addSurvey: (s: SurveyRecord) => void;
  completedIn: (stageId: string) => number;
  stageUnlocked: (stageId: string) => boolean;
  bestScore: (game: string, protocol: Protocol) => number;
  active: ActiveSession | null;
  startSession: (protocol: Protocol, stageId: string, n: number) => void;
  sessionActivityDone: (a: ActivityRecord) => 'next' | 'complete';
  resetSession: () => void;
  endSession: () => void;
  loadChildren: () => Promise<{ user: User; data: UserData }[]>;
};

const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<UserData>(EMPTY);
  const [active, setActive] = useState<ActiveSession | null>(null);
  const usersRef = useRef<Record<string, User>>({});

  useEffect(() => {
    (async () => {
      const s = await load(K.settings, DEFAULT_SETTINGS);
      setSettingsState(s);
      usersRef.current = await load<Record<string, User>>(K.users, {});
      // Older profiles get a stable id for the school dashboard.
      let changed = false;
      for (const u of Object.values(usersRef.current)) {
        if (!u.uid) {
          u.uid = Crypto.randomUUID();
          changed = true;
        }
      }
      if (changed) await AsyncStorage.setItem(K.users, JSON.stringify(usersRef.current)).catch(() => {});
      const cur = await AsyncStorage.getItem(K.current).catch(() => null);
      if (cur && usersRef.current[cur]) {
        setUser(usersRef.current[cur]);
        setData(await load(K.data(cur), EMPTY));
      }
      setReady(true);
    })();
  }, []);

  const setSettings = useCallback((p: Partial<Settings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...p };
      AsyncStorage.setItem(K.settings, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const saveUsers = () => AsyncStorage.setItem(K.users, JSON.stringify(usersRef.current)).catch(() => {});

  const persistData = useCallback(
    (fn: (d: UserData) => UserData) => {
      setData((prev) => {
        const next = fn(prev);
        if (user) AsyncStorage.setItem(K.data(user.email), JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [user],
  );

  const signUp = useCallback(async (u: SignUp) => {
    const email = norm(u.email);
    if (usersRef.current[email]) return 'exists';
    const salt = Crypto.randomUUID();
    const now = Date.now();
    const { password, ...rest } = u;
    const rec: User = {
      ...rest,
      email,
      uid: Crypto.randomUUID(),
      salt,
      hash: await hashPw(password, salt),
      createdAt: now,
      memberUntil: now + 365 * 24 * 3600 * 1000,
    };
    usersRef.current[email] = rec;
    await saveUsers();
    await AsyncStorage.setItem(K.current, email);
    setUser(rec);
    setData(EMPTY);
    return 'ok';
  }, []);

  const signIn = useCallback(async (emailIn: string, pw: string, remember: boolean) => {
    const email = norm(emailIn);
    const u = usersRef.current[email];
    if (!u || (await hashPw(pw, u.salt)) !== u.hash) return false;
    if (remember) await AsyncStorage.setItem(K.current, email);
    else await AsyncStorage.removeItem(K.current);
    setUser(u);
    setData(await load(K.data(email), EMPTY));
    return true;
  }, []);

  const resetPassword = useCallback(async (emailIn: string, birthday: string, pw: string) => {
    const u = usersRef.current[norm(emailIn)];
    if (!u || u.birthday !== birthday) return false;
    u.salt = Crypto.randomUUID();
    u.hash = await hashPw(pw, u.salt);
    await saveUsers();
    return true;
  }, []);

  const signOut = useCallback(() => {
    AsyncStorage.removeItem(K.current).catch(() => {});
    setUser(null);
    setData(EMPTY);
    setActive(null);
  }, []);

  const updateUser = useCallback(
    async (p: ProfilePatch) => {
      if (!user) return;
      const next = { ...usersRef.current[user.email], ...p };
      usersRef.current[user.email] = next;
      await saveUsers();
      setUser(next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user],
  );

  const addActivity = useCallback(
    (a: ActivityRecord) => persistData((d) => ({ ...d, activities: [a, ...d.activities].slice(0, 500) })),
    [persistData],
  );

  const updateNotes = useCallback(
    (id: string, notes: string) =>
      persistData((d) => ({ ...d, activities: d.activities.map((a) => (a.id === id ? { ...a, notes } : a)) })),
    [persistData],
  );

  const addSurvey = useCallback((s: SurveyRecord) => persistData((d) => ({ ...d, surveys: [...d.surveys, s] })), [persistData]);

  const completedIn = useCallback(
    (stageId: string) => new Set(data.sessions.filter((s) => s.stageId === stageId).map((s) => s.n)).size,
    [data.sessions],
  );

  const stageUnlocked = useCallback(
    (stageId: string) => {
      const idx = JOURNEY.stages.findIndex((s) => s.id === stageId);
      if (idx <= 0) return true;
      const prev = JOURNEY.stages[idx - 1];
      return completedIn(prev.id) >= prev.sessions;
    },
    [completedIn],
  );

  const bestScore = useCallback(
    (game: string, protocol: Protocol) =>
      data.activities.filter((a) => a.game === game && a.protocol === protocol).reduce((m, a) => Math.max(m, a.score), 0),
    [data.activities],
  );

  const startSession = useCallback((protocol: Protocol, stageId: string, n: number) => {
    setActive({ protocol, stageId, n, slot: 0, results: [], threshold: 30 });
  }, []);

  const sessionActivityDone = useCallback(
    (a: ActivityRecord) => {
      const cur = active;
      if (!cur) return 'next' as const;
      const results = [...cur.results, a];
      const lastThreshold = a.thresholds.length ? a.thresholds[a.thresholds.length - 1] : cur.threshold;
      if (results.length >= ACTIVITIES_PER_SESSION) {
        const rec: SessionRecord = {
          at: Date.now(),
          stageId: cur.stageId,
          n: cur.n,
          protocol: cur.protocol,
          avg: Math.round(results.reduce((s, r) => s + r.avg, 0) / results.length),
          avgScore: Math.round(results.reduce((s, r) => s + r.score, 0) / results.length),
        };
        persistData((d) => ({ ...d, sessions: [...d.sessions, rec] }));
        setActive(null);
        return 'complete' as const;
      }
      setActive({ ...cur, results, slot: results.length, threshold: lastThreshold });
      return 'next' as const;
    },
    [active, persistData],
  );

  const resetSession = useCallback(() => setActive((a) => (a ? { ...a, slot: 0, results: [] } : a)), []);
  const endSession = useCallback(() => setActive(null), []);

  /** Every profile on this tablet with its saved data (the signed-in one comes from memory). */
  const loadChildren = useCallback(async () => {
    const users = Object.values(usersRef.current).sort((a, b) => a.createdAt - b.createdAt);
    return Promise.all(users.map(async (u) => ({ user: u, data: user && u.email === user.email ? data : await load(K.data(u.email), EMPTY) })));
  }, [user, data]);

  return (
    <AppContext.Provider
      value={{
        ready,
        settings,
        setSettings,
        user,
        data,
        signUp,
        signIn,
        resetPassword,
        signOut,
        updateUser,
        addActivity,
        updateNotes,
        addSurvey,
        completedIn,
        stageUnlocked,
        bestScore,
        active,
        startSession,
        sessionActivityDone,
        resetSession,
        endSession,
        loadChildren,
      }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const c = useContext(AppContext);
  if (!c) throw new Error('useApp outside AppProvider');
  return c;
}
