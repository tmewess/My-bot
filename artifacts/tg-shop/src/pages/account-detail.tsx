import { useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { getTelegramUser } from "@/lib/telegram";
import { useToast } from "@/hooks/use-toast";
import { Copy, Download, RotateCcw, Shield, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";

interface Account {
  id: number;
  phone: string | null;
  country: string;
  phonePrefix: string | null;
  dcId: string | null;
  userId: string | null;
  authKey: string | null;
  price: number;
  isFree: string;
  hasPremium: boolean;
  hasPassword: boolean;
  password: string | null;
  filePath: string | null;
  fileName: string | null;
  description: string | null;
  status: string;
  lolzItemId: string | null;
  spamBlock: string | null;
  origin: string | null;
  lastActivity: string | null;
  registrationDate: string | null;
}

const COUNTRY_FLAGS: Record<string, string> = {
  "США": "🇺🇸", "Россия": "🇷🇺", "Украина": "🇺🇦", "Казахстан": "🇰🇿",
  "Беларусь": "🇧🇾", "Польша": "🇵🇱", "Германия": "🇩🇪", "Франция": "🇫🇷",
  "Италия": "🇮🇹", "Турция": "🇹🇷", "Индия": "🇮🇳", "Китай": "🇨🇳",
  "Япония": "🇯🇵", "Бразилия": "🇧🇷", "Аргентина": "🇦🇷",
  "Соединенные Штаты": "🇺🇸", "United States": "🇺🇸",
};

function getFlag(country: string): string {
  return COUNTRY_FLAGS[country] || "";
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <div className="text-sm font-semibold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export default function AccountDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const user = getTelegramUser();
  const accountId = Number(id);

  const [account, setAccount] = useState<Account | null>(null);
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuying, setIsBuying] = useState(false);
  const [order, setOrder] = useState<{ id: number; account: Account } | null>(null);
  const [showCopyDropdown, setShowCopyDropdown] = useState(false);

  useEffect(() => {
    fetch(`/api/accounts/${accountId}`)
      .then((r) => r.json())
      .then((data) => {
        setAccount(data);
        setIsLoading(false);
      });
    if (user) {
      fetch(`/api/balance/${user.id}`)
        .then((r) => r.json())
        .then((data) => setBalance(data.balance ?? 0));
    }
  }, [accountId, user]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Скопировано", description: `${label} скопирован в буфер` });
  };

  const handleCopyAll = () => {
    if (!order?.account) return;
    const acc = order.account;
    const parts: string[] = [];
    if (acc.phone) parts.push(`Номер: ${acc.phone}`);
    if (acc.userId) parts.push(`ID: ${acc.userId}`);
    if (acc.authKey) parts.push(`Auth Key: ${acc.authKey}`);
    if (acc.dcId) parts.push(`DC: ${acc.dcId}`);
    if (acc.hasPassword && acc.password) parts.push(`Пароль 2FA: ${acc.password}`);
    navigator.clipboard.writeText(parts.join("\n"));
    toast({ title: "Скопировано", description: "Все данные аккаунта" });
  };

  const handleBuy = async () => {
    if (!user) {
      toast({ title: "Ошибка", description: "Откройте в Telegram", variant: "destructive" });
      return;
    }
    if (!account) return;

    setIsBuying(true);
    const isFree = account.isFree === "true" || account.price === 0;

    if (!isFree && balance < account.price) {
      toast({ title: "Недостаточно Stars", description: `Нужно: ${account.price}, у вас: ${balance}. Пополните баланс.`, variant: "destructive" });
      setIsBuying(false);
      return;
    }

    const res = await fetch("/api/balance/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telegramUserId: String(user.id),
        telegramUsername: user.username,
        accountId: account.id,
      }),
    });
    const data = await res.json();
    if (data.success) {
      if (!isFree) setBalance((b) => b - account.price);
      setOrder({ id: data.orderId, account: data.account });
      toast({ title: "Успех!", description: isFree ? "Аккаунт получен!" : "Аккаунт куплен!" });
    } else {
      toast({ title: "Ошибка", description: data.error ?? "Не удалось купить", variant: "destructive" });
    }
    setIsBuying(false);
  };

  const handleDownload = () => {
    if (!order?.account.filePath) return;
    window.open(`/api/accounts/download/${order.account.id}`, "_blank");
  };

  const handleResetSessions = async () => {
    try {
      const res = await fetch(`/api/lolz/reset/${order?.account.id}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Успех", description: "Сессии сброшены" });
      } else {
        toast({ title: "Ошибка", description: data.error || "Не удалось сбросить", variant: "destructive" });
      }
    } catch {
      toast({ title: "Ошибка", description: "Нет подключения к API", variant: "destructive" });
    }
  };

  const handleGetCode = async () => {
    try {
      const res = await fetch(`/api/lolz/code/${order?.account.id}`);
      const data = await res.json();
      if (data.success && data.code) {
        navigator.clipboard.writeText(data.code);
        toast({ title: "Код получен", description: `Код: ${data.code} (скопирован)` });
      } else {
        toast({ title: "Ошибка", description: data.error || "Код не получен", variant: "destructive" });
      }
    } catch {
      toast({ title: "Ошибка", description: "Нет подключения к API", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-4 space-y-6">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </Layout>
    );
  }

  if (!account) {
    return (
      <Layout>
        <div className="p-4 text-center text-muted-foreground">Аккаунт не найден.</div>
      </Layout>
    );
  }

  // Full-screen delivery view after purchase
  if (order) {
    const acc = order.account;
    const hasApiIntegration = !!(acc.lolzItemId);

    return (
      <div className="min-h-[100dvh] w-full flex flex-col bg-background text-foreground">
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center px-4 gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLocation("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <span className="font-semibold tracking-tight text-lg">Данные аккаунта</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{getFlag(acc.country)}</span>
            <div>
              <div className="font-semibold">{acc.country || "Аккаунт Telegram"}</div>
              {acc.hasPremium && (
                <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-medium">Premium</span>
              )}
            </div>
          </div>

          <Card className="p-4 space-y-3 bg-card/80 border-border/40">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Данные для входа в Telegram</div>

            {acc.phone && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Номер телефона:</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted/60 rounded-lg px-3 py-2.5 text-sm font-mono">{acc.phone}</div>
                  <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => handleCopy(acc.phone!, "Номер")}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {acc.userId && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">ID аккаунта:</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted/60 rounded-lg px-3 py-2.5 text-sm font-mono">{acc.userId}</div>
                  <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => handleCopy(acc.userId!, "ID")}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {acc.authKey && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Auth Key:</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted/60 rounded-lg px-3 py-2.5 text-xs font-mono truncate">{acc.authKey.slice(0, 24)}...{acc.authKey.slice(-8)}</div>
                  <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => handleCopy(acc.authKey!, "Auth Key")}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {acc.dcId && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">DC:</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted/60 rounded-lg px-3 py-2.5 text-sm font-mono">{acc.dcId}</div>
                  <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => handleCopy(acc.dcId!, "DC")}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {acc.hasPassword && acc.password && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Пароль 2FA:</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted/60 rounded-lg px-3 py-2.5 text-sm font-mono">{acc.password}</div>
                  <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => handleCopy(acc.password!, "Пароль")}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {acc.description && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Описание:</label>
                <div className="bg-muted/60 rounded-lg px-3 py-2.5 text-xs text-muted-foreground">{acc.description}</div>
              </div>
            )}

            <div className="relative">
              <Button
                variant="outline"
                className="w-full h-10 text-sm"
                onClick={() => setShowCopyDropdown(!showCopyDropdown)}
              >
                Скопировать данные
                {showCopyDropdown ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
              </Button>
              {showCopyDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 overflow-hidden">
                  <Button variant="ghost" className="w-full justify-start text-xs h-9 rounded-none" onClick={handleCopyAll}>
                    Все данные
                  </Button>
                  {acc.phone && (
                    <Button variant="ghost" className="w-full justify-start text-xs h-9 rounded-none" onClick={() => handleCopy(acc.phone!, "Номер")}>
                      Только номер
                    </Button>
                  )}
                  {acc.authKey && (
                    <Button variant="ghost" className="w-full justify-start text-xs h-9 rounded-none" onClick={() => handleCopy(acc.authKey!, "Auth Key")}>
                      Только Auth Key
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>

          {acc.filePath && (
            <Card className="p-4 space-y-3 bg-card/80 border-border/40">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Скачать:</div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="h-8 text-xs bg-primary/10 border-primary/20 text-primary hover:bg-primary/20" onClick={handleDownload}>
                  <Download className="w-3 h-3 mr-1" />
                  TData
                </Button>
              </div>
            </Card>
          )}

          {hasApiIntegration && (
            <Card className="p-4 space-y-3 bg-card/80 border-border/40">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Получить код для входа в Telegram</div>
              <div className="flex gap-2">
                <Button className="flex-1 h-10 text-sm bg-green-600 hover:bg-green-700 text-white" onClick={handleGetCode}>
                  Получить код
                </Button>
                <Button variant="outline" className="flex-1 h-10 text-sm" onClick={handleResetSessions}>
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Сбросить сессии
                </Button>
              </div>
            </Card>
          )}
        </main>
      </div>
    );
  }

  // Purchase view
  const spamLabel = !account.spamBlock || account.spamBlock === "0" || account.spamBlock === "none"
    ? "Отсутствует"
    : account.spamBlock === "1" ? "Спам" : account.spamBlock;

  const idDigitCount = account.userId ? account.userId.replace(/\D/g, "").length : null;

  return (
    <Layout>
      <div className="p-4 space-y-4 pb-24">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getFlag(account.country)}</span>
          <div>
            <h1 className="text-xl font-bold">{account.country || "Аккаунт Telegram"}</h1>
            <div className="text-base font-medium mt-0.5">
              {account.isFree === "true" || account.price === 0 ? (
                <span className="text-green-400">Бесплатно</span>
              ) : (
                <span className="text-primary flex items-center gap-1">
                  <Shield className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  {account.price} Stars
                </span>
              )}
            </div>
            {account.hasPremium && (
              <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-medium">Premium</span>
            )}
          </div>
        </div>

        {account.dcId && (
          <div className="flex items-center gap-2">
            {account.phonePrefix && (
              <span className="text-[10px] bg-muted/60 px-2 py-0.5 rounded-full text-muted-foreground font-mono">
                {account.phonePrefix}****
              </span>
            )}
            <span className="text-[10px] bg-muted/60 px-2 py-0.5 rounded-full text-muted-foreground">
              DC {account.dcId}
            </span>
            <span className="text-[10px] bg-muted/60 px-2 py-0.5 rounded-full text-muted-foreground">
              Автодоставка
            </span>
          </div>
        )}

        {/* Достоверная информация */}
        <Card className="p-4 bg-card/80 border-border/40">
          <h3 className="text-sm font-semibold mb-3">Достоверная информация</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <InfoRow label="Страна" value={account.country || "—"} />
            <InfoRow label="Последняя активность" value={account.lastActivity || "—"} />
            <InfoRow label="Telegram Premium" value={account.hasPremium ? "Да" : "Нет"} />
            <InfoRow label="Есть пароль на аккаунте" value={account.hasPassword ? "Да" : "Нет"} />
            {idDigitCount !== null && (
              <InfoRow label="Количество цифр у ID" value={String(idDigitCount)} />
            )}
            <InfoRow label="Спамблок" value={spamLabel} />
            {account.origin && (
              <InfoRow label="Происхождение аккаунта" value={account.origin} />
            )}
            {account.registrationDate && (
              <InfoRow label="Дата регистрации" value={account.registrationDate} />
            )}
          </div>
        </Card>

        {account.isFree !== "true" && account.price !== 0 && (
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-3">
            <Shield className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            <span className="text-sm">Ваш баланс: <strong>{balance} Stars</strong></span>
          </div>
        )}
      </div>

      <div className="fixed bottom-[60px] left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border/50 z-10">
        <Button
          className="w-full h-12 text-base font-semibold"
          onClick={handleBuy}
          disabled={isBuying || account.status !== "available"}
        >
          {isBuying
            ? "Обработка..."
            : account.isFree === "true" || account.price === 0
              ? "Получить бесплатно"
              : account.status === "available"
                ? "Купить за Stars"
                : "Недоступен"}
        </Button>
      </div>
    </Layout>
  );
}
