import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { DateFields, fromIso, GenderPicker, toIso } from '@/components/forms';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Button, Card, Field, H1, H2, IconButton, Txt } from '@/components/ui';
import { LineChart } from '@/components/viz';
import { C, F, R } from '@/constants/theme';
import { TOTAL_SESSIONS } from '@/content';
import { useT } from '@/i18n';
import { useApp, User } from '@/store/AppStore';
import { useSync } from '@/sync/SyncProvider';
import { BAND_GROUPS, summarize } from '@/store/metrics';

function Tile({ value, label, color = C.text }: { value: string; label: string; color?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.surface, borderRadius: R.lg, paddingHorizontal: 18, paddingVertical: 12, borderWidth: 1, borderColor: C.line }}>
      <Txt style={{ fontFamily: F.black, fontSize: 26, color }}>{value}</Txt>
      <Txt style={{ color: C.textDim, fontSize: 14 }}>{label}</Txt>
    </View>
  );
}

const ageOf = (iso: string) => {
  const b = new Date(iso);
  if (!iso || Number.isNaN(b.getTime())) return null;
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a >= 0 ? a : null;
};

function EditDetails({ user, visible, onClose }: { user: User; visible: boolean; onClose: () => void }) {
  const { t } = useT();
  const { updateUser } = useApp();
  const sync = useSync();
  const [f, setF] = useState({ firstName: user.firstName, lastName: user.lastName, studentId: user.studentId ?? '', className: user.className ?? '' });
  const [dob, setDob] = useState(fromIso(user.birthday));
  const [gender, setGender] = useState<User['gender']>(user.gender);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const save = async () => {
    if (!f.firstName.trim()) return;
    await updateUser({ firstName: f.firstName.trim(), lastName: f.lastName.trim(), studentId: f.studentId.trim(), className: f.className.trim(), birthday: toIso(dob), gender });
    onClose();
    sync.syncNow();
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(29,24,56,0.45)', alignItems: 'center', paddingTop: 60 }}>
        <Card style={{ width: 780, maxWidth: '92%', gap: 14 }} pad={28}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <H2>{t('editDetails')}</H2>
            <Pressable onPress={onClose} hitSlop={10}>
              <Icon name="close" color={C.textDim} />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 18 }}>
            <Field style={{ flex: 1 }} label={t('firstName')} value={f.firstName} onChangeText={set('firstName')} error={!f.firstName.trim()} />
            <Field style={{ flex: 1 }} label={t('lastName')} value={f.lastName} onChangeText={set('lastName')} />
          </View>
          <View style={{ flexDirection: 'row', gap: 18 }}>
            <Field style={{ flex: 1 }} label={t('studentId')} value={f.studentId} onChangeText={set('studentId')} autoCapitalize="characters" />
            <Field style={{ flex: 1 }} label={t('className')} value={f.className} onChangeText={set('className')} autoCapitalize="characters" />
          </View>
          <View style={{ flexDirection: 'row', gap: 18, flexWrap: 'wrap' }}>
            <View style={{ flex: 1, minWidth: 300 }}>
              <DateFields value={dob} onChange={setDob} />
            </View>
            <View style={{ flex: 1, minWidth: 300 }}>
              <GenderPicker value={gender} onChange={setGender} />
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Button title={t('save')} icon="check" onPress={save} />
          </View>
        </Card>
      </View>
    </Modal>
  );
}

function SyncChip() {
  const { t } = useT();
  const sync = useSync();
  const mins = sync.lastAt ? Math.max(0, Math.round((Date.now() - sync.lastAt) / 60000)) : null;
  const [color, text] =
    sync.state === 'off'
      ? [C.textMute, t('syncOff')]
      : sync.state === 'syncing'
        ? [C.warn, t('syncing')]
        : sync.state === 'error'
          ? [C.coral, t('syncFailed', { n: sync.pending })]
          : sync.pending > 0
            ? [C.warn, t('syncPending', { n: sync.pending })]
            : [C.good, mins == null ? t('syncDone') : t('syncedAgo', { n: mins })];
  return (
    <Pressable
      onPress={() => router.push('/settings?tab=school')}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, height: 44, borderRadius: R.pill, borderWidth: 1.5, borderColor: color, backgroundColor: color + '14' }}>
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color }} />
      <Txt style={{ fontFamily: F.semibold, fontSize: 14, color: C.text }}>{text}</Txt>
    </Pressable>
  );
}

const BAND_LABEL = { delta: 'bandDelta', theta: 'bandTheta', alpha: 'bandAlpha', beta: 'bandBeta', gamma: 'bandGamma' } as const;

