import { asc, eq, ilike, or, sql } from 'drizzle-orm';

import { db } from '@/libs/db';
import { vocabularyEntries } from '@/models/vocabulary';

const baseSelection = {
  id: vocabularyEntries.id,
  slug: vocabularyEntries.slug,
  term: vocabularyEntries.term,
  excerpt: vocabularyEntries.excerpt,
  content: vocabularyEntries.content,
  isWordOfDay: vocabularyEntries.isWordOfDay,
  publishedAt: vocabularyEntries.publishedAt,
};

export type VocabularySummary = Awaited<ReturnType<typeof listVocabularyEntries>>[number];
export type VocabularyEntryDetail = VocabularySummary;

export async function listVocabularyEntries(search?: string) {
  const trimmed = search?.trim();

  if (trimmed && trimmed.length > 0) {
    const pattern = `%${trimmed}%`;
    return await db
      .select(baseSelection)
      .from(vocabularyEntries)
      .where(
        or(
          ilike(vocabularyEntries.term, pattern),
          ilike(vocabularyEntries.excerpt, pattern),
        ),
      )
      .orderBy(asc(vocabularyEntries.term));
  }

  return await db
    .select(baseSelection)
    .from(vocabularyEntries)
    .orderBy(asc(vocabularyEntries.term));
}

export async function getWordOfTheDay() {
  const [pinned] = await db
    .select(baseSelection)
    .from(vocabularyEntries)
    .where(eq(vocabularyEntries.isWordOfDay, true))
    .limit(1);

  if (pinned) {
    return pinned;
  }

  const [randomEntry] = await db
    .select(baseSelection)
    .from(vocabularyEntries)
    .orderBy(sql`random()`)
    .limit(1);

  return randomEntry ?? null;
}

export async function getVocabularyEntryBySlug(slug: string) {
  const [entry] = await db
    .select(baseSelection)
    .from(vocabularyEntries)
    .where(eq(vocabularyEntries.slug, slug))
    .limit(1);

  return entry ?? null;
}
