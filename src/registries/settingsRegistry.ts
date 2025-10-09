import type { ReactNode } from 'react';

export type SettingsSectionContext = {
  locale: string;
  userId: string | null;
};

export type SettingsResolvedSection = {
  title: string;
  description?: string;
  render: () => ReactNode;
};

export type SettingsRegistryEntry = {
  id: string;
  order?: number;
  resolve: (context: SettingsSectionContext) => SettingsResolvedSection | null;
};

type SettingsRegistryState = Map<string, SettingsRegistryEntry>;

const registry: SettingsRegistryState = new Map();

export const registerSettingsSection = (entry: SettingsRegistryEntry) => {
  registry.set(entry.id, entry);
};

export const unregisterSettingsSection = (entryId: string) => {
  registry.delete(entryId);
};

export const listSettingsSections = () => {
  return Array.from(registry.values()).sort((a, b) => {
    const orderA = a.order ?? Number.POSITIVE_INFINITY;
    const orderB = b.order ?? Number.POSITIVE_INFINITY;

    return orderA - orderB;
  });
};
