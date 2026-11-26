import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { DateFields, fromIso, GenderPicker } from '@/components/forms';
import { Screen } from '@/components/Screen';
import { Body, Button, Card, Field, H2, Kicker, Txt } from '@/components/ui';
import { C, F, R } from '@/constants/theme';
import { SURVEY } from '@/content';
import { useT } from '@/i18n';
import { useApp } from '@/store/AppStore';

const PER_PAGE = 4;

function Steps({ step }: { step: number }) {
  const { t } = useT();
  const names = [t('stepDetails'), t('stepQuestions'), t('stepResults')];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {names.map((n, i) => (
        <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: i <= step ? C.calm : C.card, alignItems: 'center', justifyContent: 'center' }}>
            <Txt style={{ fontFamily: F.bold, color: i <= step ? C.ink : C.textMute }}>{i + 1}</Txt>
          </View>
          <Txt style={{ fontFamily: F.semibold, color: i === step ? C.text : C.textMute }}>{n}</Txt>
          {i < 2 && <View style={{ width: 40, height: 1, backgroundColor: C.line }} />}
        </View>
      ))}
    </View>
  );
}

export default function Survey() {
  const { t, lang } = useT();
  const { user, data, addSurvey } = useApp();
  const [step, setStep] = useState(0);
  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(SURVEY.map(() => null));
  const [first, setFirst] = useState(user?.firstName ?? '');
  const [lastN, setLastN] = useState(user?.lastName ?? '');
  const [dob, setDob] = useState(fromIso(user?.birthday ?? ''));
  const [gender, setGender] = useState<string>(user?.gender ?? '');
  const [score, setScore] = useState(0);
  if (!user) return <Redirect href="/" />;

  const pages = Math.ceil(SURVEY.length / PER_PAGE);
  const baseline = data.surveys[0];

  const submit = () => {
    const sc = answers.reduce<number>((s, a) => s + (a ?? 0), 0);
    setScore(sc);
    addSurvey({ at: Date.now(), answers, score: sc, answered: answers.filter((a) => a != null).length });
    setStep(2);
  };

  return (
    <Screen back={() => (step === 1 && page > 0 ? setPage(page - 1) : step === 1 ? setStep(0) : router.back())} kicker={t(['stepDetails', 'stepQuestions', 'stepResults'][step] as any)} title={t('surveyTitle')}>
      <View style={{ position: 'absolute', right: 36, top: 22 }}>
        <Steps step={step} />
      </View>
      <View style={{ flexDirection: 'row', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <Card style={{ width: 330, gap: 12 }} pad={24}>
          <H2>{t('surveyTitle')}</H2>
          <Body>{t('surveyIntro')}</Body>
        </Card>

        <Card style={{ flex: 1, minWidth: 520, gap: 14 }} pad={24}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {Array.from({ length: pages + 2 }, (_, i) => {
              const pos = step === 0 ? 0 : step === 1 ? page + 1 : pages + 1;
              return <View key={i} style={{ width: 52, height: 6, borderRadius: 3, backgroundColor: i <= pos ? C.calm : C.line }} />;
            })}
          </View>

          {step === 0 && (
            <>
              <H2>{t('stepDetails')}</H2>
              <View style={{ flexDirection: 'row', gap: 20 }}>
                <Field style={{ flex: 1 }} label={t('firstName')} value={first} onChangeText={setFirst} />
                <Field style={{ flex: 1 }} label={t('lastName')} value={lastN} onChangeText={setLastN} />
              </View>
              <View style={{ flexDirection: 'row', gap: 20, flexWrap: 'wrap' }}>
                <DateFields value={dob} onChange={setDob} />
                <GenderPicker value={gender} onChange={setGender} />
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Button title={t('continue')} kind="calm" icon="arrow" onPress={() => setStep(1)} />
              </View>
            </>
          )}

          {step === 1 && (
            <>
              {SURVEY.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE).map((q, k) => {
                const i = page * PER_PAGE + k;
                return (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line }}>
                    <Txt style={{ flex: 1, fontFamily: F.semibold, fontSize: 16, lineHeight: 22 }}>
                      <Txt style={{ color: C.calm, fontFamily: F.bold }}>{i + 1}. </Txt>
                      {q[lang]}
                    </Txt>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {([0, 1, 2, 3] as const).map((v) => {
                        const on = answers[i] === v;
                        return (
                          <Pressable
                            key={v}
                            onPress={() => setAnswers((a) => a.map((x, j) => (j === i ? (x === v ? null : v) : x)))}
                            style={{
                              paddingHorizontal: 18,
                              height: 38,
                              borderRadius: R.pill,
                              justifyContent: 'center',
                              borderWidth: 1.5,
                              borderColor: on ? C.calm : C.line,
                              backgroundColor: on ? C.calm : 'transparent',
                            }}>
                            <Txt style={{ fontFamily: F.semibold, fontSize: 14, color: on ? C.ink : C.textDim }}>{t(`ans${v}` as any)}</Txt>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Txt style={{ color: C.textMute }}>
                  {answers.filter((a) => a != null).length} / {SURVEY.length}
                </Txt>
                {page < pages - 1 ? (
                  <Button title={t('continue')} kind="calm" icon="arrow" onPress={() => setPage(page + 1)} />
                ) : (
                  <Button title={t('submit')} kind="calm" icon="arrow" onPress={submit} />
                )}
              </View>
            </>
          )}

          {step === 2 && (
            <View style={{ gap: 16 }}>
              <Kicker color={C.calm}>{t('surveyScore')}</Kicker>
              <Txt style={{ fontFamily: F.black, fontSize: 64 }}>
                {score}
                <Txt style={{ fontSize: 28, color: C.textMute }}> / {SURVEY.length * 3}</Txt>
              </Txt>
              <Body>{t('surveyLower')}</Body>
              <H2 style={{ color: C.calm }}>
                {!baseline || data.surveys.length <= 1
                  ? t('surveyFirst')
                  : score <= baseline.score
                    ? t('surveyBetter', { n: baseline.score - score })
                    : t('surveyWorse', { n: score - baseline.score })}
              </H2>
              <View style={{ alignItems: 'flex-end' }}>
                <Button title={t('backToProfile')} icon="arrow" onPress={() => router.back()} />
              </View>
            </View>
          )}
        </Card>
      </View>
    </Screen>
  );
}
