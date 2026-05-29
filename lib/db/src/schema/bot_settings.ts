import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const botSettingsTable = pgTable("bot_settings", {
  id: serial("id").primaryKey(),
  botToken: text("bot_token").notNull().default(""),
  welcomeMessage: text("welcome_message").notNull().default("Добро пожаловать! Здесь вы можете купить аккаунты Telegram."),
  supportUsername: text("support_username"),
  paymentYookassaEnabled: boolean("payment_yookassa_enabled").notNull().default(false),
  yookassaShopId: text("yookassa_shop_id"),
  yookassaSecretKey: text("yookassa_secret_key"),
  paymentStarsEnabled: boolean("payment_stars_enabled").notNull().default(false),
  paymentCryptoEnabled: boolean("payment_crypto_enabled").notNull().default(false),
  cryptoBotToken: text("crypto_bot_token"),
  lolzApiKey: text("lolz_api_key"),
  tgApiId: text("tg_api_id"),
  tgApiHash: text("tg_api_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBotSettingsSchema = createInsertSchema(botSettingsTable).omit({ id: true, createdAt: true });
export type InsertBotSettings = z.infer<typeof insertBotSettingsSchema>;
export type BotSettings = typeof botSettingsTable.$inferSelect;
