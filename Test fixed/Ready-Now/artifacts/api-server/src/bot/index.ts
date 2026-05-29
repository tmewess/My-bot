import { Bot, InlineKeyboard, InputFile } from "grammy";
import fs from "fs";
import { eq, desc } from "drizzle-orm";
import { db, accountsTable, ordersTable, botSettingsTable, userBalancesTable, newsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { fetchLolzConfirmCode, fetchLolzAccountData, downloadLolzFile, resetLolzSessions } from "../routes/lolz";

let bot: Bot | null = null;

function getShopUrl(): string {
  const domain = process.env["REPLIT_DOMAINS"]?.split(",")[0];
  if (domain) return `https://${domain}/tg-shop/`;
  return process.env["SHOP_URL"] ?? "https://example.com/tg-shop/";
}

function getAdminUrl(): string {
  const domain = process.env["REPLIT_DOMAINS"]?.split(",")[0];
  if (domain) return `https://${domain}/`;
  return process.env["ADMIN_URL"] ?? "https://example.com/";
}

function isAdmin(userId?: number): boolean {
  const adminId = process.env["ADMIN_TELEGRAM_ID"];
  if (!adminId || !userId) return false;
  return String(userId) === adminId;
}

async function getBotSettings() {
  let [settings] = await db.select().from(botSettingsTable).limit(1);
  if (!settings) {
    [settings] = await db.insert(botSettingsTable).values({}).returning();
  }
  return settings;
}

async function getAvailableAccounts() {
  return db.select().from(accountsTable).where(eq(accountsTable.status, "available"));
}

async function getUserBalance(telegramUserId: string): Promise<number> {
  const [row] = await db.select().from(userBalancesTable).where(eq(userBalancesTable.telegramUserId, telegramUserId));
  return row?.balance ?? 0;
}

async function addToBalance(telegramUserId: string, amount: number) {
  const [existing] = await db.select().from(userBalancesTable).where(eq(userBalancesTable.telegramUserId, telegramUserId));
  if (existing) {
    await db
      .update(userBalancesTable)
      .set({ balance: existing.balance + amount, updatedAt: new Date() })
      .where(eq(userBalancesTable.telegramUserId, telegramUserId));
  } else {
    await db.insert(userBalancesTable).values({ telegramUserId, balance: amount }).returning();
  }
}

async function deductFromBalance(telegramUserId: string, amount: number): Promise<boolean> {
  const [existing] = await db.select().from(userBalancesTable).where(eq(userBalancesTable.telegramUserId, telegramUserId));
  if (!existing || existing.balance < amount) return false;
  await db
    .update(userBalancesTable)
    .set({ balance: existing.balance - amount, updatedAt: new Date() })
    .where(eq(userBalancesTable.telegramUserId, telegramUserId));
  return true;
}

async function notifyAdmin(text: string) {
  const adminId = process.env["ADMIN_TELEGRAM_ID"];
  if (!adminId || !bot) return;
  try {
    await bot.api.sendMessage(adminId, text, { parse_mode: "Markdown" });
  } catch (err) {
    logger.warn({ err }, "Failed to notify admin");
  }
}

function buildMainKeyboard(settings: Awaited<ReturnType<typeof getBotSettings>>, userId?: number) {
  const shopUrl = getShopUrl();
  const keyboard = new InlineKeyboard()
    .webApp("Открыть магазин", shopUrl)
    .row();

  if (isAdmin(userId)) {
    const adminUrl = getAdminUrl();
    keyboard.url("Админ панель", adminUrl).row();
  }

  if (settings.supportUsername) {
    keyboard.url("Поддержка", `https://t.me/${settings.supportUsername}`).row();
  }

  return keyboard;
}

export async function startBot() {
  const token = process.env["TELEGRAM_BOT_TOKEN"];
  if (!token) {
    logger.warn("TELEGRAM_BOT_TOKEN not set, bot will not start");
    return;
  }

  bot = new Bot(token);

  bot.command("start", async (ctx) => {
    const settings = await getBotSettings();
    const accounts = await getAvailableAccounts();
    const userId = ctx.from?.id;
    const keyboard = buildMainKeyboard(settings, userId);
    await ctx.reply(
      settings.welcomeMessage + `\n\nДоступно аккаунтов: ${accounts.length}`,
      { parse_mode: "Markdown", reply_markup: keyboard }
    );
  });

  // Top-up balance with Stars
  bot.command("topup", async (ctx) => {
    const args = ctx.message?.text?.split(" ") ?? [];
    const amount = args[1] ? parseInt(args[1], 10) : 50;
    if (isNaN(amount) || amount < 50) {
      await ctx.reply("Минимальное пополнение — 50 Stars. \u0418спользуйте: /topup 100");
      return;
    }
    const userId = String(ctx.from?.id ?? "unknown");
    const payload = JSON.stringify({ type: "balance_topup", telegramUserId: userId, amount });
    try {
      await ctx.replyWithInvoice(
        "Stars Пополнение баланса",
        `Пополнение баланса на ${amount} Stars`,
        payload,
        "XTR",
        [{ label: "Баланс", amount }],
        { provider_token: "" }
      );
    } catch (err) {
      logger.error({ err }, "Failed to send topup invoice");
      await ctx.reply("Ошибка: Не удалось создать чек. Попробуйте позже.");
    }
  });

  // News command
  bot.command("news", async (ctx) => {
    try {
      const items = await db.select().from(newsTable).where(eq(newsTable.isActive, true)).orderBy(desc(newsTable.createdAt)).limit(5);
      if (items.length === 0) {
        await ctx.reply("Новостей пока нет. Заходите позже!");
        return;
      }
      let text = "*Новости VoidAccount*\n\n";
      for (const item of items) {
        text += `*• ${item.title}*\n${item.content}\n\n`;
      }
      await ctx.reply(text, { parse_mode: "Markdown" });
    } catch (err) {
      logger.error({ err }, "News command failed");
      await ctx.reply("Ошибка загрузки новостей.");
    }
  });

  // pre_checkout_query
  bot.on("pre_checkout_query", async (ctx) => {
    try {
      const payload = JSON.parse(ctx.preCheckoutQuery.invoice_payload) as { type?: string; accountId?: number };
      if (payload.type === "balance_topup") {
        await ctx.answerPreCheckoutQuery(true);
        return;
      }
      const accountId = payload.accountId;
      if (!accountId) {
        await ctx.answerPreCheckoutQuery(false, "Некорректный платёж.");
        return;
      }
      const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, accountId));
      if (!account || account.status === "sold") {
        if (account?.status === "reserved") {
          await db.update(accountsTable).set({ status: "available" }).where(eq(accountsTable.id, accountId));
        }
        await ctx.answerPreCheckoutQuery(false, "Аккаунт уже продан. Выбери другой.");
        return;
      }
      await ctx.answerPreCheckoutQuery(true);
    } catch (err) {
      logger.error({ err }, "pre_checkout_query error");
      await ctx.answerPreCheckoutQuery(false, "Внутренняя ошибка. Попробуй позже.");
    }
  });

  // successful_payment
  bot.on("message:successful_payment", async (ctx) => {
    const payment = ctx.message.successful_payment;
    const telegramUserId = String(ctx.from.id);
    const telegramUsername = ctx.from.username ?? null;
    const telegramName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ");

    let payload: { type?: string; accountId?: number; amount?: number } = {};
    try {
      payload = JSON.parse(payment.invoice_payload);
    } catch {
      await ctx.reply("(!) Оплата получена, но не удалось определить заказ.");
      return;
    }

    // Balance topup
    if (payload.type === "balance_topup" && payload.amount) {
      await addToBalance(telegramUserId, payload.amount);
      await ctx.reply(`Готово! *Баланс пополнен!*\n\nStars +${payload.amount} Stars зачислены на ваш счёт.`);
      return;
    }

    // Account purchase
    const accountId = payload.accountId;
    if (!accountId) {
      await ctx.reply("(!) Оплата получена. Обратитесь в поддержку.");
      return;
    }

    const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, accountId));
    if (!account) {
      await ctx.reply("(!) Оплата получена, но аккаунт не найден.");
      return;
    }

    const [order] = await db.insert(ordersTable).values({
      telegramUserId,
      telegramUsername,
      accountId: account.id,
      status: "paid",
      paymentMethod: "stars",
      amount: account.price,
      paymentId: payment.telegram_payment_charge_id,
    }).returning();

    await db.update(accountsTable).set({ status: "sold", soldAt: new Date() }).where(eq(accountsTable.id, accountId));
    await db.update(ordersTable).set({ status: "delivered", deliveredAt: new Date() }).where(eq(ordersTable.id, order.id));

    await notifyAdmin(
      `*Новый заказ #${order.id}!*\n\n` +
      `Покупатель: ${telegramName}${telegramUsername ? ` (@${telegramUsername})` : ""}\n` +
      `ID: \`${telegramUserId}\`\n` +
      `Аккаунт: ${account.phone ?? `#${account.id}`}\n` +
      `Сумма: ${account.price} Stars\n` +
      `Метод: Telegram Stars`
    );

    await ctx.reply(`Готово! *Оплата подтверждена!*\nStars получены. Заказ #${order.id}\n\nВыдаю аккаунт...`, { parse_mode: "Markdown" });
    await deliverAccount(ctx, account, order.id);
  });

  // Refund
  bot.command("refund", async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return;
    const args = ctx.message?.text?.split(" ") ?? [];
    const orderId = args[1] ? parseInt(args[1], 10) : null;
    if (!orderId || isNaN(orderId)) {
      await ctx.reply("Использование: /refund <order_id>");
      return;
    }
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
    if (!order) {
      await ctx.reply(`Ошибка: Заказ #${orderId} не найден.`);
      return;
    }
    if (!order.paymentId) {
      await ctx.reply(`Ошибка: У заказа #${orderId} нет payment_id для возврата.`);
      return;
    }
    if (order.status === "refunded") {
      await ctx.reply(`(!) Заказ #${orderId} уже возвращён.`);
      return;
    }
    try {
      await ctx.api.refundStarPayment(parseInt(order.telegramUserId, 10), order.paymentId);
      await db.update(ordersTable).set({ status: "refunded" }).where(eq(ordersTable.id, orderId));
      if (order.accountId) {
        await db.update(accountsTable).set({ status: "available", soldAt: null }).where(eq(accountsTable.id, order.accountId));
      }
      await ctx.reply(`Готово! Возврат Stars для заказа #${orderId} выполнен.`);
      try {
        await ctx.api.sendMessage(parseInt(order.telegramUserId, 10), `✅ *Возврат Stars*\n\nПо заказу #${orderId} выполнен возврат ${order.amount} Stars.`, { parse_mode: "Markdown" });
      } catch {}
    } catch (err) {
      logger.error({ err }, "Refund failed");
      await ctx.reply(`Ошибка: Не удалось выполнить возврат: ${String(err)}`);
    }
  });

  bot.catch((err) => {
    logger.error({ err: err.error, update: err.ctx.update }, "Bot error");
  });

  try {
    await bot.start({
      onStart: (info) => {
        logger.info({ username: info.username }, "Bot started");
      },
    });
  } catch (err: any) {
    if (err?.error_code === 401) {
      logger.warn("Bot token is invalid (401 Unauthorized). The server will continue running without the bot.");
    } else {
      logger.error({ err }, "Bot startup failed");
    }
  }

  logger.info("Telegram bot initialized");
}

