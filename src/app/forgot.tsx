import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { DateFields, toIso } from '@/components/forms';
import { Screen } from '@/components/Screen';
import { Body, Button, Card, Field, H1, Txt } from '@/components/ui';
import { C, F } from '@/constants/theme';
import { useT } from '@/i18n';
import { useApp } from '@/store/AppStore';

export default function Forgot() {
  const { t } = useT();
  const { resetPassword } = useApp();
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState({ d: '', m: '', y: '' });
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async () => {
    if (!email || !toIso(dob) || !pw) return setMsg({ ok: false, text: t('errRequired') });
    if (pw.length < 6) return setMsg({ ok: false, text: t('errPwShort') });
    const ok = await resetPassword(email, toIso(dob), pw);
    setMsg(ok ? { ok: true, text: t('resetDone') } : { ok: false, text: t('errReset') });
    if (ok) setTimeout(() => router.back(), 1400);
  };

  return (
    <Screen back>
      <View style={{ alignItems: 'center' }}>
        <Card style={{ width: 560, maxWidth: '100%', gap: 20 }} pad={40}>
          <H1>{t('resetTitle')}</H1>
          <Body>{t('resetBody')}</Body>
          <Field label={t('email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <DateFields value={dob} onChange={setDob} />
          <Field label={t('newPassword')} value={pw} onChangeText={setPw} secureTextEntry />
          {msg && <Txt style={{ color: msg.ok ? C.good : C.coral, fontFamily: F.semibold }}>{msg.text}</Txt>}
          <Button title={t('save')} onPress={submit} />
        </Card>
      </View>
    </Screen>
  );
}
