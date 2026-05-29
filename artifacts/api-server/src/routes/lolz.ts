import { Router } from "express";
import path from "path";
import fs from "fs";
import { db, botSettingsTable, accountsTable, ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();
const LOLZ_API = "https://api.lzt.market";
const uploadsDir = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

async function getLolzApiKey(): Promise<string | null> {
  const [settings] = await db.select().from(botSettingsTable).limit(1);
  return settings?.lolzApiKey ?? null;
}

function lolzHeaders(apiKey: string): Record<string, string> {
  const token = apiKey.startsWith("Bearer ") ? apiKey : `Bearer ${apiKey}`;
  return {
    Authorization: token,
    Accept: "application/json",
    "User-Agent": "VoidAccountBot/1.0",
  };
}

function lolzUrl(urlPath: string, _apiKey: string): string {
  const url = new URL(urlPath);
  return url.toString();
}

export interface LolzAccountData {
  phone: string | null;
  password: string | null;
  sessionString: string | null;
  email: string | null;
  emailPassword: string | null;
  extraFields: Record<string, string>;
  rawData: string | null;
}

export async function fetchLolzAccountData(itemId: number, apiKey: string): Promise<LolzAccountData> {
  const empty: LolzAccountData = {
    phone: null, password: null, sessionString: null,
    email: null, emailPassword: null, extraFields: {}, rawData: null,
  };

  try {
    const res = await fetch(`${LOLZ_API}/${itemId}/data`, {
      headers: lolzHeaders(apiKey),
    });
    if (!res.ok) return empty;

    const json = (await res.json()) as Record<string, unknown>;
    const itemData = (json["item"] as Record<string, unknown> | undefined) ?? json;

    const skipKeys = new Set([
      "item_id", "item", "status", "login", "password",
      "email", "email_password", "emailPassword",
      "telegram_session", "session_string", "twofa_password",
    ]);

    const phone =
      (itemData["login"] as string | undefined) ??
      (json["login"] as string | undefined) ??
      null;

    const password =
      (itemData["password"] as string | undefined) ??
      (itemData["twofa_password"] as string | undefined) ??
      (json["password"] as string | undefined) ??
      null;

    const sessionString =
      (itemData["telegram_session"] as string | undefined) ??
      (itemData["session_string"] as string | undefined) ??
      (json["telegram_session"] as string | undefined) ??
      (json["session_string"] as string | undefined) ??
      null;

    const email =
      (itemData["email"] as string | undefined) ??
      (json["email"] as string | undefined) ??
      null;

    const emailPassword =
      (itemData["email_password"] as string | undefined) ??
      (itemData["emailPassword"] as string | undefined) ??
      (json["email_password"] as string | undefined) ??
      null;

    const extraFields: Record<string, string> = {};
    const allData = { ...json, ...itemData };
    for (const [k, v] of Object.entries(allData)) {
      if (skipKeys.has(k)) continue;
      if (v && typeof v === "string" && v.length > 0 && v.length < 500) {
        extraFields[k] = v;
      }
    }

    return {
      phone, password, sessionString,
      email, emailPassword, extraFields,
      rawData: JSON.stringify(json),
    };
  } catch {
    return empty;
  }
}

export interface LolzConfirmCodeResult {
  success: boolean;
  code: string | null;
  error: string | null;
  rawResponse: string | null;
}

export async function fetchLolzConfirmCode(itemId: number, apiKey: string): Promise<LolzConfirmCodeResult> {
  // Step 1: Try specialized confirm-code endpoints first
  const codeEndpoints = [
    `${LOLZ_API}/${itemId}/confirm-code`,
    `${LOLZ_API}/${itemId}/telegram-confirm-code`,
    `${LOLZ_API}/${itemId}/phone-confirmation-code`,
  ];

  for (const endpoint of codeEndpoints) {
    try {
      const res = await fetch(endpoint, {
        headers: lolzHeaders(apiKey),
      });

      const text = await res.text();
      let json: Record<string, unknown> = {};
      try { json = JSON.parse(text); } catch { }

      if (!res.ok) {
        console.log(`[Lolz] ${endpoint} -> ${res.status}: ${text.slice(0, 200)}`);
        continue;
      }

      const code = extractCode(json);
      if (code) {
        return { success: true, code, error: null, rawResponse: text };
      }
    } catch (err) {
      console.log(`[Lolz] ${endpoint} error:`, err);
      continue;
    }
  }

  // Step 2: Try data endpoint (for accounts with API code access)
  try {
    const dataRes = await fetch(`${LOLZ_API}/${itemId}/data`, {
      headers: lolzHeaders(apiKey),
    });
    if (dataRes.ok) {
      const text = await dataRes.text();
      let json: Record<string, unknown> = {};
      try { json = JSON.parse(text); } catch { }
      const code = extractCode(json);
      if (code) {
        return { success: true, code, error: null, rawResponse: text };
      }
    }
  } catch (err) {
    console.log(`[Lolz] data endpoint error:`, err);
  }

  // Step 3: Try to get login data and check if account has session data
  try {
    const dataRes = await fetch(`${LOLZ_API}/${itemId}/data`, {
      headers: lolzHeaders(apiKey),
    });
    if (dataRes.ok) {
      const text = await dataRes.text();
      let json: Record<string, unknown> = {};
      try { json = JSON.parse(text); } catch { }
      // Check if API explicitly says no code available
      const item = (json["item"] as Record<string, unknown>) ?? json;
      const resaleType = item["resale_type"];
      if (resaleType != null) {
        const rt = Number(resaleType);
        if (rt === 0) {
          return {
            success: false,
            code: null,
            error: "У этого аккаунта нет API-кода. Авторег аккаунты без API не могут получить код автоматически.",
            rawResponse: text,
          };
        }
      }
      // Check for any code field in the response
      const code = extractCode(json);
      if (code) {
        return { success: true, code, error: null, rawResponse: text };
      }
    }
  } catch (err) {
    console.log(`[Lolz] final data check error:`, err);
  }

  return {
    success: false,
    code: null,
    error: "Код подтверждения недоступен для данного аккаунта. Возможно, у аккаунта нет API-доступа или код уже был получен.",
    rawResponse: null,
  };
}

function extractCode(json: Record<string, unknown>): string | null {
  const candidates = [
    json["code"],
    json["confirm_code"],
    json["confirmation_code"],
    json["auth_code"],
    json["sms_code"],
    json["phone_code"],
    json["login_code"],
    json["verification_code"],
    json["telegram_code"],
    (json["item"] as Record<string, unknown> | undefined)?.["code"],
    (json["item"] as Record<string, unknown> | undefined)?.["confirm_code"],
    (json["item"] as Record<string, unknown> | undefined)?.["confirmation_code"],
    (json["item"] as Record<string, unknown> | undefined)?.["auth_code"],
    (json["item"] as Record<string, unknown> | undefined)?.["sms_code"],
    (json["item"] as Record<string, unknown> | undefined)?.["phone_code"],
    (json["item"] as Record<string, unknown> | undefined)?.["telegram_code"],
    (json["data"] as Record<string, unknown> | undefined)?.["code"],
    (json["data"] as Record<string, unknown> | undefined)?.["confirm_code"],
    (json["account"] as Record<string, unknown> | undefined)?.["code"],
    (json["response"] as Record<string, unknown> | undefined)?.["code"],
  ];

  for (const val of candidates) {
    if (val && typeof val === "string" && /^\d{4,8}$/.test(val.trim())) {
      return val.trim();
    }
    if (val && typeof val === "number") {
      const s = String(val);
      if (/^\d{4,8}$/.test(s)) return s;
    }
  }

  // Try to extract code from any field that looks like a code
  const allData = { ...json, ...(json["item"] as Record<string, unknown> || {}), ...(json["data"] as Record<string, unknown> || {}) };
  for (const [k, v] of Object.entries(allData)) {
    if (typeof v === "string" && /^\d{5,6}$/.test(v.trim())) {
      return v.trim();
    }
    if (typeof v === "number" && v >= 10000 && v <= 999999) {
      return String(v);
    }
  }

  return null;
}

export async function downloadLolzFile(itemId: number, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch(`${LOLZ_API}/${itemId}/download`, {
      headers: lolzHeaders(apiKey),
    });
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("zip") && !contentType.includes("octet-stream")) {
      return null;
    }

    const filePath = path.join(uploadsDir, `lolz_${itemId}.zip`);
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 100) return null;
    fs.writeFileSync(filePath, buffer);
    return filePath;
  } catch {
    return null;
  }
}

