import { useState } from "react";
import { useListOrders, getListOrdersQueryKey, useUpdateOrder } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидание",
  paid: "Оплачен",
  delivered: "Доставлен",
  cancelled: "Отменён",
  refunded: "Возврат",
};

const PAYMENT_LABELS: Record<string, string> = {
  stars: "⭐ Stars",
  crypto: "₿ Крипто",
  yookassa: "💳 ЮKassa",
};

export default function Orders() {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: orders, isLoading } = useListOrders({
    ...(statusFilter !== "all" && { status: statusFilter as any }),
  });

  const queryClient = useQueryClient();
  const updateOrder = useUpdateOrder();
  const { toast } = useToast();

  const handleUpdateStatus = (id: number, status: string) => {
    updateOrder.mutate({ id, data: { status: status as any } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        toast({ title: "Успешно", description: "Статус заказа обновлён" });
      },
      onError: () => {
        toast({ title: "Ошибка", description: "Не удалось обновить заказ", variant: "destructive" });
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Заказы</h2>
      </div>

      <div className="flex gap-4 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Фильтр по статусу" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="pending">Ожидание</SelectItem>
            <SelectItem value="paid">Оплачен</SelectItem>
            <SelectItem value="delivered">Доставлен</SelectItem>
            <SelectItem value="cancelled">Отменён</SelectItem>
            <SelectItem value="refunded">Возврат</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID заказа</TableHead>
                <TableHead>Пользователь</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Оплата</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Загрузка...</TableCell>
                </TableRow>
              ) : orders?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Заказов не найдено.</TableCell>
                </TableRow>
              ) : (
                orders?.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">#{order.id}</TableCell>
                    <TableCell>
                      {order.telegramUsername ? (
                        <span>@{order.telegramUsername}</span>
                      ) : (
                        <span className="text-muted-foreground font-mono text-xs">{order.telegramUserId}</span>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold">⭐ {order.amount}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={order.status === "delivered" ? "default" : order.status === "paid" ? "secondary" : "destructive"}>
                        {STATUS_LABELS[order.status] ?? order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(order.createdAt), "d MMM, HH:mm", { locale: ru })}
                    </TableCell>
                    <TableCell className="text-right">
                      {order.status === "paid" && (
                        <Button size="sm" onClick={() => handleUpdateStatus(order.id, "delivered")}>
                          Доставить
                        </Button>
                      )}
                      {order.status === "pending" && (
                        <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(order.id, "cancelled")}>
                          Отменить
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
