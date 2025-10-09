import type { SettingsRegistryAdapter } from '@/features/diary/adapters/types';
import { registerSettingsSection } from '@/registries/settingsRegistry';

export const settingsRegistryAdapter: SettingsRegistryAdapter = {
  registerSection(entry) {
    registerSettingsSection({
      id: entry.id,
      order: entry.order,
      resolve: context => entry.resolve(context),
    });
  },
};
