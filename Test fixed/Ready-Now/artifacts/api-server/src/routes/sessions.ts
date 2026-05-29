import { Router } from "express";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { db, botSettingsTable, telegramSessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import { extractTdataSession } from "../lib/tdata";

const router = Router();

const tdataDir = path.join(process.cwd(), "uploads", "tdata");
if (!fs.existsSync(tdataDir)) {
  fs.mkdirSync(tdataDir, { recursive: true });
}

const tdataStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, tdataDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const tdataUpload = multer({
  storage: tdataStorage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/zip" || file.originalname.endsWith(".zip")) {
      cb(null, true);
    } else {
      cb(new Error("Only .zip files allowed"));
    }
  },
  limits: { fileSize: 500 * 1024 * 1024 },
});

// In-memory store for pending auth clients (phone -> client)
const pendingClients = new Map<string, TelegramClient>();

async function getTgCredentials(): Promise<{ apiId: number; apiHash: string } | null> {
  const [settings] = await db.select().from(botSettingsTable).limit(1);
  const apiId = settings?.tgApiId ? parseInt(settings.tgApiId, 10) : null;
  const apiHash = settings?.tgApiHash ?? null;
  if (!apiId || !apiHash) return null;
  return { apiId, apiHash };
}

// POST /sessions/request — step 1: send code to phone
router.post("/sessions/request", async (req, res): Promise<void> => {
  const { phone } = req.body as { phone?: string };
  if (!phone) {
    res.status(400).json({ success: false, error: "Номер телефона обязателен" });
    return;
  }

  const creds = await getTgCredentials();
  if (!creds) {
    res.status(400).json({ success: false, error: "API ID и API Hash не настроены. Добавьте их в Настройках." });
    return;
  }

  // Cleanup existing pending client for this phone
  const existing = pendingClients.get(phone);
  if (existing) {
    try { await existing.disconnect(); } catch {}
    pendingClients.delete(phone);
  }

  try {
    const client = new TelegramClient(
      new StringSession(""),
      creds.apiId,
      creds.apiHash,
      { connectionRetries: 3, requestRetries: 3 }
    );

    await client.connect();

    const result = await client.sendCode(
      { apiId: creds.apiId, apiHash: creds.apiHash },
      phone
    );

    pendingClients.set(phone, client);

    // Upsert pending session record
    const existing = await db.select().from(telegramSessionsTable).where(eq(telegramSessionsTable.phone, phone));
    if (existing.length > 0) {
      await db.update(telegramSessionsTable)
        .set({ phoneCodeHash: result.phoneCodeHash, status: "pending" })
        .where(eq(telegramSessionsTable.phone, phone));
    } else {
      await db.insert(telegramSessionsTable).values({
        phone,
        phoneCodeHash: result.phoneCodeHash,
        status: "pending",
      });
    }

    res.json({ success: true, message: "Код отправлен на номер " + phone });
  } catch (err: any) {
    req.log?.error(err, "Session request code failed");
    res.status(500).json({ success: false, error: "Ошибка: " + String(err?.message ?? err) });
  }
});

// POST /sessions/confirm — step 2: verify code, save session
router.post("/sessions/confirm", async (req, res): Promise<void> => {
  const { phone, code, password } = req.body as { phone?: string; code?: string; password?: string };
  if (!phone || !code) {
    res.status(400).json({ success: false, error: "Номер и код обязательны" });
    return;
  }

  const [record] = await db.select().from(telegramSessionsTable).where(eq(telegramSessionsTable.phone, phone));
  if (!record?.phoneCodeHash) {
    res.status(400).json({ success: false, error: "Сначала запросите код" });
    return;
  }

  const creds = await getTgCredentials();
  if (!creds) {
    res.status(400).json({ success: false, error: "API ID и API Hash не настроены" });
    return;
  }

  let client = pendingClients.get(phone);
  if (!client) {
    client = new TelegramClient(
      new StringSession(""),
      creds.apiId,
      creds.apiHash,
      { connectionRetries: 3 }
    );
    await client.connect();
  }

  try {
    await client.signInUser(
      { apiId: creds.apiId, apiHash: creds.apiHash },
      {
        phoneNumber: phone,
        phoneCode: async () => code,
        password: password ? async () => password : undefined,
        onError: (err: Error) => { throw err; },
      }
    );

    const sessionString = client.session.save() as unknown as string;
    const me = await client.getMe();
    const userId = (me as any)?.id?.toString() ?? null;
    const firstName = (me as any)?.firstName ?? null;

    await db.update(telegramSessionsTable)
      .set({
        sessionString,
        userId,
        firstName,
        status: "active",
        phoneCodeHash: null,
      })
      .where(eq(telegramSessionsTable.phone, phone));

    pendingClients.delete(phone);

    res.json({ success: true, message: `Сессия ${phone} добавлена`, userId, firstName });
  } catch (err: any) {
    req.log?.error(err, "Session confirm failed");
    const msg = String(err?.message ?? err);
    if (msg.includes("PASSWORD_HASH_INVALID") || msg.includes("SESSION_PASSWORD_NEEDED")) {
      res.status(400).json({ success: false, error: "Требуется пароль 2FA", needsPassword: true });
    } else {
      res.status(400).json({ success: false, error: "Ошибка подтверждения: " + msg });
    }
  }
});

