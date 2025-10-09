import { Buffer } from 'node:buffer';

import {
  customType,
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

export const professionalPublicKeys = pgTable('professional_public_keys', {
  professionalUserId: uuid('professional_user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  publicKey: bytea('public_key').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const userProfessionalLinks = pgTable(
  'user_professional_links',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    professionalUserId: uuid('professional_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  table => ({
    uniqueLink: uniqueIndex('user_professional_links_unique').on(
      table.userId,
      table.professionalUserId,
    ),
  }),
);
