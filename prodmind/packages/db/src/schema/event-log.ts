import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';

export const eventLogs = sqliteTable(
  'event_logs',
  {
    id: text('id').primaryKey(),
    eventType: text('event_type').notNull(),
    payloadJson: text('payload_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    eventTypeIdx: index('idx_event_logs_type').on(table.eventType),
    createdAtIdx: index('idx_event_logs_created_at').on(table.createdAt),
  }),
);

export type EventLog = typeof eventLogs.$inferSelect;
export type NewEventLog = typeof eventLogs.$inferInsert;