router.get("/lolz/accounts", async (req, res): Promise<void> => {
  const apiKey = await getLolzApiKey();
  if (!apiKey) {
    res.status(400).json({ error: "API ключ не настроен. Добавьте его в Настройках." });
    return;
  }

  const params = new URLSearchParams();
  if (req.query["pmin"]) params.set("pmin", String(req.query["pmin"]));
  if (req.query["pmax"]) params.set("pmax", String(req.query["pmax"]));
  params.set("count", req.query["count"] ? String(req.query["count"]) : "40");

  if (req.query["has_password"]) params.set("has_email_password", "1");
  if (req.query["country"]) params.set("origin[]", String(req.query["country"]));
  if (req.query["spam"] === "0") params.set("spam", "0");
  if (req.query["has_premium"] === "1") params.set("is_premium", "1");
  if (req.query["api_code"] === "1") params.set("resale_type", "1");
  if (req.query["account_id_min"]) params.set("telegram_uid_min", String(req.query["account_id_min"]));
  if (req.query["account_id_max"]) params.set("telegram_uid_max", String(req.query["account_id_max"]));
  if (req.query["item_origin"]) params.set("item_origin[]", String(req.query["item_origin"]));

  try {
    const searchUrl = `${LOLZ_API}/telegram?${params.toString()}`;
    const response = await fetch(searchUrl, { headers: lolzHeaders(apiKey) });

    if (!response.ok) {
      const text = await response.text();
      if (response.status === 404 || response.status === 400) {
        const fallbackParams = new URLSearchParams(params);
        fallbackParams.set("category_id", "24");
        const fallbackUrl = `${LOLZ_API}/market?${fallbackParams.toString()}`;
        const fallbackRes = await fetch(fallbackUrl, { headers: lolzHeaders(apiKey) });

        if (!fallbackRes.ok) {
          const fallbackText = await fallbackRes.text();
          res.status(fallbackRes.status).json({
            error: `API ошибка (${fallbackRes.status}): ${fallbackText.slice(0, 300)}`,
          });
          return;
        }

        const fallbackData = (await fallbackRes.json()) as { items?: unknown[] };
        res.json(mapLolzItems(fallbackData.items ?? []));
        return;
      }

      res.status(response.status).json({
        error: `API ошибка (${response.status}): ${text.slice(0, 300)}`,
      });
      return;
    }

    const data = (await response.json()) as { items?: unknown[] };
    res.json(mapLolzItems(data.items ?? []));
  } catch (err) {
    req.log?.error(err, "Lolz search failed");
    res.status(500).json({ error: "Ошибка запроса к маркету" });
  }
});

