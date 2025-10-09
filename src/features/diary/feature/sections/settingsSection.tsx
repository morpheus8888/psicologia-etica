import type { DiaryFeatureAdapters } from '@/features/diary/adapters/types';
import type { SettingsSectionContext } from '@/registries/settingsRegistry';

import type { DiaryFeatureRuntimeConfig } from '../config';

type CreateDiarySettingsResolverParams = {
  adapters: DiaryFeatureAdapters;
  runtime: DiaryFeatureRuntimeConfig;
  enabled: boolean;
};

export const createDiarySettingsResolver = ({
  adapters,
  runtime,
  enabled,
}: CreateDiarySettingsResolverParams) => {
  return (context: SettingsSectionContext) => {
    if (!enabled || !context.userId) {
      return null;
    }

    const translator = adapters
      .createTranslationAdapter(context.locale)
      .getNamespace(runtime.namespace ?? 'diary')
      .getNamespace('settings');

    return {
      title: translator.t('title'),
      description: translator.t('description'),
      render: () => (
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>{translator.t('intro')}</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>{translator.t('pointPrivacy')}</li>
            <li>{translator.t('pointSharing')}</li>
            <li>{translator.t('pointCoach')}</li>
          </ul>
        </div>
      ),
    };
  };
};
