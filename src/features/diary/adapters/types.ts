/* eslint-disable ts/method-signature-style */

import type { ReactElement, ReactNode } from 'react';

import type { AdminViewContext } from '@/registries/adminRegistry';
import type { DiaryRouteMount } from '@/registries/diaryRouteRegistry';
import type { SettingsSectionContext } from '@/registries/settingsRegistry';
import type {
  UserMenuActionContext,
  UserMenuExecuteContext,
} from '@/registries/userMenuRegistry';

export type DiaryKdfParams = Record<string, unknown>;

export type CipherBundle = {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  aad?: Uint8Array | null;
};

export type DiaryEntryShareMeta = {
  professionalId: string;
  sharedAt: string;
};

export type DiaryEntryRecord = CipherBundle & {
  id: string;
  dateISO: string;
  wordCount?: number | null;
  mood?: string | null;
  tzAtEntry?: string | null;
  sharedWith?: DiaryEntryShareMeta[];
};

export type DiaryEntryWrite = CipherBundle & {
  wordCount?: number | null;
  mood?: string | null;
  tzAtEntry?: string | null;
};

export type DiaryEntryMeta = {
  dateISO: string;
  wordCount?: number | null;
  mood?: string | null;
  tzAtEntry?: string | null;
  sharedProfessionalIds?: string[];
  goalIds?: string[];
};

export type DiaryEntryMetaRange = {
  from: string;
  to: string;
};

export type DiaryGoalRecord = CipherBundle & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type DiaryGoalWrite = CipherBundle & {
  id?: string;
};

export type DiaryGoalLink = {
  goalId: string;
  entryId: string;
};

