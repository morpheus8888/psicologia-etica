import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { VocabularySummary } from '@/features/vocabulary/queries';
import { getWordOfTheDay, listVocabularyEntries } from '@/features/vocabulary/queries';
import { authOptions } from '@/libs/auth/config';
import { getI18nPath } from '@/utils/Helpers';

type PageProps = {
  params: { locale: string };
  searchParams?: { q?: string };
};

export default async function VocabularyPage({ params, searchParams }: PageProps) {
  unstable_setRequestLocale(params.locale);

  const searchTerm = typeof searchParams?.q === 'string' ? searchParams.q.trim() : '';

  const [t, session, entries] = await Promise.all([
    getTranslations({ locale: params.locale, namespace: 'Vocabulary' }),
    getServerSession(authOptions),
    listVocabularyEntries(searchTerm),
  ]);

  const isAdmin = session?.user?.role === 'admin';
  const wordOfDay = searchTerm.length === 0 ? await getWordOfTheDay() : null;
  const entriesToShow = wordOfDay
    ? entries.filter(entry => entry.id !== wordOfDay.id)
    : entries;

  const listContent
    = entriesToShow.length === 0
      ? (
          <p className="rounded-lg border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
            {t('empty.state')}
          </p>
        )
      : entriesToShow.map(entry => (
        <VocabularyCard
          key={entry.id}
          entry={entry}
          locale={params.locale}
          isAdmin={isAdmin}
          t={t}
        />
      ));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 py-10">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-wide text-primary/70">{t('intro.badge')}</p>
        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">{t('intro.title')}</h1>
        <p className="max-w-3xl text-base text-muted-foreground">{t('intro.subtitle')}</p>
      </header>

      {wordOfDay && (
        <WordOfDayCard
          entry={wordOfDay}
          t={t}
          locale={params.locale}
          isAdmin={isAdmin}
        />
      )}

      <section className="space-y-4">
        <form className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" role="search">
          <label htmlFor="search" className="sr-only">
            {t('search.label')}
          </label>
          <Input
            id="search"
            type="search"
            inputMode="search"
            name="q"
            defaultValue={searchTerm}
            placeholder={t('search.placeholder')}
            className="h-12 flex-1"
          />
          {searchTerm.length > 0 && (
            <Link
              href={getI18nPath('/vocabulary', params.locale)}
              className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              {t('search.clear')}
            </Link>
          )}
        </form>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{listContent}</div>
      </section>
    </div>
  );
}

type VocabularyCardProps = {
  entry: VocabularySummary;
  locale: string;
  isAdmin: boolean;
  t: Awaited<ReturnType<typeof getTranslations>>;
};

function VocabularyCard({ entry, locale, isAdmin, t }: VocabularyCardProps) {
  const readMoreLabel = t('card.read_more');
  const editLabel = t('card.edit');

  return (
    <Card className="flex h-full flex-col justify-between">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-foreground">{entry.term}</CardTitle>
        <CardDescription className="text-sm leading-relaxed text-muted-foreground">
          {entry.excerpt}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-end gap-3">
        <div className="flex items-center gap-3 text-sm font-medium">
          <Link
            href={getI18nPath(`/vocabulary/${entry.slug}`, locale)}
            className="text-primary transition hover:text-primary/80"
          >
            {readMoreLabel}
          </Link>
          {isAdmin && (
            <Link
              href={getI18nPath(`/dashboard/admin/vocabulary/${entry.slug}/edit`, locale)}
              className="text-muted-foreground transition hover:text-foreground"
            >
              {editLabel}
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

type WordOfDayCardProps = {
  entry: VocabularySummary;
  locale: string;
  isAdmin: boolean;
  t: Awaited<ReturnType<typeof getTranslations>>;
};

function WordOfDayCard({ entry, locale, isAdmin, t }: WordOfDayCardProps) {
  return (
    <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 shadow">
      <p className="text-xs uppercase tracking-[0.3em] text-primary">{t('word_of_day.label')}</p>
      <h2 className="mt-4 text-3xl font-semibold text-foreground sm:text-4xl">{entry.term}</h2>
      <p className="mt-3 max-w-2xl text-base text-muted-foreground">{entry.excerpt}</p>
      <div className="mt-6 flex flex-wrap items-center gap-4 text-sm font-medium">
        <Link
          href={getI18nPath(`/vocabulary/${entry.slug}`, locale)}
          className="rounded-full bg-primary px-5 py-2 text-primary-foreground shadow transition hover:bg-primary/90"
        >
          {t('word_of_day.cta')}
        </Link>
        {isAdmin && (
          <Link
            href={getI18nPath(`/dashboard/admin/vocabulary/${entry.slug}/edit`, locale)}
            className="rounded-full border border-border px-4 py-2 text-muted-foreground transition hover:text-foreground"
          >
            {t('word_of_day.edit')}
          </Link>
        )}
      </div>
    </section>
  );
}
