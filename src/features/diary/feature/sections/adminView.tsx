import type { DiaryFeatureAdapters } from '@/features/diary/adapters/types';
import type { AdminViewContext } from '@/registries/adminRegistry';

import { DiaryCoachPromptsAdmin } from '../components/DiaryCoachPromptsAdmin';
import type { DiaryFeatureRuntimeConfig } from '../config';

type CreateDiaryAdminViewResolverParams = {
  adapters: DiaryFeatureAdapters;
  runtime: DiaryFeatureRuntimeConfig;
  enabled: boolean;
};

export const createDiaryAdminViewResolver = ({
  adapters,
  runtime,
  enabled,
}: CreateDiaryAdminViewResolverParams) => {
  return (context: AdminViewContext) => {
    if (!enabled || context.role !== 'admin') {
      return null;
    }

    const translator = adapters
      .createTranslationAdapter(context.locale)
      .getNamespace(runtime.namespace ?? 'diary')
      .getNamespace('admin');
    const coachTranslator = translator.getNamespace('coachPrompts');
    const headers = coachTranslator.getNamespace('headers');

    return {
      title: coachTranslator.t('title'),
      description: coachTranslator.t('description'),
      render: () => (
        <DiaryCoachPromptsAdmin
          locale={context.locale}
          scope={runtime.coachScope}
          tags={runtime.coachTags}
          labels={{
            actionsHint: coachTranslator.t('actionsHint'),
            empty: coachTranslator.t('empty'),
            statusActive: coachTranslator.t('statusActive'),
            statusInactive: coachTranslator.t('statusInactive'),
            headers: {
              locale: headers.t('locale'),
              scope: headers.t('scope'),
              text: headers.t('text'),
              tags: headers.t('tags'),
              weight: headers.t('weight'),
              status: headers.t('status'),
              window: headers.t('window'),
            },
          }}
        />
      ),
    };
  };
};
