import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { RowCard, TipsPanel } from '@/components/ProgramParts';
import { Screen } from '@/components/Screen';
import { Protocol } from '@/constants/theme';
import { JOURNEY, TOTAL_SESSIONS } from '@/content';
import { useT } from '@/i18n';
import { useApp } from '@/store/AppStore';

export default function Programs() {
  const { t, lang } = useT();
  const { protocol = 'focus' } = useLocalSearchParams<{ protocol: Protocol }>();
  const { completedIn } = useApp();
  const done = JOURNEY.stages.reduce((s, st) => s + Math.min(st.sessions, completedIn(st.id)), 0);
  return (
    <Screen back kicker={t('modeProgram')} title={t('programsTitle')} subtitle={t('programsSub')}>
      <View style={{ flexDirection: 'row', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, minWidth: 420, gap: 16 }}>
          <RowCard
            n={1}
            title={JOURNEY.name[lang]}
            status={`${done} / ${TOTAL_SESSIONS} · ${done >= TOTAL_SESSIONS ? t('stageDone') : t('stageOpen')}`}
            done={done >= TOTAL_SESSIONS}
            onPress={() => router.push(`/stages?protocol=${protocol}`)}
          />
        </View>
        <TipsPanel />
      </View>
    </Screen>
  );
}
