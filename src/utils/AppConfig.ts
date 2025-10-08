import type { LocalePrefix } from 'node_modules/next-intl/dist/types/src/routing/types';

const localePrefix: LocalePrefix = 'as-needed';

// FIXME: Update this configuration file based on your project information
export const AppConfig = {
  name: 'Psicologia Etica',
  locales: [
    {
      id: 'it',
      name: 'Italiano',
    },
    {
      id: 'en',
      name: 'English',
    },
  ],
  defaultLocale: 'it',
  localePrefix,
};

export const AllLocales = AppConfig.locales.map(locale => locale.id);
