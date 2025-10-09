import type { UserMenuAdapter } from '@/features/diary/adapters/types';
import { registerUserMenuAction } from '@/registries/userMenuRegistry';

export const userMenuAdapter: UserMenuAdapter = {
  registerAction(config) {
    registerUserMenuAction({
      menuId: config.menuId,
      entry: {
        id: config.id,
        order: config.order,
        resolve(context) {
          const resolved = config.resolve(context);

          if (!resolved) {
            return null;
          }

          return {
            id: config.id,
            label: resolved.label,
            disabled: resolved.disabled,
            href: resolved.href,
            onSelect: resolved.href
              ? undefined
              : execContext => resolved.execute(execContext),
          };
        },
      },
    });
  },
};
