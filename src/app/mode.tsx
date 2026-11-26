import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { ChoiceCard } from '@/components/ChoiceCard';
import { Screen } from '@/components/Screen';
import { C, Protocol } from '@/constants/theme';
import { useT } from '@/i18n';

export default function Mode() {
  const { t } = useT();
  const { protocol = 'focus' } = useLocalSearchParams<{ protocol: Protocol }>();
  return (
    <Screen back kicker={t(protocol === 'focus' ? 'protocolFocus' : 'protocolCalm')} title={t('howTrain')} subtitle={t('howTrainSub')} center>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24, flexWrap: 'wrap', marginTop: 12 }}>
        <ChoiceCard icon="route" tint={C.sun} title={t('modeProgram')} body={t('modeProgramBody')} onPress={() => router.push(`/programs?protocol=${protocol}`)} />
        <ChoiceCard icon="spark" tint={C.focus} title={t('modeGames')} body={t('modeGamesBody')} onPress={() => router.push(`/games?protocol=${protocol}`)} />
        <ChoiceCard icon="film" tint={C.calm} title={t('modeVideo')} body={t('modeVideoBody')} onPress={() => router.push(`/video?protocol=${protocol}`)} />
      </View>
    </Screen>
  );
}
