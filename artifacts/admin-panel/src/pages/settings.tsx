import { useEffect } from "react";
import { useGetBotSettings, useUpdateBotSettings, getGetBotSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const settingsSchema = z.object({
  botToken: z.string().min(1, "Токен бота обязателен"),
  welcomeMessage: z.string(),
  supportUsername: z.string().optional(),
  paymentYookassaEnabled: z.boolean(),
  yookassaShopId: z.string().optional(),
  yookassaSecretKey: z.string().optional(),
  paymentStarsEnabled: z.boolean(),
  paymentCryptoEnabled: z.boolean(),
  cryptoBotToken: z.string().optional(),
  lolzApiKey: z.string().optional(),
  tgApiId: z.string().optional(),
  tgApiHash: z.string().optional(),
});

export default function Settings() {
  const { data: settings, isLoading } = useGetBotSettings();
  const updateSettings = useUpdateBotSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      botToken: "",
      welcomeMessage: "",
      supportUsername: "",
      paymentYookassaEnabled: false,
      yookassaShopId: "",
      yookassaSecretKey: "",
      paymentStarsEnabled: false,
      paymentCryptoEnabled: false,
      cryptoBotToken: "",
      lolzApiKey: "",
      tgApiId: "",
      tgApiHash: "",
    }
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        botToken: settings.botToken || "",
        welcomeMessage: settings.welcomeMessage || "",
        supportUsername: settings.supportUsername || "",
        paymentYookassaEnabled: settings.paymentYookassaEnabled || false,
        yookassaShopId: settings.yookassaShopId || "",
        yookassaSecretKey: settings.yookassaSecretKey || "",
        paymentStarsEnabled: settings.paymentStarsEnabled || false,
        paymentCryptoEnabled: settings.paymentCryptoEnabled || false,
        cryptoBotToken: settings.cryptoBotToken || "",
        lolzApiKey: (settings as any).lolzApiKey || "",
        tgApiId: (settings as any).tgApiId || "",
        tgApiHash: (settings as any).tgApiHash || "",
      });
    }
  }, [settings, form]);

  const onSubmit = (values: z.infer<typeof settingsSchema>) => {
    updateSettings.mutate({ data: values as any }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBotSettingsQueryKey() });
        toast({ title: "Успешно", description: "Настройки сохранены" });
      },
      onError: () => {
        toast({ title: "Ошибка", description: "Не удалось сохранить настройки", variant: "destructive" });
      }
    });
  };

  if (isLoading) return <div className="text-muted-foreground">Загрузка...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Настройки</h2>
        <p className="text-muted-foreground mt-2">Настройка бота и платёжных шлюзов.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Настройки бота</CardTitle>
              <CardDescription>Основные настройки Telegram бота</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="botToken" render={({ field }) => (
                <FormItem>
                  <FormLabel>Токен бота</FormLabel>
                  <FormControl><Input {...field} type="password" placeholder="123456789:ABCdefGHIjklMNO..." /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="welcomeMessage" render={({ field }) => (
                <FormItem>
                  <FormLabel>Приветственное сообщение</FormLabel>
                  <FormControl><Input {...field} placeholder="Добро пожаловать в наш магазин!" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="supportUsername" render={({ field }) => (
                <FormItem>
                  <FormLabel>Username поддержки</FormLabel>
                  <FormControl><Input {...field} placeholder="support_admin" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Способы оплаты</CardTitle>
              <CardDescription>Настройка платёжных шлюзов</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              <div className="space-y-4 border rounded-md p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">⭐ Telegram Stars</h4>
                    <p className="text-sm text-muted-foreground">Принимать нативные Telegram Stars</p>
                  </div>
                  <FormField control={form.control} name="paymentStarsEnabled" render={({ field }) => (
                    <FormItem>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              <div className="space-y-4 border rounded-md p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">₿ Crypto Bot</h4>
                    <p className="text-sm text-muted-foreground">Принимать оплату криптовалютой</p>
                  </div>
                  <FormField control={form.control} name="paymentCryptoEnabled" render={({ field }) => (
                    <FormItem>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                </div>
                {form.watch("paymentCryptoEnabled") && (
                  <div className="pt-4 border-t">
                    <FormField control={form.control} name="cryptoBotToken" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Токен Crypto Bot</FormLabel>
                        <FormControl><Input {...field} type="password" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                )}
              </div>

              <div className="space-y-4 border rounded-md p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">💳 ЮKassa</h4>
                    <p className="text-sm text-muted-foreground">Банковские карты и российские платежи</p>
                  </div>
                  <FormField control={form.control} name="paymentYookassaEnabled" render={({ field }) => (
                    <FormItem>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                </div>
                {form.watch("paymentYookassaEnabled") && (
                  <div className="grid gap-4 pt-4 border-t">
                    <FormField control={form.control} name="yookassaShopId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID магазина</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="yookassaSecretKey" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Секретный ключ</FormLabel>
                        <FormControl><Input {...field} type="password" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                )}
              </div>

            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>LolzTeam Market</CardTitle>
              <CardDescription>Автоматический импорт аккаунтов с lolz.guru/market</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="lolzApiKey" render={({ field }) => (
                <FormItem>
                  <FormLabel>API ключ LolzTeam</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" placeholder="Ваш токен с lolz.guru → Настройки → API" />
                  </FormControl>
                  <p className="text-xs text-muted-foreground mt-1">
                    Получить ключ: lolz.guru → Настройки профиля → API / Applications
                  </p>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Telegram API</CardTitle>
              <CardDescription>
                Учётные данные для MTProto (Сессии). Получить на{" "}
                <a href="https://my.telegram.org" target="_blank" rel="noreferrer" className="text-primary underline">my.telegram.org</a>{" "}
                → API development tools.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="tgApiId" render={({ field }) => (
                <FormItem>
                  <FormLabel>API ID</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="12345678" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="tgApiHash" render={({ field }) => (
                <FormItem>
                  <FormLabel>API Hash</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" placeholder="0123456789abcdef0123456789abcdef" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Button type="submit" size="lg" disabled={updateSettings.isPending}>
            {updateSettings.isPending ? "Сохранение..." : "Сохранить настройки"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
