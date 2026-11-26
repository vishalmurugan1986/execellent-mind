import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/ui';
import { C, F, Protocol, R } from '@/constants/theme';
import { JOURNEY } from '@/content';
import { useT } from '@/i18n';
import { useApp } from '@/store/AppStore';
import { TipsPanel } from '@/components/ProgramParts';

export default function Sessions() {
  const { t, lang } = useT();
  const { protocol = 'focus', stage = JOURNEY.stages[0].id } = useLocalSearchParams<{ protocol: Protocol; stage: string }>();
  const { data, startSession } = useApp();
  const st = JOURNEY.stages.find((s) => s.id === stage) ?? JOURNEY.stages[0];
  const doneSet = new Set(data.sessions.filter((s) => s.stageId === st.id).map((s) => s.n));
  const next = Array.from({ length: st.sessions }, (_, i) => i + 1).find((n) => !doneSet.has(n)) ?? null;

  const open = (n: number) => {
    startSession(protocol, st.id, n);
    router.push(`/games?protocol=${protocol}&session=1`);
  };

  return (
    <Screen back kicker={JOURNEY.name[lang]} title={st.name[lang]} subtitle={t('sessionsPick')}>
      <View style={{ flexDirection: 'row', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, minWidth: 420, flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignContent: 'flex-start' }}>
          {Array.from({ length: st.sessions }, (_, i) => i + 1).map((n) => {
            const done = doneSet.has(n);
            const isNext = n === next;
            const locked = !done && !isNext;
            return (
              <Pressable
                key={n}
                disabled={locked}
                onPress={() => open(n)}
                style={({ pressed }) => ({
                  width: 118,
                  height: 108,
                  borderRadius: R.lg,
                  padding: 14,
                  justifyContent: 'space-between',
                  backgroundColor: done ? '#E4F7EC' : isNext ? C.surface : C.card,
                  borderWidth: isNext ? 2 : 1,
                  borderColor: done ? C.good : isNext ? C.focus : C.line,
                  opacity: locked ? 0.55 : 1,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Txt style={{ fontFamily: F.black, fontSize: 26, color: done ? C.good : isNext ? C.focus : C.textMute }}>{n}</Txt>
                  {done ? <Icon name="check" color={C.good} /> : locked ? <Icon name="lock" color={C.textMute} size={18} /> : null}
                </View>
                <Txt style={{ fontFamily: F.semibold, fontSize: 14, color: locked ? C.textMute : C.textDim }}>{t('sessionN', { n })}</Txt>
              </Pressable>
            );
          })}
        </View>
        <TipsPanel />
      </View>
    </Screen>
  );
}