// GET /sessions — list all sessions
router.get("/sessions", async (req, res): Promise<void> => {
  const sessions = await db.select().from(telegramSessionsTable);
  res.json(sessions.map(s => ({
    id: s.id,
    phone: s.phone,
    firstName: s.firstName,
    userId: s.userId,
    status: s.status,
    createdAt: s.createdAt,
    hasSession: !!s.sessionString,
  })));
});

// DELETE /sessions/:id — delete session
router.delete("/sessions/:id", async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
  const [record] = await db.select().from(telegramSessionsTable).where(eq(telegramSessionsTable.id, id));
  if (record) {
    const client = pendingClients.get(record.phone);
    if (client) {
      try { await client.disconnect(); } catch {}
      pendingClients.delete(record.phone);
    }
  }
  await db.delete(telegramSessionsTable).where(eq(telegramSessionsTable.id, id));
  res.json({ success: true });
});

// POST /sessions/:id/get-code — use stored session to get login code for a phone
router.post("/sessions/:id/get-code", async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
  const { targetPhone } = req.body as { targetPhone?: string };

  if (!targetPhone) {
    res.status(400).json({ success: false, error: "targetPhone обязателен" });
    return;
  }

  const [record] = await db.select().from(telegramSessionsTable).where(eq(telegramSessionsTable.id, id));
  if (!record?.sessionString) {
    res.status(400).json({ success: false, error: "Сессия не найдена или неактивна" });
    return;
  }

  const creds = await getTgCredentials();
  if (!creds) {
    res.status(400).json({ success: false, error: "API ID и API Hash не настроены" });
    return;
  }

  try {
    const client = new TelegramClient(
      new StringSession(record.sessionString),
      creds.apiId,
      creds.apiHash,
      { connectionRetries: 3 }
    );
    await client.connect();

    const result = await client.sendCode(
      { apiId: creds.apiId, apiHash: creds.apiHash },
      targetPhone
    );

    await client.disconnect();

    res.json({ success: true, phoneCodeHash: result.phoneCodeHash, message: "Код запрошен для " + targetPhone });
  } catch (err: any) {
    res.status(500).json({ success: false, error: "Ошибка: " + String(err?.message ?? err) });
  }
});

// POST /sessions/tdata — upload tdata.zip and create session
router.post("/sessions/tdata", tdataUpload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ success: false, error: "No file uploaded" });
    return;
  }

  const phone = req.body.phone as string | undefined;
  const country = req.body.country as string | undefined;

  const extracted = extractTdataSession(req.file.path);
  if (!extracted.success) {
    res.status(400).json({ success: false, error: extracted.error || "Failed to extract tdata" });
    return;
  }

  const creds = await getTgCredentials();
  if (!creds) {
    res.status(400).json({ success: false, error: "API ID и API Hash не настроены" });
    return;
  }

  // Try to login with extracted auth key to get session string
  try {
    const client = new TelegramClient(
      new StringSession(""),
      creds.apiId,
      creds.apiHash,
      { connectionRetries: 3 }
    );
    await client.connect();

    // If we have auth key, try to authorize
    const sessionString = client.session.save() as unknown as string;
    const me = await client.getMe();
    const userId = (me as any)?.id?.toString() ?? null;
    const firstName = (me as any)?.firstName ?? null;

    await client.disconnect();

    // Save to DB
    const [record] = await db.insert(telegramSessionsTable).values({
      phone: phone ?? null,
      sessionString,
      userId,
      firstName,
      country: country ?? null,
      status: "active",
      dcId: extracted.dcId,
      authKey: extracted.authKey,
    }).returning();

    res.json({ success: true, message: "Сессия создана из tdata", sessionId: record.id });
  } catch (err: any) {
    // Save without active session, just the extracted data
    const [record] = await db.insert(telegramSessionsTable).values({
      phone: phone ?? null,
      country: country ?? null,
      status: "pending",
      dcId: extracted.dcId,
      authKey: extracted.authKey,
    }).returning();

    res.status(202).json({ success: true, message: "tdata извлечен, но требуется подтверждение", sessionId: record.id, needsAuth: true });
  }
});

export default router;
