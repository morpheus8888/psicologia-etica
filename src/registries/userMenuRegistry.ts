import type { Session } from 'next-auth';

export type MenuId = string;

export type UserMenuActionContext = {
  session: Session | null;
  locale: string;
};

export type UserMenuExecuteContext = UserMenuActionContext & {
  closeMenu: () => void;
};

export type UserMenuResolvedItem = {
  id: string;
  label: string;
  disabled?: boolean;
  onSelect?: (context: UserMenuExecuteContext) => void | Promise<void>;
  href?: string;
};

export type UserMenuRegistryEntry = {
  id: string;
  order?: number;
  resolve: (context: UserMenuActionContext) => UserMenuResolvedItem | null;
};

type UserMenuRegistryState = Map<string, Map<string, UserMenuRegistryEntry>>;

const registry: UserMenuRegistryState = new Map();

export type RegisterUserMenuActionOptions = {
  menuId: MenuId;
  entry: UserMenuRegistryEntry;
};

export const registerUserMenuAction = ({ menuId, entry }: RegisterUserMenuActionOptions) => {
  const menuMap = registry.get(menuId) ?? new Map<string, UserMenuRegistryEntry>();
  menuMap.set(entry.id, entry);
  registry.set(menuId, menuMap);
};

export const unregisterUserMenuAction = (menuId: MenuId, entryId: string) => {
  const menuMap = registry.get(menuId);
  if (!menuMap) {
    return;
  }

  menuMap.delete(entryId);

  if (menuMap.size === 0) {
    registry.delete(menuId);
  }
};

export const listUserMenuActions = (menuId: MenuId) => {
  const menuMap = registry.get(menuId);
  if (!menuMap) {
    return [] as UserMenuRegistryEntry[];
  }

  return Array.from(menuMap.values()).sort((a, b) => {
    const orderA = a.order ?? Number.POSITIVE_INFINITY;
    const orderB = b.order ?? Number.POSITIVE_INFINITY;

    return orderA - orderB;
  });
};
