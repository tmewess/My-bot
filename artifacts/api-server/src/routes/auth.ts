import { Router } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const router = Router();

function getSecret() {
  return process.env["SESSION_SECRET"] ?? "fallback-dev-secret";
}

function validateTelegramWebAppData(initData: string, botToken: string): Record<string, string> | null {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;

    params.delete("hash");

    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
    const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    if (computedHash !== hash) return null;

    const result: Record<string, string> = {};
    params.forEach((v, k) => {
      result[k] = v;
    });
    result["hash"] = hash;
    return result;
  } catch {
    return null;
  }
}

const HARDCODED_ADMIN_USER = "Void";
const HARDCODED_ADMIN_PASS = "Clock358";

router.post("/auth/login", async (req, res): Promise<void> => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (
    username !== HARDCODED_ADMIN_USER ||
    password !== HARDCODED_ADMIN_PASS
  ) {
    res.status(401).json({ error: "Неверный логин или пароль" });
    return;
  }

  const token = jwt.sign({ username: HARDCODED_ADMIN_USER, role: "admin" }, getSecret(), { expiresIn: "30d" });
  res.json({ token, username: HARDCODED_ADMIN_USER });
});

router.post("/auth/telegram-webapp", async (req, res): Promise<void> => {
  const { initData } = req.body as { initData?: string };

  if (!initData) {
    res.status(400).json({ error: "initData required" });
    return;
  }

  const botToken = process.env["TELEGRAM_BOT_TOKEN"];
  if (!botToken) {
    res.status(503).json({ error: "Bot token not configured" });
    return;
  }

  const data = validateTelegramWebAppData(initData, botToken);
  if (!data) {
    res.status(401).json({ error: "Invalid Telegram WebApp data" });
    return;
  }

  let telegramUserId: string | null = null;
  try {
    const user = JSON.parse(data["user"] ?? "{}") as { id?: number };
    telegramUserId = user.id ? String(user.id) : null;
  } catch {
    res.status(401).json({ error: "Cannot parse user from initData" });
    return;
  }

  if (!telegramUserId) {
    res.status(401).json({ error: "No user ID in initData" });
    return;
  }

  const adminTelegramId = process.env["ADMIN_TELEGRAM_ID"];
  if (!adminTelegramId || telegramUserId !== adminTelegramId) {
    res.status(403).json({ error: "Not authorized as admin" });
    return;
  }

  const adminUsername = process.env["ADMIN_USERNAME"] ?? "admin";
  const token = jwt.sign({ username: adminUsername, role: "admin", telegramId: telegramUserId }, getSecret(), { expiresIn: "30d" });
  res.json({ token, username: adminUsername });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const auth = req.headers["authorization"];
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const payload = jwt.verify(auth.slice(7), getSecret()) as { username: string; role: string };
    res.json({ username: payload.username, role: payload.role });
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

export default router;
