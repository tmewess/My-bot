import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, ordersTable, accountsTable } from "@workspace/db";

const router = Router();

router.get("/orders", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: ordersTable.id,
      telegramUserId: ordersTable.telegramUserId,
      telegramUsername: ordersTable.telegramUsername,
      accountId: ordersTable.accountId,
      status: ordersTable.status,
      paymentMethod: ordersTable.paymentMethod,
      amount: ordersTable.amount,
      paymentId: ordersTable.paymentId,
      deliveredAt: ordersTable.deliveredAt,
      createdAt: ordersTable.createdAt,
      accountPhone: accountsTable.phone,
      accountCountry: accountsTable.country,
      accountDcId: accountsTable.dcId,
      accountUserId: accountsTable.userId,
      accountAuthKey: accountsTable.authKey,
      accountFilePath: accountsTable.filePath,
      accountLolzItemId: accountsTable.lolzItemId,
      accountHasPremium: accountsTable.hasPremium,
      accountDescription: accountsTable.description,
      accountPassword: accountsTable.password,
      accountHasPassword: accountsTable.hasPassword,
    })
    .from(ordersTable)
    .leftJoin(accountsTable, eq(ordersTable.accountId, accountsTable.id))
    .orderBy(desc(ordersTable.createdAt));

  res.json(rows);
});

router.delete("/orders", async (_req, res): Promise<void> => {
  await db.delete(ordersTable);
  res.json({ success: true, message: "All orders deleted" });
});

export default router;
