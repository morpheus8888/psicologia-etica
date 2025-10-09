import type { RoutingAdapter } from '@/features/diary/adapters/types';

type RoutingAdapterOptions = {
  basePath: string;
  dateQueryParam?: string;
  indexQueryParam?: string;
};

const isClient = () => typeof window !== 'undefined';

const buildUrl = (basePath: string, params: Record<string, string | undefined>) => {
  if (!isClient()) {
    return basePath;
  }

  const url = new URL(basePath, window.location.origin);

  Object.entries(params).forEach(([key, value]) => {
    if (!value) {
      url.searchParams.delete(key);
      return;
    }
    url.searchParams.set(key, value);
  });

  return `${url.pathname}${url.search}`;
};

export const createRoutingAdapter = (
  options: RoutingAdapterOptions,
): RoutingAdapter => {
  const dateParam = options.dateQueryParam ?? 'date';
  const indexParam = options.indexQueryParam ?? 'index';

  const pushUrl = (path: string) => {
    if (!isClient()) {
      return;
    }

    window.history.pushState(null, '', path);
  };

  return {
    navigateToDiaryDate(dateISO) {
      const url = buildUrl(options.basePath, {
        [dateParam]: dateISO,
        [indexParam]: undefined,
      });
      pushUrl(url);
    },

    navigateToDiaryIndex(index) {
      const url = buildUrl(options.basePath, {
        [indexParam]: String(index),
        [dateParam]: undefined,
      });
      pushUrl(url);
    },

    readDeepLink() {
      if (!isClient()) {
        return null;
      }

      const params = new URLSearchParams(window.location.search);
      const dateISO = params.get(dateParam) ?? undefined;
      const indexValue = params.get(indexParam);
      const index = indexValue ? Number.parseInt(indexValue, 10) : undefined;

      return {
        dateISO,
        index: Number.isFinite(index) ? index : undefined,
      };
    },
  };
};
