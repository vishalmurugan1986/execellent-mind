import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Screen } from '@/components/Screen';
import { PressCard, Txt } from '@/components/ui';
import { C, F, Protocol, R } from '@/constants/theme';
import { ACTIVITIES_PER_SESSION, GAMES } from '@/content';
import { GameThumb } from '@/games/scenes';
import { useT } from '@/i18n';
import { useApp } from '@/store/AppStore';

export default function Games() {
  const { t, lang } = useT();
  const { protocol = 'focus', session } = useLocalSearchParams<{ protocol: Protocol; session?: string }>();
  const { active } = useApp();
  const inSession = session === '1';
  if (inSession && !active) return <Redirect href="/home" />;

  const kicker = inSession ? t('activityOf', { n: active!.slot + 1, total: ACTIVITIES_PER_SESSION }) : t('modeGames');

  return (
    <Screen back kicker={kicker} title={t('chooseGame')} center>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18, justifyContent: 'center' }}>
        {GAMES.map((g) => (
          <PressCard
            key={g.id}
            onPress={() => router.push(`/activity/options?game=${g.id}&protocol=${protocol}${inSession ? '&session=1' : ''}`)}
            style={{ width: 282, overflow: 'hidden', padding: 0 }}>
            <View style={{ height: 132, margin: 8, borderRadius: R.lg, overflow: 'hidden', backgroundColor: C.bgDeep }} pointerEvents="none">
              <GameThumb game={g.id} />
            </View>
            <View style={{ paddingHorizontal: 16, paddingBottom: 14, paddingTop: 2, gap: 2 }}>
              <Txt style={{ fontFamily: F.bold, fontSize: 19 }}>{g.name[lang]}</Txt>
              <Txt style={{ fontSize: 14, lineHeight: 19, color: C.textDim }} numberOfLines={1}>{g.blurb[lang]}</Txt>
            </View>
          </PressCard>
        ))}
      </View>
    </Screen>
  );
}
