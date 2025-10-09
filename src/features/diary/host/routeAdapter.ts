import type { DiaryRouteRegistryAdapter } from '@/features/diary/adapters/types';
import { registerDiaryRouteMount } from '@/registries/diaryRouteRegistry';

export const diaryRouteRegistryAdapter: DiaryRouteRegistryAdapter = {
  registerMount(id, mount) {
    registerDiaryRouteMount(id, mount);
  },
};
