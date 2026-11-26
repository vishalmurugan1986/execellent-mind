import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Protocol } from '@/constants/theme';
import { JOURNEY } from '@/content';
import { useT } from '@/i18n';
import { useApp } from '@/store/AppStore';
import { RowCard, TipsPanel } from '@/components/ProgramParts';

export default function Stages() {
  const { t, lang } = useT();
  const { protocol = 'focus' } = useLocalSearchParams<{ protocol: Protocol }>();
  const { completedIn, stageUnlocked } = useApp();
  return (
    <Screen back kicker={JOURNEY.name[lang]} title={JOURNEY.name[lang]} subtitle={t('stagePick')}>
      <View style={{ flexDirection: 'row', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, minWidth: 420, gap: 16 }}>
          {JOURNEY.stages.map((st, i) => {
            const c = Math.min(st.sessions, completedIn(st.id));
            const locked = !stageUnlocked(st.id);
            const done = c >= st.sessions;
            return (
              <RowCard
                key={st.id}
                n={i + 1}
                title={st.name[lang]}
                status={locked ? t('stageLocked') : `${c} / ${st.sessions} · ${done ? t('stageDone') : t('stageOpen')}`}
                done={done}
                locked={locked}
                onPress={() => router.push(`/sessions?protocol=${protocol}&stage=${st.id}`)}
              />
            );
          })}
        </View>
        <TipsPanel />
      </View>
    </Screen>
  );
}
