import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Ban, Minus, Plus, User } from "lucide-react";

interface UserRow {
  telegramUserId: string;
  balance: number;
  updatedAt: string;
  orderCount: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [balanceAmount, setBalanceAmount] = useState("100");
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data);
    } catch {
      toast({ title: "Ошибка", description: "Не удалось загрузить пользователей", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateBalance = async (telegramUserId: string, delta: number) => {
    try {
      const res = await fetch(`/api/users/${telegramUserId}/balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: delta }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Успех", description: `Баланс обновлен: ${data.balance} Stars` });
        fetchUsers();
        setSelectedUser(null);
      } else {
        toast({ title: "Ошибка", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Ошибка", description: "Не удалось обновить баланс", variant: "destructive" });
    }
  };

  const handleBan = async (telegramUserId: string) => {
    toast({ title: "Заблокирован", description: `Пользователь ${telegramUserId} заблокирован` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Пользователи</h2>
        <div className="text-sm text-muted-foreground">
          Всего: {users.length}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Баланс</TableHead>
                <TableHead>Заказы</TableHead>
                <TableHead>Обновлён</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Пользователей пока нет.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.telegramUserId}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono text-xs">{u.telegramUserId}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {u.balance} Stars
                      </Badge>
                    </TableCell>
                    <TableCell>{u.orderCount}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(u.updatedAt).toLocaleDateString("ru-RU")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-500"
                          onClick={() => setSelectedUser(u)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-orange-500"
                          onClick={() => handleUpdateBalance(u.telegramUserId, -100)}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleBan(u.telegramUserId)}
                        >
                          <Ban className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Balance Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Изменить баланс</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Пользователь</Label>
              <div className="font-mono text-sm text-muted-foreground">{selectedUser?.telegramUserId}</div>
            </div>
            <div className="space-y-2">
              <Label>Текущий баланс</Label>
              <div className="font-semibold">{selectedUser?.balance} Stars</div>
            </div>
            <div className="space-y-2">
              <Label>Сумма</Label>
              <Input
                type="number"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
                placeholder="100"
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                variant="default"
                onClick={() => selectedUser && handleUpdateBalance(selectedUser.telegramUserId, parseInt(balanceAmount) || 0)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Выдать
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => selectedUser && handleUpdateBalance(selectedUser.telegramUserId, -(parseInt(balanceAmount) || 0))}
              >
                <Minus className="w-4 h-4 mr-1" />
                Забрать
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
