import { Router } from "express";
import { eq, sql, desc } from "drizzle-orm";
import { db, userBalancesTable, ordersTable } from "@workspace/db";

const router = Router();

// GET /users — list all users with order counts and balances
router.get("/users", async (_req, res): Promise<void> => {
  const balances = await db.select().from(userBalancesTable).orderBy(desc(userBalancesTable.updatedAt));

  const result = await Promise.all(
    balances.map(async (u) => {
      const orderCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(ordersTable)
        .where(eq(ordersTable.telegramUserId, u.telegramUserId));
      return {
        telegramUserId: u.telegramUserId,
        balance: u.balance,
        updatedAt: u.updatedAt,
        orderCount: orderCount[0]?.count ?? 0,
      };
    })
  );

  res.json(result);
});

// POST /users/:id/balance — add or remove balance
router.post("/users/:id/balance", async (req, res): Promise<void> => {
  const telegramUserId = req.params.id;
  const { amount } = req.body as { amount?: number };

  if (amount === undefined || amount === 0) {
    res.status(400).json({ error: "Amount required" });
    return;
  }

  const [existing] = await db
    .select()
    .from(userBalancesTable)
    .where(eq(userBalancesTable.telegramUserId, telegramUserId));

  if (existing) {
    const newBalance = existing.balance + amount;
    if (newBalance < 0) {
      res.status(400).json({ error: "Balance cannot be negative", current: existing.balance });
      return;
    }
    await db
      .update(userBalancesTable)
      .set({ balance: newBalance, updatedAt: new Date() })
      .where(eq(userBalancesTable.telegramUserId, telegramUserId));
    res.json({ success: true, balance: newBalance, telegramUserId });
  } else {
    if (amount < 0) {
      res.status(400).json({ error: "User has no balance to remove from" });
      return;
    }
    const [row] = await db
      .insert(userBalancesTable)
      .values({ telegramUserId, balance: amount })
      .returning();
    res.json({ success: true, balance: row.balance, telegramUserId });
  }
});

export default router;
