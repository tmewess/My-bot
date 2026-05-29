import { useState, useEffect } from "react";

const TOKEN_KEY = "tg_admin_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function loginRequest(username: string, password: string): Promise<string> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Login failed");
  return data.token as string;
}

export async function loginTelegramWebApp(initData: string): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/telegram-webapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.token as string;
  } catch {
    return null;
  }
}

export async function fetchMe(token: string): Promise<{ username: string; role: string } | null> {
  try {
    const res = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function getTelegramInitData(): string | null {
  try {
    return (window as any).Telegram?.WebApp?.initData || null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const existingToken = getToken();
      if (existingToken) {
        const me = await fetchMe(existingToken);
        if (me) {
          setAuthenticated(true);
          setUsername(me.username);
          return;
        }
        clearToken();
      }

      const initData = getTelegramInitData();
      if (initData) {
        const tgToken = await loginTelegramWebApp(initData);
        if (tgToken) {
          setToken(tgToken);
          const me = await fetchMe(tgToken);
          if (me) {
            setAuthenticated(true);
            setUsername(me.username);
            return;
          }
        }
      }

      setAuthenticated(false);
    }

    init();
  }, []);

  const login = async (u: string, p: string) => {
    const token = await loginRequest(u, p);
    setToken(token);
    const me = await fetchMe(token);
    if (me) {
      setAuthenticated(true);
      setUsername(me.username);
    }
  };

  const logout = () => {
    clearToken();
    setAuthenticated(false);
    setUsername(null);
  };

  return { authenticated, username, login, logout };
}
