import type { FeatureFlagsAdapter } from '@/features/diary/adapters/types';

const enabledFlags = new Set<string>();

if (process.env.NEXT_PUBLIC_ENABLE_DIARY !== 'false') {
  enabledFlags.add('diary');
}

if (process.env.NEXT_PUBLIC_ENABLE_COACH !== 'false') {
  enabledFlags.add('coach');
}

export const featureFlagsAdapter: FeatureFlagsAdapter = {
  isEnabled(flag) {
    return enabledFlags.has(flag);
  },
};
