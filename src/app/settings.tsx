import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, View } from 'react-native';

import { useSound } from '@/audio/AudioProvider';
import { Icon, IconName } from '@/components/Icon';
import { LogoMark } from '@/components/Logo';
import { Screen } from '@/components/Screen';
import { Body, Button, Card, Chip, Field, H1, H2, IconButton, Slider, Txt } from '@/components/ui';
import { SignalBars } from '@/components/viz';
import { BRAND } from '@/constants/brand';
import { C, F, R } from '@/constants/theme';
import { signalBars, useEeg } from '@/eeg/EegProvider';
import { ensureBluetoothPermissions, listPairedDevices, PairedDevice } from '@/eeg/sources';
import { useT } from '@/i18n';
import { LANGS } from '@/i18n/strings';
import { Settings as S, useApp } from '@/store/AppStore';
import { useSync } from '@/sync/SyncProvider';

type Tab = 'audio' | 'language' | 'headset' | 'school' | 'about';

function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={{ gap: 14, paddingVertical: 22, borderTopWidth: 1, borderTopColor: C.line }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Txt style={{ fontFamily: F.bold, fontSize: 18 }}>{title}</Txt>
        {right}
      </View>
      {children}
    </View>
  );
}

function AudioTab() {
  const { t } = useT();
  const { settings, setSettings } = useApp();
  const snd = useSound();
  const row = (label: string, key: 'master' | 'effects' | 'music') => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}>
      <Txt style={{ width: 120, color: C.textDim }}>{label}</Txt>
      <View style={{ flex: 1 }}>
        <Slider value={settings[key]} onChange={(v) => setSettings({ [key]: v } as any)} />
      </View>
      <Txt style={{ width: 56, textAlign: 'right', fontFamily: F.bold }}>{Math.round(settings[key] * 100)}%</Txt>
    </View>
  );
  const rewards: S['reward'][] = ['chime', 'pulse', 'drop'];
  const ambs: S['ambience'][] = ['none', 'rain', 'breeze', 'ocean', 'night'];
  const ambLabel: Record<S['ambience'], string> = { none: t('none'), rain: 'Rain', breeze: 'Breeze', ocean: 'Ocean', night: 'Night' };
  return (
    <>
      <Section title={t('volume')}>
        {row(t('master'), 'master')}
        {row(t('effects'), 'effects')}
        {row(t('music'), 'music')}
      </Section>
      <Section title={t('rewardSound')} right={<IconButton name="play" size={44} onPress={() => snd.previewReward(settings.reward)} tint={C.focus} />}>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          {rewards.map((r) => (
            <Chip key={r} label={r[0].toUpperCase() + r.slice(1)} selected={settings.reward === r} onPress={() => (setSettings({ reward: r }), snd.previewReward(r))} />
          ))}
        </View>
      </Section>
      <Section title={t('ambience')} right={<IconButton name="play" size={44} onPress={() => snd.previewAmbience(settings.ambience)} tint={C.calm} />}>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          {ambs.map((a) => (
            <Chip key={a} label={ambLabel[a]} accent={C.calm} selected={settings.ambience === a} onPress={() => (setSettings({ ambience: a }), snd.previewAmbience(a))} />
          ))}
        </View>
      </Section>
    </>
  );
}

