import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';

import type { VocabularySummary } from '@/features/vocabulary/queries';
import { getWordOfTheDay, listVocabularyEntries } from '@/features/vocabulary/queries';
import { VocabularySearchBar } from '@/features/vocabulary/SearchBar';
import { authOptions } from '@/libs/auth/config';
import { cn, getI18nPath } from '@/utils/Helpers';

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
  const tallPattern = [1, 4];
  const cards = entriesToShow.map((entry, index) => (
    <VocabularyCard
      key={entry.id}
      entry={entry}
      locale={params.locale}
      isAdmin={isAdmin}
      t={t}
      variant={tallPattern.includes(index % 5) ? 'tall' : 'square'}
    />
  ));

  const samples = (t.raw('search.samples') as string[] | undefined) ?? [];

  return (
    <div className="flex flex-col gap-10">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-wide text-primary/70">{t('intro.badge')}</p>
        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">{t('intro.title')}</h1>
        <p className="max-w-3xl text-base text-muted-foreground">{t('intro.subtitle')}</p>
      </header>

      <VocabularySearchBar
        actionPath={getI18nPath('/vocabulary', params.locale)}
        defaultValue={searchTerm}
        label={t('search.label')}
        placeholder={t('search.placeholder')}
        clearLabel={t('search.clear')}
        buttonLabel={t('search.button')}
        samples={samples}
      />

      {wordOfDay && (
        <WordOfDayCard
          entry={wordOfDay}
          t={t}
          locale={params.locale}
          isAdmin={isAdmin}
        />
      )}

      <section className="space-y-4">
        {cards.length === 0
          ? (
              <p className="rounded-3xl border border-dashed border-border bg-background p-8 text-sm text-muted-foreground">
                {t('empty.state')}
              </p>
            )
          : (
              <div className="grid gap-4 sm:grid-cols-2 md:auto-rows-[240px] lg:auto-rows-[260px] lg:grid-cols-3">
                {cards}
              </div>
            )}
      </section>
    </div>
  );
}

type VocabularyCardProps = {
  entry: VocabularySummary;
  locale: string;
  isAdmin: boolean;
  t: Awaited<ReturnType<typeof getTranslations>>;
  variant: 'square' | 'tall';
};

function VocabularyCard({ entry, locale, isAdmin, t, variant }: VocabularyCardProps) {
  const readMoreLabel = t('card.read_more');
  const editLabel = t('card.edit');

  return (
    <article
      className={cn(
        'group relative flex h-full w-full flex-col overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm transition duration-300 ease-out hover:-translate-y-2 hover:border-primary/50 hover:shadow-[0_22px_45px_rgba(15,23,42,0.15)]',
        variant === 'tall' ? 'md:row-span-2 md:min-h-[440px]' : 'md:min-h-[280px]',
      )}
    >
      <span
        className="pointer-events-none absolute inset-x-6 -bottom-8 h-12 rounded-full bg-primary/25 opacity-0 blur-2xl transition duration-500 group-hover:opacity-60"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
      </div>

      <div className="relative flex flex-1 flex-col gap-4">
        <header className="relative space-y-2">
          <h2 className="text-xl font-semibold text-foreground transition duration-300 group-hover:text-primary">
            {entry.term}
          </h2>
          <p
            className={cn(
              'text-sm leading-relaxed text-muted-foreground transition-colors duration-300 group-hover:text-muted-foreground/90',
              variant === 'tall' ? 'max-h-[220px]' : 'max-h-[150px]',
              'overflow-hidden',
            )}
          >
            {entry.excerpt}
          </p>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent transition-opacity duration-300 group-hover:opacity-0" aria-hidden />
        </header>

        <div className="mt-auto flex items-center gap-3 text-sm font-medium">
          <Link
            href={getI18nPath(`/vocabulary/${entry.slug}`, locale)}
            prefetch={false}
            className="relative text-primary transition duration-300 hover:text-primary/80"
          >
            {readMoreLabel}
          </Link>
          {isAdmin && (
            <Link
              href={getI18nPath(`/dashboard/admin/vocabulary/${entry.slug}/edit`, locale)}
              prefetch={false}
              className="text-muted-foreground transition duration-300 hover:text-foreground"
            >
              {editLabel}
            </Link>
          )}
        </div>
      </div>
    </article>
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
          prefetch={false}
          className="rounded-full bg-primary px-5 py-2 text-primary-foreground shadow transition hover:bg-primary/90"
        >
          {t('word_of_day.cta')}
        </Link>
        {isAdmin && (
          <Link
            href={getI18nPath(`/dashboard/admin/vocabulary/${entry.slug}/edit`, locale)}
            prefetch={false}
            className="rounded-full border border-border px-4 py-2 text-muted-foreground transition hover:text-foreground"
          >
            {t('word_of_day.edit')}
          </Link>
        )}
      </div>
    </section>
  );
}
