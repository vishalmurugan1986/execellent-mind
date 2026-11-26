import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { LogoMark } from '@/components/Logo';
import { Screen } from '@/components/Screen';
import { Body, Button, Card, H1, Kicker } from '@/components/ui';
import { Stars } from '@/components/viz';
import { useT } from '@/i18n';

export default function SessionDone() {
  const { t } = useT();
  const { n = '1' } = useLocalSearchParams<{ n: string }>();
  return (
    <Screen>
      <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <Card style={{ width: 620, maxWidth: '100%', alignItems: 'center', gap: 20 }} pad={48}>
          <LogoMark size={84} />
          <Kicker>{t('sessionN', { n })}</Kicker>
          <H1 style={{ textAlign: 'center' }}>{t('sessionDone')}</H1>
          <Stars count={3} size={52} />
          <Body style={{ textAlign: 'center' }}>{t('sessionDoneBody', { n })}</Body>
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
            <Button title={t('profile')} kind="ghost" onPress={() => router.replace('/profile')} />
            <Button title={t('home')} icon="arrow" onPress={() => router.dismissTo('/home')} />
          </View>
        </Card>
      </View>
    </Screen>
  );
}
