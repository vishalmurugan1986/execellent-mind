import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { ActivityRecord, useApp, User } from '@/store/AppStore';

/**
 * Sends every child's brainwave results from this tablet to the school dashboard (web).
 * The server upserts by activity id, so retries are safe; only unsent activities are uploaded.
 */

export type SyncConfig = { url: string; key: string; deviceName: string };
export type SyncState = 'off' | 'idle' | 'syncing' | 'ok' | 'error';

type Ctx = {
  config: SyncConfig;
  setConfig: (c: SyncConfig) => Promise<void>;
  state: SyncState;
  lastAt: number | null;
  pending: number;
  error: string | null;
  school: string | null;
  syncNow: () => Promise<boolean>;
  test: (c: SyncConfig) => Promise<{ ok: boolean; school?: string; error?: string }>;
};

const K = { config: 'em.sync.config.v1', sent: 'em.sync.sent.v1', device: 'em.sync.device.v1', last: 'em.sync.last.v1' };
const EVERY_MS = 60_000;
const SyncContext = createContext<Ctx | null>(null);

const clean = (url: string) => url.trim().replace(/\/+$/, '');

/** Only what the dashboard needs: no raw per-second samples. */
const slim = (a: ActivityRecord) => ({
  id: a.id,
  at: a.at,
  game: a.game,
  protocol: a.protocol,
  score: a.score,
  avg: a.avg,
  att: a.att ?? null,
  med: a.med ?? null,
  pctAbove: a.pctAbove,
  stars: a.stars,
  durationSec: a.durationSec,
  bands: a.bands ?? null,
});

const childInfo = (u: User) => ({
  id: u.uid ?? u.email,
  firstName: u.firstName,
  lastName: u.lastName,
  birthday: u.birthday,
  gender: u.gender,
  studentId: u.studentId ?? '',
  className: u.className ?? '',
});

async function call(url: string, key: string, path: string, body?: unknown) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15000);
  try {
    const res = await fetch(`${clean(url)}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'content-type': 'application/json', 'x-school-key': key.trim() },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctl.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
    return json;
  } finally {
    clearTimeout(timer);
  }
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { loadChildren, data, ready } = useApp();
  const [config, setConfigState] = useState<SyncConfig>({ url: '', key: '', deviceName: '' });
  const [state, setState] = useState<SyncState>('off');
  const [lastAt, setLastAt] = useState<number | null>(null);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [school, setSchool] = useState<string | null>(null);
  const sent = useRef<Set<string>>(new Set());
  const deviceId = useRef<string>('');
  const busy = useRef(false);
  const cfgRef = useRef(config);
  cfgRef.current = config;

  const countPending = useCallback(async () => {
    const list = await loadChildren();
    const n = list
      .filter((c) => (c.user as { role?: string }).role !== 'incharge')
      .reduce((s, c) => s + c.data.activities.filter((a) => !sent.current.has(a.id)).length, 0);
    setPending(n);
    return { list, n };
  }, [loadChildren]);

  const syncNow = useCallback(async () => {
    const cfg = cfgRef.current;
    if (!cfg.url || !cfg.key || busy.current) return false;
    busy.current = true;
    setState('syncing');
    try {
      const { list } = await countPending();
      const children = list
        .filter((c) => (c.user as { role?: string }).role !== 'incharge')
        .map((c) => ({
        ...childInfo(c.user),
        activities: c.data.activities.filter((a) => !sent.current.has(a.id)).map(slim),
      }));
      const res = await call(cfg.url, cfg.key, '/api/sync', { device: { id: deviceId.current, name: cfg.deviceName || 'Tablet' }, children });
      children.forEach((c) => c.activities.forEach((a) => sent.current.add(a.id)));
      await AsyncStorage.setItem(K.sent, JSON.stringify([...sent.current]));
      const now = Date.now();
      await AsyncStorage.setItem(K.last, String(now));
      setLastAt(now);
      setSchool(res?.school ?? null);
      setError(null);
      setPending(0);
      setState('ok');
      return true;
    } catch (e: any) {
      setError(e?.name === 'AbortError' ? 'timeout' : String(e?.message ?? e));
      setState('error');
      return false;
    } finally {
      busy.current = false;
    }
  }, [countPending]);

  // Load settings once the app store is ready.
  useEffect(() => {
    if (!ready) return;
    (async () => {
      try {
        const c = JSON.parse((await AsyncStorage.getItem(K.config)) ?? 'null');
        if (c) {
          setConfigState(c);
          cfgRef.current = c;
        }
        sent.current = new Set(JSON.parse((await AsyncStorage.getItem(K.sent)) ?? '[]'));
        let id = await AsyncStorage.getItem(K.device);
        if (!id) {
          id = Crypto.randomUUID();
          await AsyncStorage.setItem(K.device, id);
        }
        deviceId.current = id;
        const last = Number(await AsyncStorage.getItem(K.last));
        if (last) setLastAt(last);
        setState(c?.url && c?.key ? 'idle' : 'off');
        await countPending();
        if (c?.url && c?.key) syncNow();
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // A new activity was saved: send it shortly after.
  useEffect(() => {
    if (!ready) return;
    countPending();
    const id = setTimeout(() => cfgRef.current.url && cfgRef.current.key && syncNow(), 3000);
    return () => clearTimeout(id);
  }, [data.activities.length, ready, countPending, syncNow]);

  // Retry in the background and when the app comes back to the foreground.
  useEffect(() => {
    const id = setInterval(() => {
      if (cfgRef.current.url && cfgRef.current.key) countPending().then(({ n }) => n > 0 && syncNow());
    }, EVERY_MS);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && cfgRef.current.url && syncNow());
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [countPending, syncNow]);

  const setConfig = useCallback(
    async (c: SyncConfig) => {
      const next = { url: clean(c.url), key: c.key.trim(), deviceName: c.deviceName.trim() };
      setConfigState(next);
      cfgRef.current = next;
      await AsyncStorage.setItem(K.config, JSON.stringify(next));
      setState(next.url && next.key ? 'idle' : 'off');
    },
    [],
  );

  const test = useCallback(async (c: SyncConfig) => {
    try {
      const res = await call(c.url, c.key, '/api/ping');
      return { ok: true, school: res?.school as string | undefined };
    } catch (e: any) {
      return { ok: false, error: e?.name === 'AbortError' ? 'timeout' : String(e?.message ?? e) };
    }
  }, []);

  return (
    <SyncContext.Provider value={{ config, setConfig, state, lastAt, pending, error, school, syncNow, test }}>{children}</SyncContext.Provider>
  );
}

export function useSync() {
  const c = useContext(SyncContext);
  if (!c) throw new Error('useSync outside SyncProvider');
  return c;
}
