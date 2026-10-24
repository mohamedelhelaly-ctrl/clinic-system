import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Gender, Language, LocalizedText } from '../domain';
import { ar, arFeminine } from './ar';
import type { MessageKey } from './en';
import { en } from './en';
import type { Formatters } from './format';
import { createFormatters } from './format';

export type TranslateParams = Record<string, string | number>;

export interface I18n {
  lang: Language;
  dir: 'ltr' | 'rtl';
  t(key: MessageKey, params?: TranslateParams, options?: { gender?: Gender }): string;
  /** Picks the display form of stored text for the current language. */
  text(value: LocalizedText | undefined): string;
  setLang(lang: Language): void;
  toggleLang(): void;
  fmt: Formatters;
}

const DICTS = { en, ar } as const;
const STORAGE_KEY = 'clinic:lang';

export function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

/** Both language forms of a UI string, for values stored on records (e.g. a default reason). */
export function bilingual(key: MessageKey): LocalizedText {
  return { value: en[key], ar: ar[key] };
}

const I18nContext = createContext<I18n | null>(null);

function storedLanguage(): Language | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === 'en' || v === 'ar' ? v : null;
  } catch {
    return null;
  }
}

export function I18nProvider({
  initialLanguage,
  children,
}: {
  initialLanguage: Language | null;
  children: ReactNode;
}) {
  const [lang, setLang] = useState<Language>(initialLanguage ?? storedLanguage() ?? 'en');

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
    document.documentElement.lang = lang;
  }, [lang]);

  const toggleLang = useCallback(() => setLang((l) => (l === 'ar' ? 'en' : 'ar')), []);

  const value = useMemo<I18n>(() => {
    const dict = DICTS[lang];
    return {
      lang,
      dir: lang === 'ar' ? 'rtl' : 'ltr',
      t: (key, params, options) => {
        const template = (lang === 'ar' && options?.gender === 'F' && arFeminine[key]) || dict[key];
        return interpolate(template, params);
      },
      text: (v) => (v ? (lang === 'ar' && v.ar ? v.ar : v.value) : ''),
      setLang,
      toggleLang,
      fmt: createFormatters(lang, dict.egp),
    };
  }, [lang, toggleLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const i18n = useContext(I18nContext);
  if (!i18n) throw new Error('useI18n must be used inside <I18nProvider>');
  return i18n;
}
