import type { DiaryFeatureAdapters } from '@/features/diary/adapters/types';

import type { DiaryFeatureMenuConfig, DiaryFeatureRuntimeConfig } from './config';

type RegisterDiaryMenuActionParams = {
  adapters: DiaryFeatureAdapters;
  menu: DiaryFeatureMenuConfig;
  runtime: DiaryFeatureRuntimeConfig;
  enabled: boolean;
};

export const registerDiaryMenuAction = ({
  adapters,
  menu,
  runtime,
  enabled,
}: RegisterDiaryMenuActionParams) => {
  if (!enabled) {
    return;
  }

  adapters.userMenu.registerAction({
    id: menu.id,
    menuId: menu.menuId,
    order: menu.order,
    resolve: (context) => {
      if (!context.session?.user?.id) {
        return null;
      }

      const translator = adapters
        .createTranslationAdapter(context.locale)
        .getNamespace(runtime.namespace ?? 'diary')
        .getNamespace('menu');

      return {
        label: translator.t('label'),
        execute: (execContext) => {
          execContext.closeMenu();
          const targetIndex = menu.initialIndex ?? 1;
          adapters.routing.navigateToDiaryIndex(targetIndex);
        },
      };
    },
  });
};