function LanguageTab() {
  const { settings, setSettings } = useApp();
  return (
    <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap', paddingTop: 22, borderTopWidth: 1, borderTopColor: C.line }}>
      {LANGS.map((l) => {
        const on = settings.lang === l.id;
        return (
          <Pressable
            key={l.id}
            onPress={() => setSettings({ lang: l.id })}
            style={{
              width: 240,
              height: 72,
              borderRadius: R.lg,
              borderWidth: 1.5,
              borderColor: on ? C.focus : C.line,
              backgroundColor: on ? C.focus + '18' : 'transparent',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 22,
            }}>
            <Txt style={{ fontFamily: F.bold, fontSize: 19, color: on ? C.focus : C.text }}>{l.label}</Txt>
            <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: on ? C.focus : C.line, alignItems: 'center', justifyContent: 'center' }}>
              {on && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: C.focus }} />}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function HeadsetTab() {
  const { t } = useT();
  const eeg = useEeg();
  const [devices, setDevices] = useState<PairedDevice[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = async () => {
    setErr(null);
    setBusy(true);
    try {
      if (!(await ensureBluetoothPermissions())) throw new Error('perm');
      const list = await listPairedDevices();
      list.sort((a, b) => Number(/brain/i.test(b.name)) - Number(/brain/i.test(a.name)));
      setDevices(list);
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    }
    setBusy(false);
  };

  useEffect(() => {
    if (eeg.btSupported) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusColor = eeg.status === 'connected' ? (eeg.signalOk ? C.good : C.warn) : eeg.status === 'connecting' ? C.warn : C.coral;
  const statusText =
    eeg.status === 'unsupported'
      ? t('disconnected')
      : eeg.status === 'connected'
        ? eeg.signalOk
          ? t('connected')
          : t('noContact')
        : eeg.status === 'connecting'
          ? t('connecting')
          : eeg.status === 'error'
            ? t('reconnecting')
            : t('disconnected');

  return (
    <>
      <Section title={t('signalSource')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, padding: 20, borderRadius: R.lg, borderWidth: 1.5, borderColor: statusColor, backgroundColor: statusColor + '12' }}>
          <Icon name="headset" color={statusColor} size={30} />
          <View style={{ flex: 1, gap: 4 }}>
            <Txt style={{ fontFamily: F.bold, fontSize: 19 }}>{eeg.deviceName ?? t('sourceBl')}</Txt>
            <Txt style={{ color: statusColor, fontFamily: F.semibold }}>{statusText}</Txt>
            {eeg.status === 'connected' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 }}>
                <Txt style={{ color: C.textDim, fontSize: 14 }}>{t('signal')}</Txt>
                <SignalBars level={signalBars(eeg.poorSignal)} />
              </View>
            )}
          </View>
          {eeg.deviceAddress && eeg.status !== 'unsupported' && (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {eeg.status === 'connected' ? (
                <Button small kind="ghost" title={t('disconnect')} onPress={eeg.disconnect} />
              ) : (
                <Button small kind="calm" title={t('connect')} icon="refresh" onPress={eeg.reconnect} loading={eeg.status === 'connecting'} />
              )}
            </View>
          )}
        </View>
        {eeg.status === 'connected' && !eeg.signalOk && <Body style={{ fontSize: 15 }}>{t('contactHint')}</Body>}
      </Section>

      <Section title={t('sensorCheck')}>
        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
          {(
            [
              [String(eeg.diag.rawHz), t('diagRaw'), eeg.diag.rawHz > 400 ? C.good : C.coral],
              [String(eeg.diag.esenseHz), t('diagEsense'), eeg.diag.esenseHz > 0 ? C.good : C.coral],
              [String(eeg.diag.bandsHz), t('diagBands'), eeg.diag.bandsHz > 0 ? C.good : C.coral],
              [eeg.status === 'connected' ? String(eeg.poorSignal) : '–', t('diagPoor'), eeg.poorSignal < 51 ? C.good : C.warn],
              [eeg.diag.lastDataAgoMs == null ? '–' : `${(eeg.diag.lastDataAgoMs / 1000).toFixed(1)} s`, t('diagLast'), C.text],
              [eeg.diag.totalRaw.toLocaleString(), t('diagTotal'), C.text],
            ] as const
          ).map(([v, l, tone]) => (
            <View key={l} style={{ flex: 1, minWidth: 150, backgroundColor: C.bgDeep, borderRadius: R.lg, padding: 14 }}>
              <Txt style={{ fontFamily: F.black, fontSize: 24, color: tone }}>{v}</Txt>
              <Txt style={{ color: C.textDim, fontSize: 13 }}>{l}</Txt>
            </View>
          ))}
        </View>
        <Txt style={{ color: C.textDim, fontSize: 14 }}>
          {eeg.deviceAddress ? `${eeg.deviceName ?? ''} · ${eeg.deviceAddress} · Bluetooth SPP · ThinkGear` : t('sourceBl')}
        </Txt>
        <Body style={{ fontSize: 14 }}>{t('diagHint')}</Body>
      </Section>

      <Section title={t('pairedDevices')} right={eeg.btSupported ? <Button small kind="ghost" title={t('refresh')} icon="refresh" onPress={refresh} /> : undefined}>
        {!eeg.btSupported ? (
          <View style={{ backgroundColor: C.sunSoft, borderRadius: R.md, padding: 18 }}>
            <Body style={{ color: C.text }}>{t('btNeedsBuild')}</Body>
          </View>
        ) : busy ? (
          <ActivityIndicator color={C.calm} />
        ) : (
          <View style={{ gap: 10 }}>
            {err && <Txt style={{ color: C.coral }}>{t('connError')}</Txt>}
            {devices?.map((d) => {
              const on = eeg.deviceAddress === d.address && eeg.status !== 'idle';
              return (
                <View key={d.address} style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 14, borderRadius: R.md, backgroundColor: C.bgDeep }}>
                  <Icon name="bluetooth" color={/brain/i.test(d.name) ? C.calm : C.textMute} />
                  <View style={{ flex: 1 }}>
                    <Txt style={{ fontFamily: F.bold }}>{d.name}</Txt>
                    <Txt style={{ color: C.textMute, fontSize: 13 }}>{d.address}</Txt>
                  </View>
                  {on ? (
                    <Txt style={{ color: statusColor, fontFamily: F.semibold }}>{statusText}</Txt>
                  ) : (
                    <Button small kind="calm" title={t('connect')} onPress={() => eeg.connectBrainLink(d.address, d.name)} />
                  )}
                </View>
              );
            })}
            <Body style={{ fontSize: 14 }}>{t('pairHint')}</Body>
          </View>
        )}
      </Section>
    </>
  );
}

