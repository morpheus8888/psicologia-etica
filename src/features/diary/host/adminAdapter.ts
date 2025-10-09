import type { AdminRegistryAdapter } from '@/features/diary/adapters/types';
import { registerAdminView } from '@/registries/adminRegistry';

export const adminRegistryAdapter: AdminRegistryAdapter = {
  registerView(entry) {
    registerAdminView({
      id: entry.id,
      order: entry.order,
      resolve: context => entry.resolve(context),
    });
  },
};
