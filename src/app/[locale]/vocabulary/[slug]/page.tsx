import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';

import { getVocabularyEntryBySlug } from '@/features/vocabulary/queries';
import { authOptions } from '@/libs/auth/config';
import { getI18nPath } from '@/utils/Helpers';

type PageProps = {
  params: { locale: string; slug: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const entry = await getVocabularyEntryBySlug(params.slug);

  if (!entry) {
    return {};
  }

  const t = await getTranslations({ locale: params.locale, namespace: 'VocabularyDetail' });

  return {
    title: `${entry.term} — ${t('meta_suffix')}`,
    description: entry.excerpt,
  };
}

export default async function VocabularyEntryPage({ params }: PageProps) {
  unstable_setRequestLocale(params.locale);

  const [t, entry, session] = await Promise.all([
    getTranslations({ locale: params.locale, namespace: 'VocabularyDetail' }),
    getVocabularyEntryBySlug(params.slug),
    getServerSession(authOptions),
  ]);

  if (!entry) {
    notFound();
  }

  const isAdmin = session?.user?.role === 'admin';
  const dateFormatter = new Intl.DateTimeFormat(params.locale, { dateStyle: 'long' });
  const publishedLabel = entry.publishedAt
    ? t('published_on', { date: dateFormatter.format(new Date(entry.publishedAt)) })
    : t('published_unknown');

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-8 py-12">
      <header className="space-y-4">
        <p className="text-sm uppercase tracking-wide text-primary/70">{t('badge')}</p>
        <h1 className="text-4xl font-semibold text-foreground sm:text-5xl">{entry.term}</h1>
        <p className="text-lg text-muted-foreground">{entry.excerpt}</p>
        <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
          <span>{publishedLabel}</span>
          {isAdmin && (
            <Link
              href={getI18nPath(`/dashboard/admin/vocabulary/${entry.slug}/edit`, params.locale)}
              className="rounded-full border border-border px-3 py-1 text-muted-foreground transition hover:text-foreground"
            >
              {t('edit')}
            </Link>
          )}
        </div>
      </header>

      {/* Admin-authored content, stored as HTML. */}
      {/* eslint-disable-next-line react-dom/no-dangerously-set-innerhtml */}
      <div
        className="prose prose-neutral dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: entry.content }}
      />
    </article>
  );
}
