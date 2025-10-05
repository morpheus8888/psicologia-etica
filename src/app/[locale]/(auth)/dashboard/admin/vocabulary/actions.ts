'use server';

import { and, eq, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { authOptions } from '@/libs/auth/config';
import { db } from '@/libs/db';
import { vocabularyEntries } from '@/models/vocabulary';
import { getI18nPath } from '@/utils/Helpers';
import { normalizeSlug } from '@/utils/slug';

export type VocabularyActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  fieldErrors?: Record<string, string>;
  redirectTo?: string;
};

export const vocabularyInitialState: VocabularyActionState = {
  status: 'idle',
};

const vocabularySchema = z.object({
  id: z.string().uuid().optional(),
  locale: z.string().trim().min(2).max(5),
  term: z.string().trim().min(2, { message: 'term_min' }).max(120, { message: 'term_max' }),
  slug: z
    .string()
    .trim()
    .min(1, { message: 'slug_required' })
    .max(140, { message: 'slug_max' }),
  excerpt: z
    .string()
    .trim()
    .min(10, { message: 'excerpt_min' })
    .max(320, { message: 'excerpt_max' }),
  content: z.string().trim().min(1, { message: 'content_required' }),
  isWordOfDay: z
    .union([z.literal('on'), z.literal('true'), z.literal('false')])
    .optional()
    .transform(value => value === 'on' || value === 'true'),
});

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin') {
    redirect('/');
  }
  return session;
}

async function ensureUniqueSlug(slug: string, id?: string) {
  const existing = await db
    .select({ id: vocabularyEntries.id })
    .from(vocabularyEntries)
    .where(
      id
        ? and(eq(vocabularyEntries.slug, slug), ne(vocabularyEntries.id, id))
        : eq(vocabularyEntries.slug, slug),
    )
    .limit(1);

  return existing.length === 0;
}

type UpdateExecutor = Pick<typeof db, 'update'>;

async function updateWordOfDay(executor: UpdateExecutor, enable: boolean, currentId?: string) {
  if (!enable) {
    return;
  }

  if (currentId) {
    await executor
      .update(vocabularyEntries)
      .set({ isWordOfDay: false })
      .where(ne(vocabularyEntries.id, currentId));
    return;
  }

  await executor.update(vocabularyEntries).set({ isWordOfDay: false });
}

export async function createVocabularyEntryAction(
  _prevState: VocabularyActionState,
  formData: FormData,
): Promise<VocabularyActionState> {
  await assertAdmin();

  const raw = {
    id: formData.get('id'),
    locale: formData.get('locale'),
    term: formData.get('term'),
    slug: formData.get('slug'),
    excerpt: formData.get('excerpt'),
    content: formData.get('content'),
    isWordOfDay: formData.get('isWordOfDay'),
  };

  const parsed = vocabularySchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    const flattened = parsed.error.flatten().fieldErrors;
    for (const [key, value] of Object.entries(flattened)) {
      if (value && value.length > 0) {
        fieldErrors[key] = value[0] ?? 'invalid';
      }
    }

    return { status: 'error', message: 'invalid', fieldErrors };
  }

  const { locale, term, slug, excerpt, content, isWordOfDay } = parsed.data;
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) {
    return {
      status: 'error',
      message: 'invalid',
      fieldErrors: { slug: 'slug_invalid' },
    };
  }

  const isSlugFree = await ensureUniqueSlug(normalizedSlug);
  if (!isSlugFree) {
    return {
      status: 'error',
      message: 'invalid',
      fieldErrors: { slug: 'slug_taken' },
    };
  }

  const result = await db.transaction(async (trx) => {
    await updateWordOfDay(trx, isWordOfDay);

    const [created] = await trx
      .insert(vocabularyEntries)
      .values({
        term,
        slug: normalizedSlug,
        excerpt,
        content,
        isWordOfDay,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: vocabularyEntries.id, slug: vocabularyEntries.slug });

    return created;
  });

  if (!result) {
    return {
      status: 'error',
      message: 'not_found',
    };
  }

  const listPath = getI18nPath('/vocabulary', locale);
  const detailPath = getI18nPath(`/vocabulary/${result.slug}`, locale);

  revalidatePath(listPath);
  revalidatePath(detailPath);

  return {
    status: 'success',
    message: 'success',
    redirectTo: detailPath,
  };
}

export async function updateVocabularyEntryAction(
  _prevState: VocabularyActionState,
  formData: FormData,
): Promise<VocabularyActionState> {
  await assertAdmin();

  const raw = {
    id: formData.get('id'),
    locale: formData.get('locale'),
    term: formData.get('term'),
    slug: formData.get('slug'),
    excerpt: formData.get('excerpt'),
    content: formData.get('content'),
    isWordOfDay: formData.get('isWordOfDay'),
  };

  const parsed = vocabularySchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    const flattened = parsed.error.flatten().fieldErrors;
    for (const [key, value] of Object.entries(flattened)) {
      if (value && value.length > 0) {
        fieldErrors[key] = value[0] ?? 'invalid';
      }
    }

    return { status: 'error', message: 'invalid', fieldErrors };
  }

  const { id, locale, term, slug, excerpt, content, isWordOfDay } = parsed.data;

  if (!id) {
    return { status: 'error', message: 'missing_id' };
  }

  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) {
    return {
      status: 'error',
      message: 'invalid',
      fieldErrors: { slug: 'slug_invalid' },
    };
  }

  const isSlugFree = await ensureUniqueSlug(normalizedSlug, id);
  if (!isSlugFree) {
    return {
      status: 'error',
      message: 'invalid',
      fieldErrors: { slug: 'slug_taken' },
    };
  }

  const existing = await db
    .select({ id: vocabularyEntries.id, slug: vocabularyEntries.slug })
    .from(vocabularyEntries)
    .where(eq(vocabularyEntries.id, id))
    .limit(1);

  if (existing.length === 0) {
    return { status: 'error', message: 'not_found' };
  }

  const previousSlug = existing[0]?.slug;

  const updated = await db.transaction(async (trx) => {
    await updateWordOfDay(trx, isWordOfDay, id);

    const [entry] = await trx
      .update(vocabularyEntries)
      .set({
        term,
        slug: normalizedSlug,
        excerpt,
        content,
        isWordOfDay,
        updatedAt: new Date(),
      })
      .where(eq(vocabularyEntries.id, id))
      .returning({ id: vocabularyEntries.id, slug: vocabularyEntries.slug });

    return entry;
  });

  if (!updated) {
    return { status: 'error', message: 'not_found' };
  }

  const listPath = getI18nPath('/vocabulary', locale);
  const detailPath = getI18nPath(`/vocabulary/${updated.slug}`, locale);
  const previousDetailPath = previousSlug ? getI18nPath(`/vocabulary/${previousSlug}`, locale) : null;

  revalidatePath(listPath);
  revalidatePath(detailPath);
  if (previousDetailPath && previousDetailPath !== detailPath) {
    revalidatePath(previousDetailPath);
  }

  return {
    status: 'success',
    message: 'success',
    redirectTo: detailPath,
  };
}
