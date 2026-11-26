import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Body, Button, Card, Checkbox, H1, Kicker, Slider, Txt } from '@/components/ui';
import { Gauge } from '@/components/viz';
import { C, F, Protocol, protocolColor, R } from '@/constants/theme';
import { ACTIVITIES_PER_SESSION, GameId, GAMES } from '@/content';
import { GameThumb } from '@/games/scenes';
import { useT } from '@/i18n';
import { useApp } from '@/store/AppStore';

export default function Options() {
  const { t, lang } = useT();
  const { game = 'runner', protocol = 'focus', session } = useLocalSearchParams<{ game: GameId; protocol: Protocol; session?: string }>();
  const { active } = useApp();
  const inSession = session === '1';
  const [threshold, setThreshold] = useState(40);
  const [adaptive, setAdaptive] = useState(true);
  if (inSession && !active) return <Redirect href="/home" />;

  const g = GAMES.find((x) => x.id === game) ?? GAMES[0];
  const tint = protocolColor(protocol);
  const th = inSession ? active!.threshold : threshold;

  const start = () =>
    router.push(`/activity/play?game=${g.id}&protocol=${protocol}&threshold=${th}&dynamic=${inSession || adaptive ? 1 : 0}${inSession ? '&session=1' : ''}`);

  return (
    <Screen back>
      <View style={{ alignItems: 'center' }}>
        <Card style={{ width: 860, maxWidth: '100%', gap: 18 }} pad={30}>
          <View style={{ flexDirection: 'row', gap: 26, alignItems: 'center' }}>
            <View style={{ width: 170, height: 110, borderRadius: R.lg, overflow: 'hidden' }} pointerEvents="none">
              <GameThumb game={g.id} />
            </View>
            <View style={{ gap: 8, flex: 1 }}>
              <Kicker>{t('options')}</Kicker>
              <H1>{g.name[lang]}</H1>
              {inSession && (
                <View style={{ alignSelf: 'flex-start', backgroundColor: C.card, paddingHorizontal: 14, paddingVertical: 6, borderRadius: R.pill }}>
                  <Txt style={{ fontFamily: F.semibold, color: C.focus, fontSize: 14 }}>
                    {t('activityOf', { n: active!.slot + 1, total: ACTIVITIES_PER_SESSION })}
                  </Txt>
                </View>
              )}
            </View>
          </View>

          <View style={{ gap: 12 }}>
            <Txt style={{ fontFamily: F.semibold, color: C.textDim }}>{t('difficulty')}</Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 26, backgroundColor: C.bgDeep, borderRadius: R.lg, padding: 20, borderWidth: 1, borderColor: C.line }}>
              <Gauge value={th} color={tint} size={96} />
              <View style={{ flex: 1, gap: 6 }}>
                <Txt style={{ fontFamily: F.bold, fontSize: 20 }}>{t(protocol)}</Txt>
                {inSession ? <Body>{t('autoTarget')}</Body> : <Slider value={threshold} min={10} max={90} step={1} onChange={setThreshold} accent={tint} />}
              </View>
            </View>
          </View>

          {!inSession && (
            <View style={{ gap: 10 }}>
              <Checkbox checked={adaptive} onChange={setAdaptive} label={t('adaptive')} />
              <Body style={{ fontSize: 15 }}>{t('adaptiveBody')}</Body>
            </View>
          )}

          <View style={{ alignItems: 'flex-end' }}>
            <Button title={t('start')} icon="play" onPress={start} kind={protocol === 'calm' ? 'calm' : 'primary'} style={{ minWidth: 220 }} />
          </View>
        </Card>
      </View>
    </Screen>
  );
}
