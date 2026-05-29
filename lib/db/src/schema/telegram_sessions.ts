import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const telegramSessionsTable = pgTable("telegram_sessions", {
  id: serial("id").primaryKey(),
  phone: text("phone"),
  sessionString: text("session_string"),
  dcId: text("dc_id"),
  authKey: text("auth_key"),
  country: text("country"),
  userId: text("user_id"),
  firstName: text("first_name"),
  status: text("status").notNull().default("pending"),
  phoneCodeHash: text("phone_code_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TelegramSession = typeof telegramSessionsTable.$inferSelect;
