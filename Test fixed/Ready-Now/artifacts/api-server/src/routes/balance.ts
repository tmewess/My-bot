import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, userBalancesTable, accountsTable, ordersTable } from "@workspace/db";

const router = Router();

const BOT_TOKEN = process.env["TELEGRAM_BOT_TOKEN"];
const BOT_USERNAME = process.env["TELEGRAM_BOT_USERNAME"] ?? "VoidAccountBot";

async function createTelegramInvoiceLink(params: {
  title: string;
  description: string;
  payload: string;
  currency: string;
  amount: number;
}) {
  if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN not configured");
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`;
  const body = {
    title: params.title,
    description: params.description,
    payload: params.payload,
    provider_token: "",
    currency: params.currency,
    prices: [{ label: "Stars", amount: params.amount * 100 }],
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json() as { ok: boolean; result?: { invoice_link: string }; description?: string };
  if (!data.ok) throw new Error(data.description ?? "Failed to create invoice link");
  return data.result!.invoice_link;
}

// GET /balance/:userId
router.get("/balance/:userId", async (req, res): Promise<void> => {
  const userId = req.params.userId;
  const [row] = await db.select().from(userBalancesTable).where(eq(userBalancesTable.telegramUserId, userId));
  res.json({ balance: row?.balance ?? 0 });
});

// POST /balance/topup — create Stars invoice for balance topup
router.post("/balance/topup", async (req, res): Promise<void> => {
  const { telegramUserId, amount } = req.body as { telegramUserId?: string; amount?: number };
  if (!telegramUserId || !amount || amount < 1) {
    res.status(400).json({ error: "Minimum topup is 1 Star" });
    return;
  }
  res.json({
    success: true,
    telegramUserId,
    amount,
    payload: JSON.stringify({ type: "balance_topup", telegramUserId, amount }),
  });
});

// POST /balance/topup-invoice — create real Telegram Stars invoice link via Bot API
router.post("/balance/topup-invoice", async (req, res): Promise<void> => {
  const { telegramUserId, amount } = req.body as { telegramUserId?: string; amount?: number };
  if (!telegramUserId || !amount || amount < 1) {
    res.status(400).json({ error: "Minimum topup is 1 Star" });
    return;
  }
  try {
    const payload = JSON.stringify({ type: "balance_topup", telegramUserId, amount });
    const invoiceUrl = await createTelegramInvoiceLink({
      title: "Пополнение баланса",
      description: `Пополнение баланса на ${amount} Stars`,
      payload,
      currency: "XTR",
      amount,
    });
    res.json({ success: true, invoiceUrl, payload });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to create invoice";
    res.status(503).json({ error: message });
  }
});

// POST /balance/purchase — buy account using balance
router.post("/balance/purchase", async (req, res): Promise<void> => {
  const { telegramUserId, telegramUsername, accountId } = req.body as {
    telegramUserId?: string;
    telegramUsername?: string;
    accountId?: number;
  };

  if (!telegramUserId || !accountId) {
    res.status(400).json({ error: "telegramUserId and accountId required" });
    return;
  }

  const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, accountId));
  if (!account || account.status !== "available") {
    res.status(400).json({ error: "Account not available" });
    return;
  }

  const isFree = account.isFree === "true" || account.price === 0;

  if (!isFree) {
    // Check balance
    const [balanceRow] = await db
      .select()
      .from(userBalancesTable)
      .where(eq(userBalancesTable.telegramUserId, telegramUserId));
    const currentBalance = balanceRow?.balance ?? 0;
    if (currentBalance < account.price) {
      res.status(400).json({ error: "Insufficient balance", required: account.price, current: currentBalance });
      return;
    }
    // Deduct balance
    await db
      .update(userBalancesTable)
      .set({ balance: currentBalance - account.price, updatedAt: new Date() })
      .where(eq(userBalancesTable.telegramUserId, telegramUserId));
  }

  // Mark account as sold
  await db.update(accountsTable).set({ status: "sold", soldAt: new Date() }).where(eq(accountsTable.id, accountId));

  // Create order
  const [order] = await db
    .insert(ordersTable)
    .values({
      telegramUserId,
      telegramUsername: telegramUsername ?? null,
      accountId,
      status: "delivered",
      paymentMethod: isFree ? "free" : "balance",
      amount: isFree ? 0 : account.price,
      deliveredAt: new Date(),
    })
    .returning();

  res.json({ success: true, orderId: order.id, account });
});

export default router;
