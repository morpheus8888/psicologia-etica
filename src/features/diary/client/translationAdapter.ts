import type { TranslationAdapter } from '@/features/diary/adapters/types';

type TranslateFn = (key: string, vars?: Record<string, any>) => string;

export const createTranslationAdapter = (translate: TranslateFn): TranslationAdapter => {
  const adapter: TranslationAdapter = {
    t: (key, vars) => translate(key, vars),
    getNamespace(ns: string) {
      return createTranslationAdapter((key, vars) => translate(`${ns}.${key}`, vars));
    },
  };

  return adapter;
};

export const createTranslationAdapterFactory = (
  getTranslate: (locale: string) => TranslateFn,
) => {
  return (locale: string) => {
    return createTranslationAdapter((key, vars) => getTranslate(locale)(key, vars));
  };
};
