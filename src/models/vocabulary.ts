import { sql } from 'drizzle-orm';
import { boolean, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const vocabularyEntries = pgTable('vocabulary_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  term: text('term').notNull(),
  excerpt: text('excerpt').notNull(),
  content: text('content').notNull(),
  isWordOfDay: boolean('is_word_of_day').notNull().default(false),
  publishedAt: timestamp('published_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, table => ({
  wordOfDayUnique: uniqueIndex('vocabulary_entries_word_of_day_unique')
    .on(table.isWordOfDay)
    .where(sql`${table.isWordOfDay} = true`),
}));

export type VocabularyEntry = typeof vocabularyEntries.$inferSelect;
export type NewVocabularyEntry = typeof vocabularyEntries.$inferInsert;