function mapLolzItems(items: unknown[]) {
  return items.map((item) => {
    const i = item as Record<string, unknown>;
    const spamRaw = i["spam"] ?? (i["item"] as Record<string, unknown> | undefined)?.["spam"];
    const userId = (i["telegram_user_id"] ?? i["user_id"]) != null ? String(i["telegram_user_id"] ?? i["user_id"]) : null;
    const hasEmailPassword = !!(i["email_password"] || i["has_email_password"] || i["email_login"]);
    const originRaw = (i["item_origin"] ?? i["account_type"] ?? i["origin"]) as string | undefined;
    return {
      itemId: i["item_id"] as number,
      price: i["price"] as number,
      title: (i["title"] as string | undefined) ?? (i["description"] as string | undefined) ?? `Аккаунт #${i["item_id"]}`,
      phone: (i["login"] as string | undefined) ?? null,
      country: (i["telegram_country"] as string | undefined) ?? (i["country"] as string | undefined) ?? null,
      hasPremium: !!(i["is_premium"] || i["telegram_premium"]),
      hasPassword: hasEmailPassword,
      spamBlock: spamRaw != null ? String(spamRaw) : null,
      dcId: (i["telegram_dc"] ?? i["dc_id"]) != null ? String(i["telegram_dc"] ?? i["dc_id"]) : null,
      userId,
      idDigitCount: userId ? userId.replace(/\D/g, "").length : null,
      registrationDate: i["reg_date"] ? String(i["reg_date"]) : null,
      canGetCode: !!(i["resale_type"] && Number(i["resale_type"]) >= 1),
      origin: originRaw ?? null,
    };
  });
}

