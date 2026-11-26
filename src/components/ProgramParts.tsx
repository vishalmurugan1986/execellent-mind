import { View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Body, Card, Kicker, PressCard, Txt } from '@/components/ui';
import { C, F, R } from '@/constants/theme';
import { useT } from '@/i18n';

export function TipsPanel() {
  const { t } = useT();
  return (
    <Card style={{ width: 380, gap: 16, backgroundColor: 'C.surface' }}>
      <Kicker color={C.calm}>{t('tipsTitle')}</Kicker>
      {(['tip1', 'tip2', 'tip3'] as const).map((k, i) => (
        <View key={k} style={{ flexDirection: 'row', gap: 14 }}>
          <Txt style={{ fontFamily: F.black, color: C.focus, fontSize: 18, width: 18 }}>{i + 1}</Txt>
          <Body style={{ flex: 1 }}>{t(k)}</Body>
        </View>
      ))}
    </Card>
  );
}

export function RowCard({ n, title, status, done, locked, onPress }: { n: number; title: string; status: string; done?: boolean; locked?: boolean; onPress: () => void }) {
  return (
    <PressCard onPress={onPress} disabled={locked} style={{ padding: 22, flexDirection: 'row', alignItems: 'center', gap: 20, width: 520, maxWidth: '100%' }}>
      <View style={{ width: 64, height: 64, borderRadius: R.md, backgroundColor: done ? C.good + '22' : C.card, alignItems: 'center', justifyContent: 'center' }}>
        {locked ? <Icon name="lock" color={C.textMute} size={26} /> : done ? <Icon name="check" color={C.good} size={30} stroke={3} /> : <Txt style={{ fontFamily: F.black, fontSize: 26, color: C.focus }}>{n}</Txt>}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Txt style={{ fontFamily: F.bold, fontSize: 21 }}>{title}</Txt>
        <Txt style={{ color: done ? C.good : C.textMute, fontSize: 15 }}>{status}</Txt>
      </View>
      {!locked && <Icon name="arrow" color={C.focus} />}
    </PressCard>
  );
}

