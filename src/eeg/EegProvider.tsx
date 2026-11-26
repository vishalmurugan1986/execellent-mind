import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import {
  bluetoothSupported,
  EegSource,
  ensureBluetoothPermissions,
  listPairedDevices,
  SourceEvents,
  startBrainLink,
} from './sources';
import { BandPowers } from './thinkgear';

export type LinkStatus = 'unsupported' | 'idle' | 'connecting' | 'connected' | 'error';

export type Live = {
  attention: number;
  meditation: number;
  poorSignal: number;
  lastAt: number; // last eSense packet (attention/poor-signal)
  lastByteAt: number; // last data of any kind
  bands: number[]; // latest absolute band powers (8)
  bandsAt: number;
};

/** Measured once a second from the real data stream (proves the values come from the headset). */
export type Diag = { rawHz: number; esenseHz: number; bandsHz: number; totalRaw: number; lastDataAgoMs: number | null; connectedAt: number | null };

type Ctx = {
  status: LinkStatus;
  diag: Diag;
  error: string | null;
  deviceName: string | null;
  deviceAddress: string | null;
  attention: number;
  meditation: number;
  poorSignal: number;
  bands: number[]; // 8 values, 0..1, log-scaled relative to the strongest band
  signalOk: boolean;
  btSupported: boolean;
  live: React.MutableRefObject<Live>;
  raw: React.MutableRefObject<{ buf: Float32Array; idx: number }>;
  connectBrainLink: (address: string, name: string) => Promise<void>;
  reconnect: () => void;
  disconnect: () => Promise<void>;
};

const EegContext = createContext<Ctx | null>(null);
const KEY = 'em.eeg.device.v1';
const RAW_LEN = 1024;
const SILENT_MS = 8000; // no bytes for this long while "connected" = link is dead
const RETRY_MS = 5000;
const CONNECT_TIMEOUT_MS = 12000;