router.post("/lolz/import/:itemId", async (req, res): Promise<void> => {
  const itemId = Number(req.params["itemId"]);
  if (!itemId || isNaN(itemId)) {
    res.status(400).json({ error: "Некорректный itemId" });
    return;
  }

  const apiKey = await getLolzApiKey();
  if (!apiKey) {
    res.status(400).json({ error: "API ключ не настроен" });
    return;
  }

  const body = req.body as {
    price?: number;
    lolzPrice?: number;
    isFree?: string;
    country?: string;
    phonePrefix?: string;
    phone?: string;
    hasPremium?: boolean;
    dcId?: string;
    userId?: string;
    authKey?: string;
    hasPassword?: boolean;
    password?: string;
    spamBlock?: string;
    registrationDate?: string;
    origin?: string;
    lastActivity?: string;
    description?: string;
  };

  const lolzPrice = body.lolzPrice;
  if (lolzPrice === undefined) {
    res.status(400).json({ error: "lolzPrice обязателен" });
    return;
  }

  try {
    const buyBody = new URLSearchParams();
    buyBody.set("price", String(lolzPrice));

    const buyRes = await fetch(`${LOLZ_API}/${itemId}/fast-buy`, {
      method: "POST",
      headers: {
        ...lolzHeaders(apiKey),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: buyBody.toString(),
    });

    const buyText = await buyRes.text();

    if (!buyRes.ok) {
      let errorMsg = `Ошибка покупки (${buyRes.status}): ${buyText.slice(0, 300)}`;
      try {
        const errJson = JSON.parse(buyText);
        if (errJson.errors?.[0]?.includes("token")) {
          errorMsg = "Неверный или просроченный API токен. Обновите ключ в Настройках.";
        }
      } catch {}
      res.status(buyRes.status).json({
        success: false,
        message: errorMsg,
        accountId: null,
      });
      return;
    }

    const downloadedPath = await downloadLolzFile(itemId, apiKey);

    const [newAccount] = await db
      .insert(accountsTable)
      .values({
        phone: body.phone ?? null,
        country: body.country ?? "",
        phonePrefix: body.phonePrefix ?? null,
        dcId: body.dcId ?? null,
        userId: body.userId ?? null,
        authKey: body.authKey ?? null,
        hasPremium: body.hasPremium ?? false,
        hasPassword: body.hasPassword ?? false,
        password: body.password ?? null,
        spamBlock: body.spamBlock ?? null,
        registrationDate: body.registrationDate ?? null,
        origin: body.origin ?? null,
        lastActivity: body.lastActivity ?? null,
        price: body.isFree === "true" ? 0 : (body.price ?? lolzPrice),
        isFree: body.isFree ?? "false",
        filePath: downloadedPath,
        fileName: downloadedPath ? `lolz_${itemId}.zip` : null,
        lolzItemId: String(itemId),
        description: body.description ?? null,
        status: "available",
      })
      .returning();

    res.json({
      success: true,
      message: `Аккаунт #${itemId} успешно импортирован${downloadedPath ? " (tdata скачан)" : " (данные сохранены)"}`,
      accountId: newAccount.id,
    });
  } catch (err) {
    req.log?.error(err, "Import failed");
    res.status(500).json({
      success: false,
      message: "Ошибка импорта: " + String(err),
      accountId: null,
    });
  }
});

export async function resetLolzSessions(itemId: number, apiKey: string): Promise<{ success: boolean; error?: string }> {
  const resetEndpoints = [
    `${LOLZ_API}/${itemId}/reset-account`,
    `${LOLZ_API}/${itemId}/sessions-reset`,
    `${LOLZ_API}/${itemId}/reset`,
  ];

  for (const endpoint of resetEndpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: lolzHeaders(apiKey),
      });
      const text = await res.text();
      if (res.ok) return { success: true };
      if (res.status !== 404) {
        return { success: false, error: `Ошибка (${res.status}): ${text.slice(0, 200)}` };
      }
    } catch {
      continue;
    }
  }
  return { success: false, error: "Сброс сессий недоступен для этого аккаунта" };
}

// POST /lolz/reset/:accountId
router.post("/lolz/reset/:accountId", async (req, res): Promise<void> => {
  const accountId = Number(req.params["accountId"]);
  if (!accountId || isNaN(accountId)) {
    res.status(400).json({ success: false, error: "Некорректный accountId" });
    return;
  }

  const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, accountId));
  if (!account?.lolzItemId) {
    res.status(400).json({ success: false, error: "Сброс сессий недоступен для данного аккаунта" });
    return;
  }

  const apiKey = await getLolzApiKey();
  if (!apiKey) {
    res.status(400).json({ success: false, error: "API ключ не настроен" });
    return;
  }

  const result = await resetLolzSessions(Number(account.lolzItemId), apiKey);
  if (result.success) {
    res.json({ success: true, message: "Сессии сброшены" });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
});

// GET /lolz/code/:accountId
router.get("/lolz/code/:accountId", async (req, res): Promise<void> => {
  const accountId = Number(req.params["accountId"]);
  if (!accountId || isNaN(accountId)) {
    res.status(400).json({ success: false, error: "Некорректный accountId" });
    return;
  }

  const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, accountId));
  if (!account?.lolzItemId) {
    res.status(400).json({ success: false, error: "Получение кода недоступно для данного аккаунта" });
    return;
  }

  const apiKey = await getLolzApiKey();
  if (!apiKey) {
    res.status(400).json({ success: false, error: "API ключ не настроен" });
    return;
  }

  try {
    const result = await fetchLolzConfirmCode(Number(account.lolzItemId), apiKey);
    if (result.success && result.code) {
      res.json({ success: true, code: result.code });
    } else {
      res.status(400).json({ success: false, error: result.error ?? "Код не получен" });
    }
  } catch {
    res.status(500).json({ success: false, error: "Ошибка запроса" });
  }
});

export default router;