export default function Profile() {
  const { t } = useT();
  const { user, data } = useApp();
  const [chartW, setChartW] = useState(0);
  const [editing, setEditing] = useState(false);
  if (!user) return <Redirect href="/" />;

  const s = summarize(data.activities);
  const recent = s.series.slice(-20);
  const sessionsDone = new Set(data.sessions.map((x) => `${x.stageId}:${x.n}`)).size;
  const avg = (k: 'focus') => {
    const v = s.series.map((m) => m[k]).filter((x): x is number => x != null);
    return v.length ? String(Math.round(v.reduce((a, b) => a + b, 0) / v.length)) : '–';
  };
  const played = data.activities.filter((a) => a.durationSec >= 5);
  const onTarget = played.length ? `${Math.round(played.reduce((x, a) => x + a.pctAbove, 0) / played.length)}%` : '–';
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();
  const hasBands = s.latest.delta != null;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 14 }}>
        <IconButton name="back" label="Back" size={52} onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
        <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: C.focus, alignItems: 'center', justifyContent: 'center' }}>
          <Txt style={{ fontFamily: F.black, fontSize: 22, color: C.ink }}>{initials}</Txt>
        </View>
        <View style={{ flex: 1 }}>
          <H1 style={{ fontSize: 30, lineHeight: 36 }}>{`${user.firstName} ${user.lastName}`}</H1>
          <Txt style={{ color: C.textMute, fontSize: 14 }}>
            {[
              ageOf(user.birthday) != null ? t('ageYears', { n: ageOf(user.birthday)! }) : null,
              user.className ? t('classLabel', { c: user.className }) : null,
              user.studentId ? t('idLabel', { id: user.studentId }) : null,
              t('activitiesN', { n: s.count }),
            ]
              .filter(Boolean)
              .join(' · ')}
          </Txt>
        </View>
        <SyncChip />
        <Button small kind="ghost" title={t('questionnaire')} onPress={() => router.push('/survey')} />
        <Button small kind="ghost" title={t('editDetails')} onPress={() => setEditing(true)} />
      </View>
      <EditDetails key={user.uid ?? user.email} user={user} visible={editing} onClose={() => setEditing(false)} />

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
        <Tile value={`${sessionsDone}/${TOTAL_SESSIONS}`} label={t('sessionsDone')} />
        <Tile value={avg('focus')} label={t('avgFocus')} color={C.focus} />
        <Tile value={onTarget} label={t('timeAbove')} color={C.calm} />
        <Tile value={String(s.minutes)} label={t('playMinutes')} />
      </View>

      <View style={{ flexDirection: 'row', gap: 14 }}>
        <Card style={{ flex: 1, gap: 8 }} pad={18}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <H2 style={{ fontSize: 19 }}>{t('progressChart')}</H2>
            <View style={{ flexDirection: 'row', gap: 14 }}>
              <Legend color={C.focus} label={t('focus')} />
            </View>
          </View>
          <View onLayout={(e) => setChartW(Math.round(e.nativeEvent.layout.width))}>
            {chartW > 0 && (
              <LineChart
                width={chartW}
                height={220}
                series={[
                  { values: recent.map((m) => m.focus), color: C.focus, dots: true },
                ]}
                xLabels={recent.map((_, i) => String(s.count - recent.length + i + 1))}
                empty={t('noHistory')}
              />
            )}
          </View>
        </Card>

        <Card style={{ width: 360, gap: 10 }} pad={18}>
          <View>
            <H2 style={{ fontSize: 19 }}>{t('brainwaves')}</H2>
            <Txt style={{ color: C.textMute, fontSize: 13 }}>{t('firstVsLatest')}</Txt>
          </View>
          {!hasBands ? (
            <Txt style={{ color: C.textDim }}>{t('noBrainData')}</Txt>
          ) : (
            BAND_GROUPS.map((g) => {
              const f = s.first[g.key] ?? 0;
              const l = s.latest[g.key] ?? 0;
              return (
                <View key={g.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Txt style={{ width: 56, fontFamily: F.semibold, fontSize: 14 }}>{t(BAND_LABEL[g.key])}</Txt>
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={{ height: 7, borderRadius: 4, backgroundColor: C.card }}>
                      <View style={{ width: `${Math.min(100, f)}%`, height: 7, borderRadius: 4, backgroundColor: g.color + '60' }} />
                    </View>
                    <View style={{ height: 7, borderRadius: 4, backgroundColor: C.card }}>
                      <View style={{ width: `${Math.min(100, l)}%`, height: 7, borderRadius: 4, backgroundColor: g.color }} />
                    </View>
                  </View>
                  <Txt style={{ width: 48, textAlign: 'right', fontFamily: F.bold, fontSize: 13 }}>{l.toFixed(0)}%</Txt>
                </View>
              );
            })
          )}
          {hasBands && s.latest.tbr != null && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8 }}>
              <Txt style={{ color: C.textDim, fontSize: 14 }}>{t('tbr')}</Txt>
              <Txt style={{ fontFamily: F.bold, fontSize: 14 }}>
                {s.first.tbr?.toFixed(2)} → {s.latest.tbr.toFixed(2)}
              </Txt>
            </View>
          )}
        </Card>
      </View>
    </Screen>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <Txt style={{ color: C.textDim, fontSize: 13 }}>{label}</Txt>
    </View>
  );
}
