import type { DiaryFeatureAdapters } from '@/features/diary/adapters/types';

export type DiaryFeatureMenuConfig = {
  id: string;
  menuId: string;
  order?: number;
  initialIndex?: number;
};

export type DiaryFeatureRouteConfig = {
  id: string;
  basePath: string;
  dateQueryParam?: string;
  indexQueryParam?: string;
};

export type DiaryFeatureSettingsConfig = {
  id: string;
  order?: number;
};

export type DiaryFeatureAdminConfig = {
  id: string;
  order?: number;
};

export type DiaryFeatureFlagsConfig = {
  diary?: 'diary';
  coach?: 'coach';
};

export type DiaryFeatureRuntimeConfig = {
  namespace?: string;
  diaryGraceMinutes?: number | null;
  coachScope?: string;
  coachTags?: string[];
  promptLocaleFallback?: string;
  getNow?: () => Date;
};

export type DiaryFeatureRegistrationOptions = {
  adapters: DiaryFeatureAdapters;
  menu: DiaryFeatureMenuConfig;
  route: DiaryFeatureRouteConfig;
  settings: DiaryFeatureSettingsConfig;
  admin: DiaryFeatureAdminConfig;
  flags?: DiaryFeatureFlagsConfig;
  runtime?: DiaryFeatureRuntimeConfig;
};
