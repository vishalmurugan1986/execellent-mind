import { useCallback } from 'react';

import { useApp } from '@/store/AppStore';
import { DICT, EN, StringKey } from './strings';

export function useT() {
  const { settings } = useApp();
  const lang = settings.lang;
  const t = useCallback(
    (key: StringKey, vars?: Record<string, string | number>) => {
      let s = DICT[lang][key] ?? EN[key];
      if (vars) for (const k of Object.keys(vars)) s = s.replace(`{${k}}`, String(vars[k]));
      return s;
    },
    [lang],
  );
  return { t, lang };
}
