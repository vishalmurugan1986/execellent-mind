import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Button, Card, Checkbox, Field, H1, Txt } from '@/components/ui';
import { C, F } from '@/constants/theme';
import { useT } from '@/i18n';
import { useApp } from '@/store/AppStore';

export default function Login() {
  const { t } = useT();
  const { signIn } = useApp();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr('');
    if (!email || !pw) return setErr(t('errRequired'));
    setBusy(true);
    const ok = await signIn(email, pw, remember);
    setBusy(false);
    if (!ok) return setErr(t('errLogin'));
    router.dismissTo('/home');
  };

  return (
    <Screen back>
      <View style={{ alignItems: 'center' }}>
        <Card style={{ width: 520, maxWidth: '100%', gap: 20 }} pad={40}>
          <H1>{t('signIn')}</H1>
          <Field label={t('email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" error={!!err && !email} />
          <Field label={t('password')} value={pw} onChangeText={setPw} secureTextEntry autoComplete="password" error={!!err && !pw} onSubmitEditing={submit} />
          <Checkbox checked={remember} onChange={setRemember} label={t('rememberMe')} />
          {!!err && <Txt style={{ color: C.coral, fontFamily: F.semibold }}>{err}</Txt>}
          <Button title={t('signIn')} onPress={submit} loading={busy} />
          <Pressable onPress={() => router.push('/forgot')} style={{ alignSelf: 'center' }} hitSlop={8}>
            <Txt style={{ color: C.calm, fontFamily: F.semibold }}>{t('forgot')}</Txt>
          </Pressable>
        </Card>
      </View>
    </Screen>
  );
}
