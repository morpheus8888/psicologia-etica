import type { DiaryFeatureAdapters } from '@/features/diary/adapters/types';

import type {
  DiaryFeatureFlagsConfig,
  DiaryFeatureRuntimeConfig,
} from '../feature/config';

type DiaryServerState = {
  adapters: DiaryFeatureAdapters;
  runtime: DiaryFeatureRuntimeConfig;
  flags?: DiaryFeatureFlagsConfig;
};

let state: DiaryServerState | null = null;

export const setDiaryServerState = (next: DiaryServerState) => {
  state = next;
};

export const getDiaryServerState = (): DiaryServerState => {
  if (!state) {
    throw new Error('DIARY_SERVER_NOT_INITIALISED');
  }

  return state;
};
