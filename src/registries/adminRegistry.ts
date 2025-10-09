import type { ReactNode } from 'react';

export type AdminViewContext = {
  locale: string;
  userId: string | null;
  role: string | null;
};

export type AdminResolvedView = {
  title: string;
  description?: string;
  render: () => ReactNode;
};

export type AdminRegistryEntry = {
  id: string;
  order?: number;
  resolve: (context: AdminViewContext) => AdminResolvedView | null;
};

type AdminRegistryState = Map<string, AdminRegistryEntry>;

const registry: AdminRegistryState = new Map();

export const registerAdminView = (entry: AdminRegistryEntry) => {
  registry.set(entry.id, entry);
};

export const unregisterAdminView = (entryId: string) => {
  registry.delete(entryId);
};

export const listAdminViews = () => {
  return Array.from(registry.values()).sort((a, b) => {
    const orderA = a.order ?? Number.POSITIVE_INFINITY;
    const orderB = b.order ?? Number.POSITIVE_INFINITY;

    return orderA - orderB;
  });
};
