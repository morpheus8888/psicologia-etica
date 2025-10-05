import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';

import { TitleBar } from '@/features/dashboard/TitleBar';
import { getVocabularyEntryBySlug } from '@/features/vocabulary/queries';
import { VocabularyForm } from '@/features/vocabulary/VocabularyForm';
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

  const t = await getTranslations({ locale: params.locale, namespace: 'AdminVocabularyEdit' });
  return {
    title: `${entry.term} — ${t('title_bar')}`,
  };
}

export default async function AdminVocabularyEditPage({ params }: PageProps) {
  unstable_setRequestLocale(params.locale);

  const [tPage, tEditor, session, entry] = await Promise.all([
    getTranslations({ locale: params.locale, namespace: 'AdminVocabularyEdit' }),
    getTranslations({ locale: params.locale, namespace: 'VocabularyEditor' }),
    getServerSession(authOptions),
    getVocabularyEntryBySlug(params.slug),
  ]);

  if (session?.user?.role !== 'admin') {
    redirect(getI18nPath('/dashboard', params.locale));
  }

  if (!entry) {
    return (
      <div className="space-y-8">
        <TitleBar title={tPage('title_bar')} description={tPage('title_bar_description')} />
        <div className="rounded-lg border border-dashed bg-background p-6 text-sm text-muted-foreground shadow">
          {tPage('not_found')}
        </div>
      </div>
    );
  }

  const cancelHref = getI18nPath('/vocabulary', params.locale);
  const fieldLabels = {
    title: tEditor('fields.title_label'),
    slug: tEditor('fields.slug_label'),
    slugHint: tEditor('fields.slug_hint'),
    excerpt: tEditor('fields.excerpt_label'),
    excerptHint: tEditor('fields.excerpt_hint'),
    content: tEditor('fields.content_label'),
    wordOfDay: tEditor('fields.word_of_day_label'),
    wordOfDayHint: tEditor('fields.word_of_day_hint'),
  };

  const toolbarLabels = {
    bold: tEditor('toolbar.bold'),
    italic: tEditor('toolbar.italic'),
    underline: tEditor('toolbar.underline'),
    bulletList: tEditor('toolbar.bullet_list'),
    orderedList: tEditor('toolbar.ordered_list'),
    quote: tEditor('toolbar.quote'),
    heading: tEditor('toolbar.heading'),
    link: tEditor('toolbar.link'),
    clear: tEditor('toolbar.clear'),
    linkPrompt: tEditor('toolbar.link_prompt'),
  } as const;

  const errorKeys = [
    'term_min',
    'term_max',
    'slug_required',
    'slug_max',
    'slug_invalid',
    'slug_taken',
    'excerpt_min',
    'excerpt_max',
    'content_required',
    'invalid',
    'missing_id',
    'not_found',
  ] as const;

  const errors = errorKeys.reduce<Record<string, string>>((acc, key) => {
    acc[key] = tEditor(`errors.${key}`);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <TitleBar title={tPage('title_bar')} description={tPage('title_bar_description')} />
      <div className="rounded-lg border bg-background p-6 shadow">
        <VocabularyForm
          locale={params.locale}
          mode="edit"
          cancelHref={cancelHref}
          initialData={{
            id: entry.id,
            term: entry.term,
            slug: entry.slug,
            excerpt: entry.excerpt,
            content: entry.content,
            isWordOfDay: entry.isWordOfDay,
          }}
          fieldLabels={fieldLabels}
          toolbarLabels={toolbarLabels}
          placeholders={{ content: tEditor('placeholders.content') }}
          messages={{
            submit: tPage('actions.submit'),
            saving: tPage('actions.saving'),
            success: tPage('actions.success'),
            error: tPage('actions.error'),
            cancel: tPage('actions.cancel'),
          }}
          errors={errors}
        />
      </div>
    </div>
  );
}
