import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Body, Button, Card, Field, H1, Kicker, Segmented, Txt } from '@/components/ui';
import { LineChart, Stars } from '@/components/viz';
import { C, F, Protocol, protocolColor, R } from '@/constants/theme';
import { gameName } from '@/content';
import { useT } from '@/i18n';
import { useApp } from '@/store/AppStore';

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: accent ? accent + '18' : C.bgDeep, borderRadius: R.lg, paddingHorizontal: 20, paddingVertical: 16, gap: 4, borderWidth: 1, borderColor: accent ?? C.line }}>
      <Txt style={{ color: C.textDim, fontFamily: F.medium }}>{label}</Txt>
      <Txt style={{ fontFamily: F.black, fontSize: 34, color: accent ?? C.text }}>{value}</Txt>
    </View>
  );
}

export default function Results() {
  const { t, lang } = useT();
  const p = useLocalSearchParams<{ id: string; game: string; protocol: Protocol; threshold: string; dynamic: string; session?: string; complete?: string; n?: string }>();
  const { data, bestScore, updateNotes } = useApp();
  const { width } = useWindowDimensions();
  const rec = data.activities.find((a) => a.id === p.id);
  const [tab, setTab] = useState<'scores' | 'graph'>('scores');
  const [notes, setNotes] = useState(rec?.notes ?? '');
  const inSession = p.session === '1';
  const complete = p.complete === '1';
  const protocol = (p.protocol ?? 'focus') as Protocol;
  const tint = protocolColor(protocol);
  const name = rec && rec.game !== 'video' ? gameName(rec.game, lang) : t('modeVideo');

  const saveNotes = () => rec && notes !== (rec.notes ?? '') && updateNotes(rec.id, notes);

  const next = () => {
    saveNotes();
    if (inSession && complete) router.replace(`/session-done?n=${p.n}`);
    else if (inSession) router.replace(`/games?protocol=${protocol}&session=1`);
    else if (rec?.game === 'video') router.dismissTo(`/video?protocol=${protocol}`);
    else router.dismissTo(`/games?protocol=${protocol}`);
  };
  const replay = () => {
    saveNotes();
    router.replace(`/activity/play?game=${p.game}&protocol=${protocol}&threshold=${p.threshold}&dynamic=${p.dynamic}`);
  };

  const cardW = Math.min(1000, width - 72);

  return (
    <Screen>
      <View style={{ alignItems: 'center' }}>
        <Card style={{ width: cardW, gap: 16 }} pad={30}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ gap: 8 }}>
              <Kicker>{t('done')}</Kicker>
              <H1>{name}</H1>
            </View>
            <Stars count={rec?.stars ?? 0} size={50} />
          </View>
          <Segmented value={tab} onChange={setTab} options={[{ id: 'scores', label: t('viewScores') }, { id: 'graph', label: t('viewGraph') }]} />
          {tab === 'scores' ? (
            <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
              <Stat label={t('currentScore')} value={rec?.score ?? 0} accent={tint} />
              <Stat label={t('bestScore')} value={rec ? bestScore(rec.game, protocol) : 0} />
              <Stat label={t('avgProtocol', { p: t(protocol) })} value={rec?.avg ?? 0} />
              <Stat label={t('timeAbove')} value={`${rec?.pctAbove ?? 0}%`} />
            </View>
          ) : (
            <View style={{ backgroundColor: C.bgDeep, borderRadius: R.lg, padding: 14 }}>
              <LineChart
                width={cardW - 88}
                height={210}
                series={[{ values: rec?.samples ?? [], color: tint }]}
                reference={rec?.thresholds?.length ? { values: rec.thresholds, color: C.coral } : undefined}
                empty={t('noData')}
              />
            </View>
          )}
          <Field label={t('notes')} placeholder={t('notesHint')} value={notes} onChangeText={setNotes} onBlur={saveNotes} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            {!inSession && rec?.game !== 'video' ? <Button title={t('replay')} kind="ghost" onPress={replay} /> : <Body>{rec?.session ? t('activityOf', { n: rec.session.slot + 1, total: 10 }) : ''}</Body>}
            <Button title={inSession && complete ? t('finish') : t('next')} icon="arrow" onPress={next} style={{ minWidth: 200 }} />
          </View>
        </Card>
      </View>
    </Screen>
  );
}
