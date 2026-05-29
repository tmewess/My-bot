import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const ADMIN_USER = "Void";
const ADMIN_PASS = "Clock358";

export default function Login({ onLogin }: { onLogin: (u: string, p: string) => Promise<void> }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const username = (e.target as any).username.value;
      const password = (e.target as any).password.value;
      if (username !== ADMIN_USER || password !== ADMIN_PASS) {
        throw new Error("Неверный логин или пароль");
      }
      await onLogin(username, password);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background dark flex items-center justify-center p-4">
      <Card className="w-full max-w-sm bg-card border-border">
        <CardHeader className="space-y-1 text-center">
          <div className="text-2xl font-bold font-mono text-primary mb-1">TG_ADMIN</div>
          <CardTitle className="text-lg">Вход в панель</CardTitle>
          <CardDescription className="text-muted-foreground text-sm">
            Доступ только для авторизованных администраторов
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Имя пользователя</label>
              <Input
                name="username"
                data-testid="input-username"
                placeholder="Void"
                autoComplete="username"
                defaultValue=""
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Пароль</label>
              <Input
                name="password"
                data-testid="input-password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                defaultValue=""
              />
            </div>
            {error && (
              <p data-testid="text-login-error" className="text-sm text-destructive text-center">{error}</p>
            )}
            <Button
              data-testid="button-login"
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Вход..." : "Войти"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