export type DiaryCoachPromptRecord = {
  id: string;
  locale: string;
  scope: string;
  text: string;
  tags: string[];
  weight: number;
  enabled: boolean;
  startAt?: string | null;
  endAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DiaryCoachPromptInput = {
  locale: string;
  scope: string;
  text: string;
  tags: string[];
  weight: number;
  enabled: boolean;
  startAt?: string | null;
  endAt?: string | null;
};

export type DiaryCoachPromptPatch = Partial<DiaryCoachPromptInput>;

export type DiaryCoachPromptFilter = {
  locale?: string;
  scope?: string;
  tags?: string[];
  includeDisabled?: boolean;
  activeAt?: Date;
};

export type DiaryShareEnvelope = Uint8Array;

export type ProfessionalSummary = {
  id: string;
  displayName: string;
  specialty?: string | null;
};

export type AuthAdapter = {
  getCurrentUser: () => Promise<{ id: string } | null>;
  requireAuth: () => Promise<{ id: string }>;
  getCurrentSession(): Promise<{ id: string; role: string } | null>;
};

export type ProfileAdapter = {
  getUserProfile(userId: string): Promise<{
    avatarAnimal: string | null;
    timezone?: string | null;
  } | null>;
};

export type CryptoAdapter = {
  deriveKey(
    password: string,
    salt: Uint8Array,
    params: DiaryKdfParams,
  ): Promise<CryptoKey>;
  encrypt(
    plain: Uint8Array,
    key: CryptoKey,
    aad?: Uint8Array | null,
  ): Promise<{ ct: Uint8Array; nonce: Uint8Array }>;
  decrypt(
    ct: Uint8Array,
    key: CryptoKey,
    aad?: Uint8Array | null,
    nonce?: Uint8Array,
  ): Promise<Uint8Array>;
};

export type KeyringStoreAdapter = {
  getEncMasterKey(
    userId: string,
  ): Promise<{
    encMasterKey: Uint8Array;
    salt: Uint8Array;
    kdfParams: DiaryKdfParams;
    createdAt: string;
    updatedAt: string;
  } | null>;
  putEncMasterKey(
    userId: string,
    data: {
      encMasterKey: Uint8Array;
      salt: Uint8Array;
      kdfParams: DiaryKdfParams;
    },
  ): Promise<void>;
};

export type DiaryStoreAdapter = {
  getEntryByDate: (userId: string, dateISO: string) => Promise<DiaryEntryRecord | null>;
  upsertEntry: (userId: string, dateISO: string, payload: DiaryEntryWrite) => Promise<DiaryEntryRecord>;
  listEntriesMeta(
    userId: string,
    range: DiaryEntryMetaRange,
  ): Promise<DiaryEntryMeta[]>;
  linkGoalToEntry: (link: DiaryGoalLink) => Promise<void>;
  unlinkGoalFromEntry: (link: DiaryGoalLink) => Promise<void>;
  listGoals: (userId: string) => Promise<DiaryGoalRecord[]>;
  upsertGoal: (userId: string, payload: DiaryGoalWrite) => Promise<DiaryGoalRecord>;
  deleteGoal: (userId: string, goalId: string) => Promise<void>;
  listSharedProfessionals: (entryId: string, userId: string) => Promise<DiaryEntryShareMeta[]>;
  shareEntry(
    userId: string,
    entryId: string,
    professionalId: string,
    envelope: DiaryShareEnvelope,
  ): Promise<void>;
  revokeShare: (userId: string, entryId: string, professionalId: string) => Promise<void>;
  listCoachPrompts: (filter: DiaryCoachPromptFilter) => Promise<DiaryCoachPromptRecord[]>;
  createCoachPrompt: (input: DiaryCoachPromptInput) => Promise<DiaryCoachPromptRecord>;
  updateCoachPrompt(
    id: string,
    patch: DiaryCoachPromptPatch,
  ): Promise<DiaryCoachPromptRecord>;
  deleteCoachPrompt: (id: string) => Promise<void>;
};

export type ProDirectoryAdapter = {
  listMyProfessionals: (userId: string) => Promise<ProfessionalSummary[]>;
  getProfessionalPublicKey: (professionalId: string) => Promise<Uint8Array>;
};

export type RoutingAdapter = {
  navigateToDiaryDate: (dateISO: string) => void;
  navigateToDiaryIndex: (index: number) => void;
  readDeepLink(): { dateISO?: string; index?: number } | null;
};

export type TranslationAdapter = {
  t: (key: string, vars?: Record<string, any>) => string;
  getNamespace: (ns: string) => TranslationAdapter;
};

export type TranslationAdapterFactory = (locale: string) => TranslationAdapter;

export type PopoverAdapter = {
  Root: (props: { children: ReactNode }) => ReactElement;
  Trigger: (props: { children: ReactNode; asChild?: boolean }) => ReactElement;
  Content: (props: { children: ReactNode; className?: string }) => ReactElement;
};

export type DialogAdapter = {
  Root: (props: { open: boolean; onOpenChange(open: boolean): void; children: ReactNode }) => ReactElement;
  Trigger: (props: { children: ReactNode; asChild?: boolean }) => ReactElement;
  Content: (props: { children: ReactNode; className?: string }) => ReactElement;
};

export type BottomSheetAdapter = {
  Root: (props: { open: boolean; onOpenChange(open: boolean): void; children: ReactNode }) => ReactElement;
  Trigger: (props: { children: ReactNode }) => ReactElement;
  Content: (props: { children: ReactNode; className?: string }) => ReactElement;
};

export type CalendarAdapterProps = {
  selectedDate: Date | null;
  onSelect: (date: Date | null) => void;
  locale: string;
  highlightedDates?: string[];
};

export type CalendarAdapter = (props: CalendarAdapterProps) => ReactElement;

export type HeatmapDatum = {
  dateISO: string;
  value: number;
};

export type HeatmapAdapter = (props: {
  data: HeatmapDatum[];
  onSelect?(dateISO: string): void;
  locale: string;
}) => ReactElement;

export type IconButtonAdapter = (props: {
  icon: ReactElement;
  label: string;
  onClick?: () => void;
  variant?: 'default' | 'ghost' | 'primary';
  disabled?: boolean;
  className?: string;
}) => ReactElement;

export type TooltipAdapter = {
  Root: (props: { children: ReactNode }) => ReactElement;
  Trigger: (props: { children: ReactNode; asChild?: boolean }) => ReactElement;
  Content: (props: { children: ReactNode; className?: string }) => ReactElement;
};

export type ToastAdapter = (options: {
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  durationMs?: number;
}) => void;

export type UIAdapter = {
  popover: PopoverAdapter;
  dialog: DialogAdapter;
  bottomSheet: BottomSheetAdapter;
  calendar: CalendarAdapter;
  heatmap: HeatmapAdapter;
  iconButton: IconButtonAdapter;
  tooltip: TooltipAdapter;
  toast: ToastAdapter;
  isDesktop: () => boolean;
  themeTokens: {
    card: string;
    surface: string;
    shadow: string;
  };
};

export type FlipPage = {
  id: string;
  render: () => ReactElement;
};

export type FlipAdapter = {
  FlipBook: (props: {
    pages: FlipPage[];
    currentIndex: number;
    onFlip: (index: number) => void;
  }) => ReactElement;
};

export type FeatureFlagsAdapter = {
  isEnabled: (flag: 'diary' | 'coach') => boolean;
};

export type UserMenuAdapter = {
  registerAction(config: {
    id: string;
    menuId: string;
    order?: number;
    resolve(
      context: UserMenuActionContext,
    ): {
      label: string;
      execute: (context: UserMenuExecuteContext) => void | Promise<void>;
      disabled?: boolean;
      href?: string;
    } | null;
  }): void;
};

export type SettingsRegistryAdapter = {
  registerSection(entry: {
    id: string;
    order?: number;
    resolve(
      context: SettingsSectionContext,
    ): {
      title: string;
      description?: string;
      render: () => ReactElement;
    } | null;
  }): void;
};

export type AdminRegistryAdapter = {
  registerView(entry: {
    id: string;
    order?: number;
    resolve(
      context: AdminViewContext,
    ): {
      title: string;
      description?: string;
      render: () => ReactElement;
    } | null;
  }): void;
};

export type DiaryRouteRegistryAdapter = {
  registerMount: (id: string, mount: DiaryRouteMount) => void;
};

export type DiaryFeatureAdapters = {
  auth: AuthAdapter;
  profile: ProfileAdapter;
  crypto: CryptoAdapter;
  keyringStore: KeyringStoreAdapter;
  diaryStore: DiaryStoreAdapter;
  proDirectory: ProDirectoryAdapter;
  routing: RoutingAdapter;
  createTranslationAdapter: TranslationAdapterFactory;
  ui: UIAdapter;
  flip?: FlipAdapter;
  featureFlags?: FeatureFlagsAdapter;
  userMenu: UserMenuAdapter;
  settingsRegistry: SettingsRegistryAdapter;
  adminRegistry: AdminRegistryAdapter;
  diaryRouteRegistry: DiaryRouteRegistryAdapter;
};
