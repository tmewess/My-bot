import { useState } from "react";
import { useListOrders } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { getTelegramUser } from "@/lib/telegram";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Copy, Download, RotateCcw, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";

interface OrderWithAccount {
  id: number;
  telegramUserId: string;
  telegramUsername: string | null;
  accountId: number;
  status: string;
  paymentMethod: string;
  amount: number;
  createdAt: string;
  accountPhone: string | null;
  accountCountry: string | null;
  accountDcId: string | null;
  accountUserId: string | null;
  accountAuthKey: string | null;
  accountFilePath: string | null;
  accountLolzItemId: string | null;
  accountHasPremium: boolean;
  accountDescription: string | null;
  accountPassword: string | null;
  accountHasPassword: boolean | null;
}

const COUNTRY_FLAGS: Record<string, string> = {
  "США": "🇺🇸", "Россия": "🇷🇺", "Украина": "🇺🇦", "Казахстан": "🇰🇿",
  "Беларусь": "🇧🇾", "Польша": "🇵🇱", "Германия": "🇩🇪", "Франция": "🇫🇷",
  "Италия": "🇮🇹", "Турция": "🇹🇷", "Индия": "🇮🇳", "Китай": "🇨🇳",
  "Япония": "🇯🇵", "Бразилия": "🇧🇷", "Аргентина": "🇦🇷",
};

function getFlag(country: string): string {
  return COUNTRY_FLAGS[country] || "";
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидание", paid: "Оплачен", delivered: "Доставлен",
  cancelled: "Отменен", refunded: "Возврат",
};

const STATUS_COLORS: Record<string, string> = {
  delivered: "bg-green-500/10 text-green-500",
  paid: "bg-blue-500/10 text-blue-500",
  pending: "bg-yellow-500/10 text-yellow-500",
  cancelled: "bg-red-500/10 text-red-500",
  refunded: "bg-red-500/10 text-red-500",
};

