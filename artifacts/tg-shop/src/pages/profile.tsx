import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getTelegramUser } from "@/lib/telegram";
import { Star, User, Hash, AtSign } from "lucide-react";

export default function Profile() {
  const user = getTelegramUser();
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetch(`/api/balance/${user.id}`)
        .then((r) => r.json())
        .then((data) => {
          setBalance(data.balance ?? 0);
          setIsLoading(false);
        })
        .catch(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [user]);

  return (
    <Layout>
      <div className="p-4 space-y-4 pb-20">
        <div className="space-y-0.5">
          <h1 className="text-lg font-semibold tracking-tight">Профиль</h1>
          <p className="text-xs text-muted-foreground">Ваша информация и баланс.</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ) : (
          <>
            {/* Telegram User Info */}
            <Card className="p-4 border-border/40 bg-card/80">
              <div className="flex items-center gap-3">
                {user?.photo_url ? (
                  <img src={user.photo_url} alt="avatar" className="w-14 h-14 rounded-full object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-7 h-7 text-primary" />
                  </div>
                )}
                <div className="space-y-0.5">
                  <div className="font-semibold text-sm">{user?.first_name || "Пользователь"}</div>
                  {user?.username && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <AtSign className="w-3 h-3" />@{user.username}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Hash className="w-3 h-3" />ID: {user?.id ?? "Неизвестен"}
                  </div>
                </div>
              </div>
            </Card>

            {/* Balance */}
            <Card className="p-4 border-border/40 bg-card/80">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs text-muted-foreground">Баланс</div>
                  <div className="text-2xl font-bold flex items-center gap-1.5">
                    <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                    {balance}
                  </div>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
