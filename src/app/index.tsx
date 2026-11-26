import { Redirect, router } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';

import { Icon, IconName } from '@/components/Icon';
import { LogoMark } from '@/components/Logo';
import { Screen } from '@/components/Screen';
import { Body, Button, Card, H1, H2, Kicker, Txt } from '@/components/ui';
import { C, F, R } from '@/constants/theme';
import { useT } from '@/i18n';
import { useApp } from '@/store/AppStore';

function Feature({ icon, title, body, tint }: { icon: IconName; title: string; body: string; tint: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 18, alignItems: 'center' }}>
      <View style={{ width: 56, height: 56, borderRadius: R.md, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line }}>
        <Icon name={icon} color={tint} size={26} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt style={{ fontFamily: F.bold, fontSize: 18 }}>{title}</Txt>
        <Body>{body}</Body>
      </View>
    </View>
  );
}

export default function Welcome() {
  const { t } = useT();
  const { user } = useApp();
  const { width } = useWindowDimensions();
  const wide = width >= 1000;
  if (user) return <Redirect href="/home" />;

  return (
    <Screen>
      <View style={{ flex: 1, flexDirection: wide ? 'row' : 'column', alignItems: 'center', gap: 48, paddingHorizontal: wide ? 40 : 0 }}>
        <View style={{ flex: wide ? 1.25 : undefined, gap: 22 }}>
          <Kicker color={C.calm}>{t('welcomeKicker')}</Kicker>
          <H1 style={{ fontSize: wide ? 60 : 44, lineHeight: wide ? 68 : 52, maxWidth: 680 }}>{t('welcomeTitle')}</H1>
          <Body style={{ fontSize: 19, lineHeight: 29, maxWidth: 620 }}>{t('welcomeBody')}</Body>
          <View style={{ gap: 20, marginTop: 10 }}>
            <Feature icon="chart" tint={C.calm} title={t('feat1Title')} body={t('feat1Body')} />
            <Feature icon="spark" tint={C.focus} title={t('feat2Title')} body={t('feat2Body')} />
            <Feature icon="route" tint={C.sun} title={t('feat3Title')} body={t('feat3Body')} />
          </View>
        </View>

        <Card style={{ width: wide ? 440 : '100%', gap: 18 }} pad={36}>
          <LogoMark size={56} />
          <Kicker>{t('getStarted')}</Kicker>
          <H2 style={{ fontSize: 32, lineHeight: 38, fontFamily: F.black }}>{t('welcomeCardTitle')}</H2>
          <Body>{t('welcomeCardBody')}</Body>
          <Button title={t('signIn')} icon="arrow" onPress={() => router.push('/login')} style={{ marginTop: 8 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
            <Txt style={{ color: C.textMute, fontSize: 14 }}>{t('firstTime')}</Txt>
            <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
          </View>
          <Button title={t('createProfile')} kind="ghost" onPress={() => router.push('/signup')} />
        </Card>
      </View>
    </Screen>
  );
}
