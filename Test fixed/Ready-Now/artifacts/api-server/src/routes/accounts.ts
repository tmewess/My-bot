import { Router } from "express";
import { eq } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db, accountsTable } from "@workspace/db";

const router = Router();

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/zip" || file.originalname.endsWith(".zip")) {
      cb(null, true);
    } else {
      cb(new Error("Only .zip files allowed"));
    }
  },
  limits: { fileSize: 500 * 1024 * 1024 },
});

router.get("/accounts", async (_req, res): Promise<void> => {
  const rows = await db.select().from(accountsTable).orderBy(accountsTable.createdAt);
  res.json(rows);
});

router.get("/accounts/available", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.status, "available"))
    .orderBy(accountsTable.createdAt);
  res.json(rows);
});

router.post("/accounts/upload", upload.single("file"), async (req, res): Promise<void> => {
  const filePath = req.file?.path ?? null;
  const fileName = req.file?.originalname ?? null;

  const phone = req.body.phone as string | undefined;
  const country = req.body.country as string | undefined;
  const phonePrefix = req.body.phonePrefix as string | undefined;
  const dcId = req.body.dcId as string | undefined;
  const userId = req.body.userId as string | undefined;
  const authKey = req.body.authKey as string | undefined;
  const price = req.body.price ? parseFloat(req.body.price as string) : 0;
  const isFree = req.body.isFree as string | undefined;
  const hasPremium = req.body.hasPremium === "true";
  const hasPassword = req.body.hasPassword === "true";
  const password = req.body.password as string | undefined;
  const spamBlock = req.body.spamBlock as string | undefined;
  const registrationDate = req.body.registrationDate as string | undefined;
  const origin = req.body.origin as string | undefined;
  const lastActivity = req.body.lastActivity as string | undefined;
  const description = req.body.description as string | undefined;

  const [account] = await db
    .insert(accountsTable)
    .values({
      phone: phone ?? null,
      country: country ?? "",
      phonePrefix: phonePrefix ?? null,
      dcId: dcId ?? null,
      userId: userId ?? null,
      authKey: authKey ?? null,
      price,
      isFree: isFree ?? "false",
      hasPremium,
      hasPassword,
      password: password ?? null,
      spamBlock: spamBlock ?? null,
      registrationDate: registrationDate ?? null,
      origin: origin ?? null,
      lastActivity: lastActivity ?? null,
      description: description ?? null,
      filePath,
      fileName,
      status: "available",
    })
    .returning();

  res.json({ filePath, fileName, accountId: account.id });
});

router.post("/accounts", async (req, res): Promise<void> => {
  const data = req.body as Record<string, unknown>;
  const [row] = await db.insert(accountsTable).values(data as any).returning();
  res.status(201).json(row);
});

router.get("/accounts/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db.select().from(accountsTable).where(eq(accountsTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  res.json(row);
});

router.patch("/accounts/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db
    .update(accountsTable)
    .set(req.body as any)
    .where(eq(accountsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  res.json(row);
});

router.delete("/accounts/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db.delete(accountsTable).where(eq(accountsTable.id, id)).returning();
  if (!row) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  res.sendStatus(204);
});

router.delete("/accounts", async (_req, res): Promise<void> => {
  await db.delete(accountsTable);
  res.json({ success: true, message: "All accounts deleted" });
});

router.get("/accounts/download/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, id));
  if (!account || !account.filePath) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  if (!fs.existsSync(account.filePath)) {
    res.status(404).json({ error: "File not found on disk" });
    return;
  }
  res.download(account.filePath, account.fileName ?? "account.zip");
});

export default router;
