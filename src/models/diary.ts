import { Buffer } from 'node:buffer';

import { sql } from 'drizzle-orm';
import {
  boolean,
  customType,
  date,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { users } from './auth';

const bytea = customType<{ data: Uint8Array; driverData: Buffer | Uint8Array | ArrayBuffer }>({
  dataType() {
    return 'bytea';
  },
  toDriver(value) {
    return Buffer.from(value);
  },
  fromDriver(value) {
    if (value instanceof Buffer) {
      return new Uint8Array(value);
    }

    if (value instanceof Uint8Array) {
      return value;
    }

    return new Uint8Array(value);
  },
});

export const diaryKeyrings = pgTable('diary_keyrings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  encMasterKey: bytea('enc_master_key').notNull(),
  salt: bytea('salt').notNull(),
  kdfParams: jsonb('kdf_params').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const diaryEntries = pgTable(
  'diary_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    entryDate: date('entry_date', { mode: 'string' }).notNull(),
    ciphertext: bytea('ciphertext').notNull(),
    nonce: bytea('nonce').notNull(),
    aad: bytea('aad'),
    wordCount: integer('word_count'),
    mood: text('mood'),
    tzAtEntry: text('tz_at_entry'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  table => ({
    entryDateUnique: uniqueIndex('diary_entries_user_date_unique').on(
      table.userId,
      table.entryDate,
    ),
  }),
);

export const diaryGoals = pgTable('diary_goals', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  ciphertext: bytea('ciphertext').notNull(),
  nonce: bytea('nonce').notNull(),
  aad: bytea('aad'),
  deadlineDate: date('deadline_date', { mode: 'string' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const diaryGoalEntries = pgTable(
  'diary_goal_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    goalId: uuid('goal_id')
      .notNull()
      .references(() => diaryGoals.id, { onDelete: 'cascade' }),
    entryId: uuid('entry_id')
      .notNull()
      .references(() => diaryEntries.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  table => ({
    goalEntryUnique: uniqueIndex('diary_goal_entries_goal_entry_unique').on(
      table.goalId,
      table.entryId,
    ),
  }),
);

export const diaryShares = pgTable(
  'diary_shares',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    entryId: uuid('entry_id')
      .notNull()
      .references(() => diaryEntries.id, { onDelete: 'cascade' }),
    ownerUserId: uuid('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    professionalUserId: uuid('professional_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    envelope: bytea('envelope').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  table => ({
    ownerEntryProfessionalUnique: uniqueIndex(
      'diary_shares_owner_entry_professional_unique',
    ).on(table.ownerUserId, table.entryId, table.professionalUserId),
  }),
);

export const diaryShareAudits = pgTable('diary_share_audits', {
  id: uuid('id').defaultRandom().primaryKey(),
  entryId: uuid('entry_id')
    .notNull()
    .references(() => diaryEntries.id, { onDelete: 'cascade' }),
  ownerUserId: uuid('owner_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  professionalUserId: uuid('professional_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  action: text('action')
    .$type<'shared' | 'revoked'>()
    .notNull(),
  eventAt: timestamp('event_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const diaryCoachPrompts = pgTable('diary_coach_prompts', {
  id: uuid('id').defaultRandom().primaryKey(),
  locale: text('locale').notNull(),
  scope: text('scope').notNull(),
  text: text('text').notNull(),
  tags: text('tags')
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  weight: integer('weight').default(1).notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  startAt: timestamp('start_at', { withTimezone: true }),
  endAt: timestamp('end_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
