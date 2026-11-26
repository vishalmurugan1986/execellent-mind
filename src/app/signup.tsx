import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { DateFields, GenderPicker, SelectField, toIso } from '@/components/forms';
import { Screen } from '@/components/Screen';
import { Button, Card, Field, H1, Txt } from '@/components/ui';
import { C, F } from '@/constants/theme';
import { COUNTRIES } from '@/content';
import { useT } from '@/i18n';
import { useApp } from '@/store/AppStore';

export default function SignUp() {
  const { t } = useT();
  const { signUp } = useApp();
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', confirm: '', gender: '' as any, country: 'India' });
  const [dob, setDob] = useState({ d: '', m: '', y: '' });
  const [err, setErr] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    setTried(true);
    setErr('');
    if (!f.firstName || !f.lastName || !f.email || !f.password || !f.confirm) return setErr(t('errRequired'));
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setErr(t('errEmail'));
    if (f.password.length < 6) return setErr(t('errPwShort'));
    if (f.password !== f.confirm) return setErr(t('errPwMatch'));
    setBusy(true);
    const res = await signUp({
      firstName: f.firstName.trim(),
      lastName: f.lastName.trim(),
      email: f.email,
      phone: f.phone,
      birthday: toIso(dob),
      gender: f.gender,
      country: f.country,
      password: f.password,
    });
    setBusy(false);
    if (res === 'exists') return setErr(t('errExists'));
    router.dismissTo('/home');
  };

  const miss = (v: string) => tried && !v;

  return (
    <Screen back>
      <View style={{ alignItems: 'center' }}>
        <Card style={{ width: 900, maxWidth: '100%', gap: 14 }} pad={30}>
          <H1 style={{ fontSize: 32, lineHeight: 38 }}>{t('createProfile')}</H1>
          <View style={{ flexDirection: 'row', gap: 20 }}>
            <Field style={{ flex: 1 }} label={t('firstName')} value={f.firstName} onChangeText={set('firstName')} error={miss(f.firstName)} />
            <Field style={{ flex: 1 }} label={t('lastName')} value={f.lastName} onChangeText={set('lastName')} error={miss(f.lastName)} />
          </View>
          <View style={{ flexDirection: 'row', gap: 20 }}>
            <Field style={{ flex: 1 }} label={t('email')} value={f.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" error={miss(f.email)} />
            <Field style={{ flex: 1 }} label={t('phone')} value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
          </View>
          <View style={{ flexDirection: 'row', gap: 20 }}>
            <Field style={{ flex: 1 }} label={t('password')} value={f.password} onChangeText={set('password')} secureTextEntry error={miss(f.password)} />
            <Field style={{ flex: 1 }} label={t('confirmPassword')} value={f.confirm} onChangeText={set('confirm')} secureTextEntry error={miss(f.confirm)} />
          </View>
          <View style={{ flexDirection: 'row', gap: 20, flexWrap: 'wrap' }}>
            <View style={{ flex: 1, minWidth: 320 }}>
              <DateFields value={dob} onChange={setDob} />
            </View>
            <View style={{ flex: 1, minWidth: 320 }}>
              <GenderPicker value={f.gender} onChange={set('gender')} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 20 }}>
            <View style={{ flex: 1 }}>
              <SelectField label={t('country')} value={f.country} options={COUNTRIES} onChange={set('country')} />
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end', gap: 8 }}>
              {!!err && <Txt style={{ color: C.coral, fontFamily: F.semibold }}>{err}</Txt>}
              <Button title={t('create')} icon="arrow" onPress={submit} loading={busy} />
            </View>
          </View>
        </Card>
      </View>
    </Screen>
  );
}
