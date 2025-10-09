import type {
  FeatureFlagsAdapter,
} from '@/features/diary/adapters/types';

import { setDiaryServerState } from '../server/runtime';
import type {
  DiaryFeatureFlagsConfig,
  DiaryFeatureRegistrationOptions,
  DiaryFeatureRuntimeConfig,
} from './config';
import { registerDiaryMenuAction } from './menuAction';
import { createDiaryRouteMount } from './routeMount';
import { createDiaryAdminViewResolver } from './sections/adminView';
import { createDiarySettingsResolver } from './sections/settingsSection';

type FeatureFlagKey = 'diary' | 'coach';

const resolveFlag = (
  adapter: FeatureFlagsAdapter | undefined,
  flagConfig: DiaryFeatureFlagsConfig | undefined,
  key: FeatureFlagKey,
) => {
  const flagName = flagConfig?.[key] ?? key;

  if (!adapter) {
    return true;
  }

  return adapter.isEnabled(flagName);
};

export const registerDiaryFeature = ({
  adapters,
  menu,
  route,
  settings,
  admin,
  flags,
  runtime,
}: DiaryFeatureRegistrationOptions) => {
  const diaryEnabled = resolveFlag(adapters.featureFlags, flags, 'diary');
  const coachEnabled = resolveFlag(adapters.featureFlags, flags, 'coach');

  const runtimeConfig: DiaryFeatureRuntimeConfig = {
    namespace: runtime?.namespace ?? 'diary',
    diaryGraceMinutes: runtime?.diaryGraceMinutes ?? null,
    coachScope: runtime?.coachScope,
    coachTags: runtime?.coachTags,
    promptLocaleFallback: runtime?.promptLocaleFallback ?? 'it',
    getNow: runtime?.getNow,
  };

  registerDiaryMenuAction({
    adapters,
    menu,
    runtime: runtimeConfig,
    enabled: diaryEnabled,
  });

  adapters.settingsRegistry.registerSection({
    id: settings.id,
    order: settings.order,
    resolve: createDiarySettingsResolver({
      adapters,
      runtime: runtimeConfig,
      enabled: diaryEnabled,
    }),
  });

  adapters.adminRegistry.registerView({
    id: admin.id,
    order: admin.order,
    resolve: createDiaryAdminViewResolver({
      adapters,
      runtime: runtimeConfig,
      enabled: coachEnabled,
    }),
  });

  if (!diaryEnabled) {
    return;
  }

  setDiaryServerState({
    adapters,
    runtime: runtimeConfig,
    flags,
  });

  adapters.diaryRouteRegistry.registerMount(
    route.id,
    createDiaryRouteMount({
      adapters,
      runtime: runtimeConfig,
      route,
      coachEnabled,
    }),
  );
};