function AboutTab() {
  const { t } = useT();
  return (
    <View style={{ gap: 18, paddingTop: 22, borderTopWidth: 1, borderTopColor: C.line }}>
      <Body dim={false}>{t('aboutBody1')}</Body>
      <Body>{t('aboutBody2')}</Body>
      <H2 style={{ marginTop: 8 }}>{t('howItWorks')}</H2>
      <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
        {(
          [
            ['headset', 'how1', C.calm],
            ['spark', 'how2', C.focus],
            ['route', 'how3', C.sun],
          ] as const
        ).map(([icon, key, tint]) => (
          <View key={key} style={{ flex: 1, minWidth: 220, backgroundColor: C.bgDeep, borderRadius: R.lg, padding: 22, gap: 14 }}>
            <Icon name={icon} color={tint} size={32} />
            <Body>{t(key)}</Body>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
        <LogoMark size={28} />
        <Txt style={{ color: C.textMute }}>
          {BRAND.name} v{BRAND.version}
        </Txt>
      </View>
    </View>
  );
}

function SchoolTab() {
  const { t, lang } = useT();
  const sync = useSync();
  const [url, setUrl] = useState(sync.config.url);
  const [key, setKey] = useState(sync.config.key);
  const [name, setName] = useState(sync.config.deviceName);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setUrl(sync.config.url);
    setKey(sync.config.key);
    setName(sync.config.deviceName);
  }, [sync.config]);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    const cfg = { url, key, deviceName: name };
    const r = await sync.test(cfg);
    if (r.ok) {
      await sync.setConfig(cfg);
      setMsg({ ok: true, text: t('syncConnected', { school: r.school ?? '' }) });
      await sync.syncNow();
    } else setMsg({ ok: false, text: t('syncTestFailed', { e: r.error ?? '' }) });
    setBusy(false);
  };

  const when = sync.lastAt ? new Date(sync.lastAt).toLocaleString(lang === 'en' ? 'en-GB' : lang === 'ta' ? 'ta-IN' : 'hi-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '–';
  const tone = sync.state === 'error' ? C.coral : sync.state === 'off' ? C.textMute : sync.pending > 0 || sync.state === 'syncing' ? C.warn : C.good;

  return (
    <>
      <Section title={t('syncStatus')} right={sync.state !== 'off' ? <Button small kind="calm" title={t('syncNow')} icon="refresh" onPress={sync.syncNow} loading={sync.state === 'syncing'} /> : undefined}>
        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
          {(
            [
              [sync.state === 'off' ? t('syncOffShort') : sync.state === 'error' ? t('syncErrorShort') : sync.state === 'syncing' ? t('syncing') : t('syncOnShort'), t('syncStateLabel'), tone],
              [String(sync.pending), t('syncPendingLabel'), sync.pending ? C.warn : C.text],
              [when, t('syncLastLabel'), C.text],
              [sync.school ?? '–', t('syncSchoolLabel'), C.text],
            ] as const
          ).map(([v, l, c]) => (
            <View key={l} style={{ flex: 1, minWidth: 170, backgroundColor: C.bgDeep, borderRadius: R.lg, padding: 14 }}>
              <Txt style={{ fontFamily: F.black, fontSize: 20, color: c }} numberOfLines={1}>
                {v}
              </Txt>
              <Txt style={{ color: C.textDim, fontSize: 13 }}>{l}</Txt>
            </View>
          ))}
        </View>
        {sync.state === 'error' && !!sync.error && <Txt style={{ color: C.coral, fontSize: 14 }}>{sync.error}</Txt>}
      </Section>
      <Section title={t('syncServer')}>
        <Field label={t('syncUrl')} placeholder="http://192.168.1.20:4000" value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
        <View style={{ flexDirection: 'row', gap: 18 }}>
          <Field style={{ flex: 1 }} label={t('syncKey')} value={key} onChangeText={setKey} autoCapitalize="none" autoCorrect={false} />
          <Field style={{ flex: 1 }} label={t('syncDevice')} placeholder={t('syncDeviceHint')} value={name} onChangeText={setName} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          <Txt style={{ flex: 1, color: msg ? (msg.ok ? C.good : C.coral) : C.textDim, fontSize: 14 }}>{msg?.text ?? t('syncHelp')}</Txt>
          <Button title={t('syncSave')} icon="check" onPress={save} loading={busy} disabled={!url || !key} />
        </View>
      </Section>
    </>
  );
}

export default function Settings() {
  const { t } = useT();
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const [tab, setTab] = useState<Tab>(params.tab ?? 'audio');
  const tabs: { id: Tab; icon: IconName; label: string; body: string }[] = [
    { id: 'audio', icon: 'sound', label: t('audio'), body: t('audioBody') },
    { id: 'language', icon: 'globe', label: t('language'), body: t('languageBody') },
    { id: 'headset', icon: 'headset', label: t('headset'), body: t('headsetBody') },
    { id: 'school', icon: 'chart', label: t('schoolTab'), body: t('schoolTabBody') },
    { id: 'about', icon: 'info', label: t('about'), body: BRAND.tagline },
  ];
  const cur = tabs.find((x) => x.id === tab)!;
  return (
    <Screen back kicker={t('settings')} title={t('settings')}>
      <View style={{ flexDirection: 'row', gap: 24, alignItems: 'flex-start' }}>
        <Card style={{ width: 300, gap: 6 }} pad={14}>
          {tabs.map((x) => {
            const on = x.id === tab;
            return (
              <Pressable
                key={x.id}
                onPress={() => setTab(x.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, height: 58, paddingHorizontal: 16, borderRadius: R.md, backgroundColor: on ? C.card : 'transparent' }}>
                <Icon name={x.icon} color={on ? C.focus : C.textDim} />
                <Txt style={{ fontFamily: on ? F.bold : F.medium, fontSize: 17, color: on ? C.text : C.textDim }}>{x.label}</Txt>
              </Pressable>
            );
          })}
          <View style={{ height: 1, backgroundColor: C.line, marginVertical: 8 }} />
          <Pressable onPress={() => Linking.openURL(BRAND.supportUrl)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, height: 54, paddingHorizontal: 16 }}>
            <Icon name="headset" color={C.textDim} />
            <Txt style={{ color: C.textDim, flex: 1 }}>{t('support')}</Txt>
            <Icon name="external" color={C.textMute} size={18} />
          </Pressable>
        </Card>
        <Card style={{ flex: 1, gap: 8 }} pad={32}>
          <H1 style={{ fontSize: 32 }}>{cur.label}</H1>
          <Body style={{ marginBottom: 10 }}>{cur.body}</Body>
          {tab === 'audio' && <AudioTab />}
          {tab === 'language' && <LanguageTab />}
          {tab === 'headset' && <HeadsetTab />}
          {tab === 'school' && <SchoolTab />}
          {tab === 'about' && <AboutTab />}
        </Card>
      </View>
    </Screen>
  );
}
