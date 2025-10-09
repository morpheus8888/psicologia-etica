'use client';

import { useState } from 'react';

import type {
  ProfessionalSummary,
  TranslationAdapter,
  UIAdapter,
} from '@/features/diary/adapters/types';

type DiarySharePanelProps = {
  open: boolean;
  onClose: () => void;
  professionals: ProfessionalSummary[];
  sharedProfessionalIds: string[];
  onShare: (professionalId: string) => Promise<void>;
  onRevoke: (professionalId: string) => Promise<void>;
  t: TranslationAdapter;
  ui: UIAdapter;
  isDesktop: boolean;
};

export const DiarySharePanel = ({
  open,
  onClose,
  professionals,
  sharedProfessionalIds,
  onShare,
  onRevoke,
  t,
  ui,
  isDesktop,
}: DiarySharePanelProps) => {
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  const handleToggle = async (professional: ProfessionalSummary, alreadyShared: boolean) => {
    setPendingId(professional.id);
    try {
      if (alreadyShared) {
        await onRevoke(professional.id);
        ui.toast({
          title: t.t('toastRevoked', { name: professional.displayName }),
          variant: 'warning',
        });
      } else {
        await onShare(professional.id);
        ui.toast({
          title: t.t('toastShared', { name: professional.displayName }),
          variant: 'success',
        });
      }
    } catch (error) {
      console.error('Failed to toggle share', error);
      ui.toast({
        title: t.t('toastErrorTitle'),
        description: t.t('toastErrorDescription'),
        variant: 'destructive',
      });
    } finally {
      setPendingId(null);
    }
  };

  const sharedSet = new Set(sharedProfessionalIds);

  const Panel = isDesktop ? ui.dialog.Content : ui.bottomSheet.Content;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-10 md:items-center md:px-0">
      <Panel className="w-full max-w-lg rounded-2xl border border-border/50 bg-background p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{t.t('title')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t.t('subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted/60"
          >
            {t.t('close')}
          </button>
        </div>

        {professionals.length === 0
          ? (
              <p className="mt-6 rounded-xl border border-dashed border-muted-foreground/40 bg-muted/20 p-4 text-sm text-muted-foreground">
                {t.t('empty')}
              </p>
            )
          : (
              <ul className="mt-6 space-y-3">
                {professionals.map((professional) => {
                  const alreadyShared = sharedSet.has(professional.id);
                  const pending = pendingId === professional.id;

                  return (
                    <li
                      key={professional.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/10 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-foreground">{professional.displayName}</p>
                        {professional.specialty && (
                          <p className="text-xs text-muted-foreground">{professional.specialty}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => void handleToggle(professional, alreadyShared)}
                        className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                          alreadyShared
                            ? 'border border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/20'
                            : 'border border-primary/50 bg-primary/10 text-primary hover:bg-primary/20'
                        } ${pending ? 'opacity-60' : ''}`}
                      >
                        {pending
                          ? t.t('pending')
                          : alreadyShared
                            ? t.t('revoke')
                            : t.t('share')}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
      </Panel>
    </div>
  );
};
