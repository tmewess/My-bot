import { useGetDashboardStats, useGetRecentOrders, useHealthCheck } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ShoppingCart, Star, Package, Activity } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидание",
  paid: "Оплачен",
  delivered: "Доставлен",
  cancelled: "Отменён",
  refunded: "Возврат",
};

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: recentOrders, isLoading: ordersLoading } = useGetRecentOrders();
  const { data: health } = useHealthCheck();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Главная</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Выручка</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">⭐ {stats?.totalRevenue ?? 0}</div>
            <p className="text-xs text-muted-foreground">+⭐ {stats?.todayRevenue ?? 0} сегодня</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Аккаунты</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalAccounts ?? 0}</div>
            <p className="text-xs text-muted-foreground">{stats?.availableAccounts ?? 0} доступно, {stats?.soldAccounts ?? 0} продано</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Заказы</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOrders ?? 0}</div>
            <p className="text-xs text-muted-foreground">{stats?.pendingOrders ?? 0} ожидают</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Состояние системы</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${health?.status === "ok" ? "text-green-500" : "text-yellow-500"}`}>
              {health?.status === "ok" ? "Работает" : (health?.status || "Проверка...")}
            </div>
            <p className="text-xs text-muted-foreground">Статус API</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader><CardTitle>Последние заказы</CardTitle></CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="text-sm text-muted-foreground">Загрузка...</div>
            ) : recentOrders?.length === 0 ? (
              <div className="text-sm text-muted-foreground">Заказов пока нет</div>
            ) : (
              <div className="space-y-4">
                {recentOrders?.slice(0, 5).map(order => (
                  <div key={order.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">Заказ #{order.id}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.telegramUsername ? `@${order.telegramUsername}` : `ID: ${order.telegramUserId}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">⭐ {order.amount}</p>
                      <p className="text-xs text-muted-foreground">{STATUS_LABELS[order.status] ?? order.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader><CardTitle>Быстрые действия</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            <button
              type="button"
              onClick={() => navigate("/accounts")}
              className="flex items-center gap-4 border p-4 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/80 transition-colors text-left w-full"
            >
              <Package className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Загрузить аккаунт</p>
                <p className="text-xs text-muted-foreground">Добавить новый товар в каталог</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => navigate("/orders")}
              className="flex items-center gap-4 border p-4 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/80 transition-colors text-left w-full"
            >
              <ShoppingCart className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Посмотреть заказы</p>
                <p className="text-xs text-muted-foreground">Все покупки покупателей</p>
              </div>
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
