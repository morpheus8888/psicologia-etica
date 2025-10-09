import type { ReactNode } from 'react';

export type DiaryRouteProps = {
  locale: string;
  params: Record<string, string | string[]>;
  searchParams: Record<string, string | string[] | undefined>;
};

export type DiaryRouteMount = (props: DiaryRouteProps) => Promise<ReactNode> | ReactNode;

type DiaryRouteRegistryState = Map<string, DiaryRouteMount>;

const registry: DiaryRouteRegistryState = new Map();

export const registerDiaryRouteMount = (id: string, mount: DiaryRouteMount) => {
  registry.set(id, mount);
};

export const unregisterDiaryRouteMount = (id: string) => {
  registry.delete(id);
};

export const getDiaryRouteMount = (id: string) => {
  return registry.get(id) ?? null;
};
