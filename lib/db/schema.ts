import { desc, sql } from 'drizzle-orm'
import { boolean, check, index, integer, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'

export const teamMember = pgTable('teamMember', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  role: text('role').notNull().default('Engineer'),
  isActive: boolean('isActive').notNull().default(true),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('teamMember_userId_idx').on(table.userId),
  unique('teamMember_userId_email_unique').on(table.userId, table.email),
])

export const teamUpdate = pgTable('teamUpdate', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  memberId: text('memberId').notNull(),
  status: text('status').notNull().default('On track'),
  vibe: text('vibe').notNull().default('Neutral'),
  yesterday: text('yesterday').notNull().default(''),
  today: text('today').notNull().default(''),
  blocker: text('blocker').notNull().default(''),
  pointsCompleted: integer('pointsCompleted').notNull().default(0),
  pointsTotal: integer('pointsTotal').notNull().default(0),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('teamUpdate_userId_memberId_createdAt_idx').on(table.userId, table.memberId, desc(table.createdAt)), 
  check('teamUpdate_points_valid', sql`${table.pointsCompleted} >= 0 AND ${table.pointsTotal} >= 0 AND ${table.pointsCompleted} <= ${table.pointsTotal}`),
])
