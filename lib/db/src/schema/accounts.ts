import { pgTable, text, serial, timestamp, integer, doublePrecision, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const accountsTable = pgTable("accounts", {
  id: serial("id").primaryKey(),
  phone: text("phone"),
  country: text("country").notNull().default(""),
  phonePrefix: text("phone_prefix"),
  dcId: text("dc_id"),
  userId: text("user_id"),
  authKey: text("auth_key"),
  description: text("description"),
  status: text("status").notNull().default("available"),
  price: doublePrecision("price").notNull().default(0),
  isFree: text("is_free").notNull().default("false"),
  hasPremium: boolean("has_premium").notNull().default(false),
  hasPassword: boolean("has_password").notNull().default(false),
  password: text("password"),
  spamBlock: text("spam_block"),
  registrationDate: text("registration_date"),
  origin: text("origin"),
  filePath: text("file_path"),
  fileName: text("file_name"),
  lolzItemId: text("lolz_item_id"),
  lastActivity: text("last_activity"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  soldAt: timestamp("sold_at", { withTimezone: true }),
});

export const insertAccountSchema = createInsertSchema(accountsTable).omit({ id: true, createdAt: true });
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accountsTable.$inferSelect;
