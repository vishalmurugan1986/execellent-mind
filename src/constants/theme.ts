// "Daybreak" palette: airy lavender surfaces, violet for Focus, teal for Calm, sunshine for rewards.
export const C = {
  bg: '#F6F4FF',
  bgDeep: '#ECE8FB',
  surface: '#FFFFFF',
  card: '#F2EFFD',
  cardHi: '#E5DFFB',
  line: '#DED8F2',
  text: '#1D1838',
  textDim: '#55506F',
  textMute: '#8D88A5',
  focus: '#6C47FF',
  focusDeep: '#4F2FE0',
  calm: '#0BA59A',
  calmDeep: '#08857C',
  sun: '#FF9F1C',
  sunSoft: '#FFE7B8',
  coral: '#F2456B',
  good: '#1FAE5B',
  warn: '#F5A623',
  ink: '#FFFFFF', // text on a filled accent
  paper: '#FFFFFF',
  night: '#1D1838',
};

export const F = {
  regular: 'Nunito_500Medium',
  medium: 'Nunito_600SemiBold',
  semibold: 'Nunito_700Bold',
  bold: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
};

export const R = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 };

export type Protocol = 'focus' | 'calm';

export const protocolColor = (p: Protocol) => (p === 'focus' ? C.focus : C.calm);
