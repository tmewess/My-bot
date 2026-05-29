import WebApp from "@twa-dev/sdk";

export interface TelegramUser {
  id: number;
  first_name: string;
  username?: string;
  photo_url?: string;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: TelegramUser;
        };
      };
    };
  }
}

export function getTelegramUser(): TelegramUser | undefined {
  if (typeof window !== "undefined" && window.Telegram?.WebApp?.initDataUnsafe?.user) {
    return window.Telegram.WebApp.initDataUnsafe.user as TelegramUser;
  }
  return undefined;
}

export function isTelegramWebApp(): boolean {
  return typeof window !== "undefined" && !!window.Telegram?.WebApp?.initData;
}
