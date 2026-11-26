import React from 'react';
import { View } from 'react-native';

import { C, F, R } from '@/constants/theme';
import { Icon, IconName } from './Icon';
import { Body, PressCard, Txt } from './ui';

export function ChoiceCard({
  icon,
  art,
  tint,
  title,
  body,
  onPress,
  width = 300,
  disabled,
}: {
  icon?: IconName;
  art?: React.ReactNode;
  tint: string;
  title: string;
  body: string;
  onPress: () => void;
  width?: number;
  disabled?: boolean;
}) {
  return (
    <PressCard onPress={onPress} disabled={disabled} style={{ width, padding: 28, gap: 18, minHeight: 300 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ width: 96, height: 96, borderRadius: R.lg, backgroundColor: tint + '22', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {art ?? (icon && <Icon name={icon} size={46} color={tint} stroke={2.2} />)}
        </View>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrow" size={20} color={tint} />
        </View>
      </View>
      <View style={{ flex: 1, gap: 8, marginTop: 24 }}>
        <Txt style={{ fontFamily: F.black, fontSize: 26 }}>{title}</Txt>
        <Body>{body}</Body>
      </View>
      <View style={{ height: 4, width: 48, borderRadius: 2, backgroundColor: tint }} />
    </PressCard>
  );
}
