import { Redirect, router } from 'expo-router';
import { View } from 'react-native';

import { ChoiceCard } from '@/components/ChoiceCard';
import { Screen } from '@/components/Screen';
import { C } from '@/constants/theme';
import { useT } from '@/i18n';
import { useApp } from '@/store/AppStore';

/** Training is attention-based (like Excellent Brain), so Home goes straight to how to train. */
export default function Home() {
  const { t } = useT();
  const { user } = useApp();
  if (!user) return <Redirect href="/" />;
  const go = (path: string) => router.push(`${path}?protocol=focus` as any);
  return (
    <Screen kicker={`${t('protocolFocus')} · ${user.firstName}`} title={t('howTrain')} subtitle={t('howTrainSub')} center>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24, flexWrap: 'wrap', marginTop: 12 }}>
        <ChoiceCard icon="route" tint={C.sun} title={t('modeProgram')} body={t('modeProgramBody')} onPress={() => go('/programs')} />
        <ChoiceCard icon="spark" tint={C.focus} title={t('modeGames')} body={t('modeGamesBody')} onPress={() => go('/games')} />
        <ChoiceCard icon="film" tint={C.calm} title={t('modeVideo')} body={t('modeVideoBody')} onPress={() => go('/video')} />
      </View>
    </Screen>
  );
}
