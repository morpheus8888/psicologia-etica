import { createElement, Fragment } from 'react';

import { registerDiaryFeature } from '@/features/diary';
import type { UIAdapter } from '@/features/diary/adapters/types';
import { cryptoAdapter } from '@/features/diary/client/cryptoAdapter';
import { featureFlagsAdapter } from '@/features/diary/client/featureFlagsAdapter';
import { createTranslationAdapterFactory } from '@/features/diary/client/translationAdapter';
import { adminRegistryAdapter } from '@/features/diary/host/adminAdapter';
import { userMenuAdapter } from '@/features/diary/host/menuAdapter';
import { diaryRouteRegistryAdapter } from '@/features/diary/host/routeAdapter';
import { settingsRegistryAdapter } from '@/features/diary/host/settingsAdapter';
import {
  authAdapter,
  diaryStoreAdapter,
  keyringStoreAdapter,
  proDirectoryAdapter,
  profileAdapter,
} from '@/features/diary/server';
import enMessages from '@/locales/en.json';
import itMessages from '@/locales/it.json';

const dictionaries: Record<string, Record<string, unknown>> = {
  en: enMessages,
  it: itMessages,
};

const resolveMessage = (locale: string, key: string) => {
  const dictionary = dictionaries[locale] ?? dictionaries.it;
  return key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, dictionary);
};

const formatMessage = (value: unknown, vars?: Record<string, any>) => {
  if (typeof value !== 'string') {
    return '';
  }

  if (!vars) {
    return value;
  }

  return value.replace(/\{(\w+)\}/g, (_match, token) => {
    const replacement = vars[token];
    return replacement !== undefined ? String(replacement) : '';
  });
};

const createTranslator = createTranslationAdapterFactory((locale) => {
  return (key, vars) => {
    const raw = resolveMessage(locale, key) ?? resolveMessage('it', key);
    const formatted = formatMessage(raw, vars);
    return formatted || key;
  };
});

const noopUiAdapter: UIAdapter = {
  popover: {
    Root: ({ children }) => createElement(Fragment, null, children),
    Trigger: ({ children }) => createElement(Fragment, null, children),
    Content: ({ children }) => createElement(Fragment, null, children),
  },
  dialog: {
    Root: ({ children }) => createElement(Fragment, null, children),
    Trigger: ({ children }) => createElement(Fragment, null, children),
    Content: ({ children }) => createElement(Fragment, null, children),
  },
  bottomSheet: {
    Root: ({ children }) => createElement(Fragment, null, children),
    Trigger: ({ children }) => createElement(Fragment, null, children),
    Content: ({ children }) => createElement(Fragment, null, children),
  },
  calendar: () => createElement(Fragment, null),
  heatmap: () => createElement(Fragment, null),
  iconButton: () => createElement(Fragment, null),
  tooltip: {
    Root: ({ children }) => createElement(Fragment, null, children),
    Trigger: ({ children }) => createElement(Fragment, null, children),
    Content: ({ children }) => createElement(Fragment, null, children),
  },
  toast: () => {},
  isDesktop: () => true,
  themeTokens: {
    card: '',
    surface: '',
    shadow: '',
  },
};

const getLocalePrefix = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  const pathname = window.location.pathname;
  const match = pathname.match(/^\/([a-z]{2})(?:\/|$)/i);
  if (!match) {
    return '';
  }

  const locale = match[1]?.toLowerCase();

  return locale && locale !== 'it' ? `/${locale}` : '';
};

const buildBasePath = () => {
  const prefix = getLocalePrefix();
  const suffix = '/dashboard/diary';
  return prefix ? `${prefix}${suffix}` : suffix;
};

const buildUrl = (params: Record<string, string | undefined>) => {
  if (typeof window === 'undefined') {
    return buildBasePath();
  }

  const url = new URL(buildBasePath(), window.location.origin);

  Object.entries(params).forEach(([key, value]) => {
    if (!value) {
      url.searchParams.delete(key);
      return;
    }
    url.searchParams.set(key, value);
  });

  return `${url.pathname}${url.search}`;
};

const pushUrl = (target: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.history.pushState(null, '', target);
};

const enhancedRoutingAdapter = {
  navigateToDiaryDate(dateISO: string) {
    const target = buildUrl({ date: dateISO, index: undefined });
    pushUrl(target);
  },
  navigateToDiaryIndex(index: number) {
    const target = buildUrl({ index: String(index), date: undefined });
    pushUrl(target);
  },
  readDeepLink() {
    if (typeof window === 'undefined') {
      return null;
    }

    const params = new URLSearchParams(window.location.search);
    const dateISO = params.get('date') ?? undefined;
    const indexValue = params.get('index');
    const index = indexValue ? Number.parseInt(indexValue, 10) : undefined;

    return {
      dateISO,
      index: Number.isFinite(index) ? index : undefined,
    };
  },
};

let registered = false;

export const ensureDiaryFeatureRegistered = () => {
  if (registered) {
    return;
  }

  registered = true;

  registerDiaryFeature({
    adapters: {
      auth: authAdapter,
      profile: profileAdapter,
      crypto: cryptoAdapter,
      keyringStore: keyringStoreAdapter,
      diaryStore: diaryStoreAdapter,
      proDirectory: proDirectoryAdapter,
      routing: enhancedRoutingAdapter,
      createTranslationAdapter: createTranslator,
      ui: noopUiAdapter,
      featureFlags: featureFlagsAdapter,
      userMenu: userMenuAdapter,
      settingsRegistry: settingsRegistryAdapter,
      adminRegistry: adminRegistryAdapter,
      diaryRouteRegistry: diaryRouteRegistryAdapter,
    },
    menu: {
      id: 'diary-app-entry',
      menuId: 'account-menu',
      order: 40,
      initialIndex: 2,
    },
    route: {
      id: 'dashboard-diary',
      basePath: '/dashboard/diary',
      dateQueryParam: 'date',
      indexQueryParam: 'index',
    },
    settings: {
      id: 'diary',
      order: 30,
    },
    admin: {
      id: 'diary-coach',
      order: 50,
    },
    flags: {
      diary: 'diary',
      coach: 'coach',
    },
    runtime: {
      namespace: 'diary',
      diaryGraceMinutes: null,
      promptLocaleFallback: 'it',
    },
  });
};

ensureDiaryFeatureRegistered();