export function EegProvider({ children }: { children: React.ReactNode }) {
  const btSupported = bluetoothSupported();
  const [status, setStatus] = useState<LinkStatus>(btSupported ? 'idle' : 'unsupported');
  const [error, setError] = useState<string | null>(null);
  const [device, setDevice] = useState<{ name: string; address: string } | null>(null);
  const [attention, setAttention] = useState(0);
  const [meditation, setMeditation] = useState(0);
  const [poorSignal, setPoorSignal] = useState(200);
  const [bands, setBands] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0]);
  const [, setTick] = useState(0);
  const counts = useRef({ raw: 0, esense: 0, bands: 0, totalRaw: 0, connectedAt: null as number | null });
  const [diag, setDiag] = useState<Diag>({ rawHz: 0, esenseHz: 0, bandsHz: 0, totalRaw: 0, lastDataAgoMs: null, connectedAt: null });

  const active = useRef<EegSource | null>(null);
  const deviceRef = useRef<{ name: string; address: string } | null>(null);
  const statusRef = useRef<LinkStatus>(status);
  statusRef.current = status;
  const busy = useRef(false);
  const userStopped = useRef(false);
  const live = useRef<Live>({ attention: 0, meditation: 0, poorSignal: 200, lastAt: 0, lastByteAt: 0, bands: [], bandsAt: 0 });
  const raw = useRef({ buf: new Float32Array(RAW_LEN), idx: 0 });

  const markLost = useCallback((why: string) => {
    setStatus('error');
    setError(why);
    live.current.poorSignal = 200;
    live.current.attention = 0;
    live.current.meditation = 0;
    raw.current.buf.fill(0);
    setPoorSignal(200);
  }, []);

  const events = useMemo<SourceEvents>(
    () => ({
      onRaw: (v) => {
        const r = raw.current;
        r.buf[r.idx] = v;
        r.idx = (r.idx + 1) % RAW_LEN;
        counts.current.raw++;
        counts.current.totalRaw++;
        live.current.lastByteAt = Date.now();
      },
      onPoorSignal: (v) => {
        counts.current.esense++;
        live.current.poorSignal = v;
        live.current.lastAt = live.current.lastByteAt = Date.now();
        setPoorSignal(v);
      },
      onAttention: (v) => {
        live.current.attention = v;
        live.current.lastAt = Date.now();
        setAttention(v);
      },
      onMeditation: (v) => {
        live.current.meditation = v;
        setMeditation(v);
      },
      onBands: (b: BandPowers) => {
        live.current.bands = Array.from(b);
        counts.current.bands++;
        live.current.bandsAt = Date.now();
        const logs = b.map((x) => Math.max(0, Math.log10(Math.max(x, 1)) - 2));
        const top = Math.max(1, ...logs);
        setBands(logs.map((l) => Math.max(0.04, Math.min(1, l / top))));
      },
      onDisconnected: () => markLost('lost'),
    }),
    [markLost],
  );

  const stopActive = useCallback(async () => {
    const a = active.current;
    active.current = null;
    if (a) await a.stop().catch(() => {});
  }, []);

  const connectBrainLink = useCallback(
    async (address: string, name: string) => {
      if (!btSupported || busy.current) return;
      busy.current = true;
      userStopped.current = false;
      await stopActive();
      const d = { address, name };
      deviceRef.current = d;
      setDevice(d);
      setStatus('connecting');
      setError(null);
      live.current.poorSignal = 200;
      live.current.lastByteAt = Date.now();
      setPoorSignal(200);
      AsyncStorage.setItem(KEY, JSON.stringify(d)).catch(() => {});
      try {
        if (!(await ensureBluetoothPermissions())) throw new Error('permission');
        // A powered-off headset can leave the RFCOMM connect hanging; give up after a while and retry.
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timeout = new Promise<never>((_, rej) => {
          timer = setTimeout(() => rej(new Error('timeout')), CONNECT_TIMEOUT_MS);
        });
        const attempt = startBrainLink(address, events);
        try {
          active.current = await Promise.race([attempt, timeout]);
        } catch (e) {
          // If the slow attempt succeeds later, close it so it doesn't hold the headset.
          attempt.then((src) => src.stop()).catch(() => {});
          throw e;
        } finally {
          clearTimeout(timer);
        }
        live.current.lastByteAt = Date.now();
        counts.current.connectedAt = Date.now();
        setStatus('connected');
      } catch (e: any) {
        markLost(String(e?.message ?? e));
      } finally {
        busy.current = false;
      }
    },
    [btSupported, events, markLost, stopActive],
  );

  const reconnect = useCallback(() => {
    const d = deviceRef.current;
    if (d) connectBrainLink(d.address, d.name);
  }, [connectBrainLink]);

  const disconnect = useCallback(async () => {
    userStopped.current = true;
    await stopActive();
    setStatus('idle');
    live.current.poorSignal = 200;
    setPoorSignal(200);
    setAttention(0);
    setMeditation(0);
  }, [stopActive]);

  // On launch: reconnect to the last headset, or pick the paired BrainLink automatically.
  useEffect(() => {
    if (!btSupported) return;
    (async () => {
      let saved: { address: string; name: string } | null = null;
      try {
        saved = JSON.parse((await AsyncStorage.getItem(KEY)) ?? 'null');
      } catch {}
      if (!saved) {
        try {
          if (await ensureBluetoothPermissions()) {
            const found = (await listPairedDevices()).find((d) => /brain/i.test(d.name));
            if (found) saved = found;
          }
        } catch {}
      }
      if (saved) connectBrainLink(saved.address, saved.name);
    })();
    return () => {
      stopActive();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Watchdog: tick UI once a second, detect a silent link, and retry while disconnected.
  useEffect(() => {
    if (!btSupported) return;
    let lastTry = 0;
    const id = setInterval(() => {
      setTick((t) => t + 1);
      const now = Date.now();
      const c = counts.current;
      const connected = statusRef.current === 'connected';
      setDiag({
        rawHz: c.raw,
        esenseHz: c.esense,
        bandsHz: c.bands,
        totalRaw: c.totalRaw,
        lastDataAgoMs: live.current.lastByteAt && connected ? now - live.current.lastByteAt : null,
        connectedAt: connected ? c.connectedAt : null,
      });
      c.raw = 0;
      c.esense = 0;
      c.bands = 0;
      const st = statusRef.current;
      if (st === 'connected' && now - live.current.lastByteAt > SILENT_MS) {
        stopActive();
        markLost('silent');
      } else if (st === 'error' && !userStopped.current && deviceRef.current && !busy.current && now - lastTry > RETRY_MS) {
        lastTry = now;
        reconnect();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [btSupported, markLost, reconnect, stopActive]);

  // Coming back to the app: make sure the link is still alive.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && statusRef.current !== 'connected' && deviceRef.current && !userStopped.current) reconnect();
    });
    return () => sub.remove();
  }, [reconnect]);

  const fresh = Date.now() - live.current.lastAt < 3500;
  const signalOk = status === 'connected' && fresh && poorSignal < 51;

  const value: Ctx = {
    status,
    diag,
    error,
    deviceName: device?.name ?? null,
    deviceAddress: device?.address ?? null,
    attention: fresh && status === 'connected' ? attention : 0,
    meditation: fresh && status === 'connected' ? meditation : 0,
    poorSignal: fresh && status === 'connected' ? poorSignal : 200,
    bands: status === 'connected' ? bands : [0, 0, 0, 0, 0, 0, 0, 0],
    signalOk,
    btSupported,
    live,
    raw,
    connectBrainLink,
    reconnect,
    disconnect,
  };

  return <EegContext.Provider value={value}>{children}</EegContext.Provider>;
}

export function useEeg() {
  const c = useContext(EegContext);
  if (!c) throw new Error('useEeg outside EegProvider');
  return c;
}

/** Signal quality 0..3 bars from ThinkGear poor-signal (0 best, 200 off head). */
export const signalBars = (poor: number) => (poor >= 200 ? 0 : poor > 80 ? 1 : poor > 25 ? 2 : 3);