export default function Orders() {
  const user = getTelegramUser();
  const telegramUserId = user?.id.toString() || "dev";
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedOrder, setSelectedOrder] = useState<OrderWithAccount | null>(null);
  const [showCopyDropdown, setShowCopyDropdown] = useState(false);

  const { data: orders, isLoading } = useListOrders(
    {},
    { query: { queryKey: ["listOrders"] } }
  );

  const userOrders = orders?.filter((o: any) => o.telegramUserId === telegramUserId) || [];

  const handleCopy = (text: string | null, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({ title: "Скопировано", description: `${label} скопирован в буфер` });
  };

  const handleCopyAll = (order: OrderWithAccount) => {
    const parts: string[] = [];
    if (order.accountPhone) parts.push(`Номер: ${order.accountPhone}`);
    if (order.accountUserId) parts.push(`ID: ${order.accountUserId}`);
    if (order.accountAuthKey) parts.push(`Auth Key: ${order.accountAuthKey}`);
    if (order.accountDcId) parts.push(`DC: ${order.accountDcId}`);
    if (order.accountHasPassword && order.accountPassword) parts.push(`Пароль 2FA: ${order.accountPassword}`);
    navigator.clipboard.writeText(parts.join("\n"));
    toast({ title: "Скопировано", description: "Все данные аккаунта" });
  };

  const handleDownload = (accountId: number) => {
    window.open(`/api/accounts/download/${accountId}`, "_blank");
  };

  const handleResetSessions = async (order: OrderWithAccount) => {
    try {
      const res = await fetch(`/api/lolz/reset/${order.accountId}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Успех", description: "Сессии сброшены" });
      } else {
        toast({ title: "Ошибка", description: data.error || "Не удалось сбросить сессии", variant: "destructive" });
      }
    } catch {
      toast({ title: "Ошибка", description: "Нет подключения к API", variant: "destructive" });
    }
  };

  const handleGetCode = async (order: OrderWithAccount) => {
    try {
      const res = await fetch(`/api/lolz/code/${order.accountId}`);
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

  // Full-screen detail view
  if (selectedOrder) {
    const order = selectedOrder;
    const hasApiIntegration = !!(order.accountLolzItemId);

    return (
      <div className="min-h-[100dvh] w-full flex flex-col bg-background text-foreground">
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center px-4 gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedOrder(null)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <span className="font-semibold tracking-tight text-lg">Данные аккаунта</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{getFlag(order.accountCountry || "")}</span>
            <div>
              <div className="font-semibold">{order.accountCountry || "Аккаунт Telegram"}</div>
              {order.accountHasPremium && (
                <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-medium">Premium</span>
              )}
            </div>
          </div>

          {/* Login data */}
          <div className="space-y-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Данные для входа в Telegram</div>

            {order.accountPhone && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Номер телефона:</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted/60 rounded-lg px-3 py-2.5 text-sm font-mono">{order.accountPhone}</div>
                  <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => handleCopy(order.accountPhone, "Номер")}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {order.accountUserId && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">ID аккаунта:</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted/60 rounded-lg px-3 py-2.5 text-sm font-mono">{order.accountUserId}</div>
                  <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => handleCopy(order.accountUserId, "ID")}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {order.accountAuthKey && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Auth Key:</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted/60 rounded-lg px-3 py-2.5 text-xs font-mono truncate">
                    {order.accountAuthKey.slice(0, 24)}...{order.accountAuthKey.slice(-8)}
                  </div>
                  <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => handleCopy(order.accountAuthKey, "Auth Key")}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {order.accountDcId && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">DC:</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted/60 rounded-lg px-3 py-2.5 text-sm font-mono">{order.accountDcId}</div>
                  <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => handleCopy(order.accountDcId, "DC")}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {order.accountHasPassword && order.accountPassword && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Пароль 2FA:</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted/60 rounded-lg px-3 py-2.5 text-sm font-mono">{order.accountPassword}</div>
                  <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => handleCopy(order.accountPassword, "Пароль")}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {order.accountDescription && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Описание:</label>
                <div className="bg-muted/60 rounded-lg px-3 py-2.5 text-xs text-muted-foreground">{order.accountDescription}</div>
              </div>
            )}

            {/* Copy dropdown */}
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
                  <Button variant="ghost" className="w-full justify-start text-xs h-9 rounded-none" onClick={() => { handleCopyAll(order); setShowCopyDropdown(false); }}>
                    Все данные
                  </Button>
                  {order.accountPhone && (
                    <Button variant="ghost" className="w-full justify-start text-xs h-9 rounded-none" onClick={() => { handleCopy(order.accountPhone, "Номер"); setShowCopyDropdown(false); }}>
                      Только номер
                    </Button>
                  )}
                  {order.accountAuthKey && (
                    <Button variant="ghost" className="w-full justify-start text-xs h-9 rounded-none" onClick={() => { handleCopy(order.accountAuthKey, "Auth Key"); setShowCopyDropdown(false); }}>
                      Только Auth Key
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Download - TData only */}
          {order.accountFilePath && (
            <div className="space-y-3">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Скачать:</div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="h-8 text-xs bg-primary/10 border-primary/20 text-primary hover:bg-primary/20" onClick={() => handleDownload(order.accountId)}>
                  <Download className="w-3 h-3 mr-1" />
                  TData
                </Button>
              </div>
            </div>
          )}

          {/* Code & Reset */}
          {hasApiIntegration && (
            <div className="space-y-3">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Получить код для входа в Telegram</div>
              <div className="flex gap-2">
                <Button className="flex-1 h-10 text-sm bg-green-600 hover:bg-green-700 text-white" onClick={() => handleGetCode(order)}>
                  Получить код
                </Button>
                <Button variant="outline" className="flex-1 h-10 text-sm" onClick={() => handleResetSessions(order)}>
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Сбросить сессии
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <Layout>
      <div className="p-4 space-y-4 pb-20">
        <div className="space-y-0.5">
          <h1 className="text-lg font-semibold tracking-tight">Мои заказы</h1>
          <p className="text-xs text-muted-foreground">История покупок и доступ к аккаунтам.</p>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))
          ) : userOrders.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              У вас ещё нет заказов.
            </div>
          ) : (
            userOrders.map((o: any) => (
              <Card
                key={o.id}
                className="p-3.5 flex flex-col space-y-2 border-border/50 cursor-pointer hover:bg-accent/30 transition-colors"
                onClick={() => { setSelectedOrder(o); setShowCopyDropdown(false); }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      {o.accountCountry && (
                        <span className="text-base">{getFlag(o.accountCountry)}</span>
                      )}
                      <div className="font-medium text-sm">{o.accountCountry || `Заказ #${o.id}`}</div>
                      {o.accountHasPremium && (
                        <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-medium">Premium</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(o.createdAt), "d MMM yyyy, HH:mm", { locale: ru })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-primary text-sm">{o.amount > 0 ? `${o.amount} Stars` : "Бесплатно"}</div>
                    <span className={`px-2 py-0.5 rounded-sm uppercase tracking-wider font-semibold text-[10px] ${STATUS_COLORS[o.status] ?? "bg-muted text-muted-foreground"}`}>
                      {STATUS_LABELS[o.status] ?? o.status}
                    </span>
                  </div>
                </div>
                {o.accountPhone && (
                  <div className="text-xs text-muted-foreground font-mono">
                    {o.accountPhone}{o.accountDcId ? ` · DC ${o.accountDcId}` : ""}
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
