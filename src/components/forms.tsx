import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';

import { C, F, R } from '@/constants/theme';
import { useT } from '@/i18n';
import { Icon } from './Icon';
import { Chip, Field, Txt } from './ui';

export type DateParts = { d: string; m: string; y: string };

export const toIso = ({ d, m, y }: DateParts) =>
  d && m && y.length === 4 ? `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` : '';

export const fromIso = (iso: string): DateParts => {
  const [y = '', m = '', d = ''] = (iso || '').split('-');
  return { d, m, y };
};

export function DateFields({ value, onChange, error }: { value: DateParts; onChange: (v: DateParts) => void; error?: boolean }) {
  const { t } = useT();
  const num = (s: string, n: number) => s.replace(/\D/g, '').slice(0, n);
  return (
    <View style={{ gap: 8 }}>
      <Txt style={{ fontFamily: F.semibold, fontSize: 14, color: C.textDim }}>{t('birthday')}</Txt>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Field label="" placeholder={t('day')} style={{ width: 90 }} value={value.d} keyboardType="number-pad" onChangeText={(d) => onChange({ ...value, d: num(d, 2) })} error={error && !value.d} />
        <Field label="" placeholder={t('month')} style={{ width: 90 }} value={value.m} keyboardType="number-pad" onChangeText={(m) => onChange({ ...value, m: num(m, 2) })} error={error && !value.m} />
        <Field label="" placeholder={t('year')} style={{ width: 120 }} value={value.y} keyboardType="number-pad" onChangeText={(y) => onChange({ ...value, y: num(y, 4) })} error={error && value.y.length !== 4} />
      </View>
    </View>
  );
}

/** Compact dropdown (opens a list in a sheet), like the original's country field. */
export function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Txt style={{ fontFamily: F.semibold, fontSize: 14, color: C.textDim }}>{label}</Txt>
      <Pressable
        onPress={() => setOpen(true)}
        style={{ height: 50, borderRadius: R.md, backgroundColor: C.bgDeep, borderWidth: 1.5, borderColor: C.line, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center' }}>
        <Txt style={{ flex: 1, fontFamily: F.medium, fontSize: 17 }}>{value}</Txt>
        <Icon name="down" color={C.textDim} size={20} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(29,24,56,0.45)', alignItems: 'center', justifyContent: 'center' }} onPress={() => setOpen(false)}>
          <View style={{ width: 420, maxHeight: '80%', backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, paddingVertical: 8 }}>
            <ScrollView>
              {options.map((o) => (
                <Pressable
                  key={o}
                  onPress={() => {
                    onChange(o);
                    setOpen(false);
                  }}
                  style={({ pressed }) => ({ height: 54, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', backgroundColor: pressed ? C.card : 'transparent' })}>
                  <Txt style={{ flex: 1, fontFamily: o === value ? F.bold : F.medium, color: o === value ? C.focus : C.text }}>{o}</Txt>
                  {o === value && <Icon name="check" color={C.focus} size={20} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

export function GenderPicker({ value, onChange }: { value: string; onChange: (v: 'male' | 'female' | 'other') => void }) {
  const { t } = useT();
  return (
    <View style={{ gap: 8 }}>
      <Txt style={{ fontFamily: F.semibold, fontSize: 14, color: C.textDim }}>{t('gender')}</Txt>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {(['male', 'female', 'other'] as const).map((g) => (
          <Chip key={g} label={t(g)} selected={value === g} onPress={() => onChange(g)} />
        ))}
      </View>
    </View>
  );
}