// Доставка аккаунта
async function deliverAccount(ctx: any, account: any, orderId: number) {
  const settings = await getBotSettings();

  // Авто-доставка из LolzTeam: код + сброс сессий + tdata
  if (account.lolzItemId) {
    const apiKey = settings.lolzApiKey;
    if (apiKey) {
      try {
        const lolzId = Number(account.lolzItemId);
        const codeRes = await fetchLolzConfirmCode(lolzId, apiKey);
        const resetRes = await resetLolzSessions(lolzId, apiKey);
        const filePath = await downloadLolzFile(account.lolzItemId, apiKey);

        let text = `Готово! *Заказ #${orderId} выполнен!*\n\n`;
        text += `*Данные аккаунта Telegram:*\n\n`;
        if (account.phone) text += `Номер: \`${account.phone}\`\n`;
        if (account.dcId) text += `DC ID: \`${account.dcId}\`\n`;
        if (account.userId) text += `User ID: \`${account.userId}\`\n`;
        if (account.authKey) text += `Auth Key: \`${account.authKey.slice(0, 16)}...\`\n`;
        if (account.country) text += `Страна: ${account.country}\n`;
        if (account.hasPassword && account.password) text += `Пароль 2FA: \`${account.password}\`\n`;

        if (codeRes.success && codeRes.code) {
          text += `\n*Код подтверждения:* \`${codeRes.code}\`\n`;
        }
        if (resetRes.success) {
          text += `Сессии сброшены.\n`;
        }
        text += `\n❓ Нужна помощь? /start`;

        const keyboard = new InlineKeyboard();
        if (settings.supportUsername) {
          keyboard.url("Помощь", `https://t.me/${settings.supportUsername}`).row();
        }
        await ctx.reply(text, { parse_mode: "Markdown", reply_markup: keyboard });

        if (filePath && fs.existsSync(filePath)) {
          const file = new InputFile(filePath, `tdata_${account.phone ?? account.id}.zip`);
          await ctx.replyWithDocument(file, {
            caption: `tdata — аккаунт ${account.phone ?? "#" + account.id}`,
          });
        }
        return;
      } catch (err) {
        logger.warn({ err }, "LolzTeam auto-delivery failed, falling back to manual data");
      }
    }
  }

  if (account.filePath && fs.existsSync(account.filePath)) {
    const file = new InputFile(account.filePath, account.fileName ?? "tdata.zip");
    await ctx.reply(
      `Готово! *Заказ #${orderId} выполнен!*\n\n` +
      `Аккаунт: \`${account.phone ?? "#" + account.id}\`\n` +
      `
Файл \`tdata.zip\` во вложении ниже.\n` +
      `Распакуй и положи папку \`tdata\` в директорию Telegram Desktop.\n\n` +
      `\u2753 Нужна помощь? /start`,
      { parse_mode: "Markdown" }
    );
    await ctx.replyWithDocument(file, {
      caption: `tdata — аккаунт ${account.phone ?? "#" + account.id}`,
    });
    return;
  }

  let text = `Готово! *Заказ #${orderId} выполнен!*\n\n*Данные аккаунта Telegram:*\n\n`;

  if (account.phone) text += `Номер: \`${account.phone}\`\n`;
  if (account.dcId) text += `DC ID: \`${account.dcId}\`\n`;
  if (account.userId) text += `User ID: \`${account.userId}\`\n`;
  if (account.authKey) text += `Auth Key: \`${account.authKey.slice(0, 16)}...\`\n`;
  if (account.country) text += `Страна: ${account.country}\n`;
  if (account.hasPassword && account.password) text += `Пароль 2FA: \`${account.password}\`\n`;

  text += `\n❓ Нужна помощь? /start`;

  const keyboard = new InlineKeyboard();
  if (settings.supportUsername) {
    keyboard.url("Помощь", `https://t.me/${settings.supportUsername}`).row();
  }

  await ctx.reply(text, { parse_mode: "Markdown", reply_markup: keyboard });
}

export function getBot() {
  return bot;
}
