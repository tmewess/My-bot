import { pgTable, text, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userBalancesTable = pgTable("user_balances", {
  telegramUserId: text("telegram_user_id").notNull().primaryKey(),
  balance: doublePrecision("balance").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserBalanceSchema = createInsertSchema(userBalancesTable).omit({ updatedAt: true });
export type InsertUserBalance = z.infer<typeof insertUserBalanceSchema>;
export type UserBalance = typeof userBalancesTable.$inferSelect;
