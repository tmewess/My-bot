import { useState } from "react";
import { useListAccounts, useDeleteAccount, getListAccountsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Download, Search, Loader2, Globe, Star, ShieldAlert, Crown, Key, Wifi } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

const STATUS_LABELS: Record<string, string> = {
  available: "Доступен",
  sold: "Продан",
  reserved: "Зарезервирован",
};

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

interface LolzAccount {
  itemId: number;
  price: number;
  title: string;
  phone: string | null;
  country: string | null;
  hasPremium: boolean;
  hasPassword: boolean;
  spamBlock: string | null;
  dcId: string | null;
  userId: string | null;
  idDigitCount: number | null;
  registrationDate: string | null;
  canGetCode: boolean;
  origin: string | null;
}

const LOLZ_COUNTRIES: { code: string; name: string }[] = [
  { code: "ru", name: "Россия" },
  { code: "ua", name: "Украина" },
  { code: "us", name: "США" },
  { code: "kz", name: "Казахстан" },
  { code: "by", name: "Беларусь" },
  { code: "uz", name: "Узбекистан" },
  { code: "az", name: "Азербайджан" },
  { code: "am", name: "Армения" },
  { code: "ge", name: "Грузия" },
  { code: "kg", name: "Кыргызстан" },
  { code: "tj", name: "Таджикистан" },
  { code: "md", name: "Молдова" },
  { code: "lt", name: "Литва" },
  { code: "lv", name: "Латвия" },
  { code: "ee", name: "Эстония" },
  { code: "pl", name: "Польша" },
  { code: "de", name: "Германия" },
  { code: "fr", name: "Франция" },
  { code: "gb", name: "Великобритания" },
  { code: "nl", name: "Нидерланды" },
  { code: "tr", name: "Турция" },
  { code: "in", name: "Индия" },
  { code: "id", name: "Индонезия" },
  { code: "br", name: "Бразилия" },
  { code: "ph", name: "Филиппины" },
  { code: "vn", name: "Вьетнам" },
  { code: "th", name: "Таиланд" },
  { code: "ng", name: "Нигерия" },
  { code: "pk", name: "Пакистан" },
  { code: "bd", name: "Бангладеш" },
  { code: "other", name: "Другая" },
];

const LOLZ_ORIGINS: { value: string; label: string }[] = [
  { value: "", label: "Любой тип" },
  { value: "autoreg", label: "Авторег" },
  { value: "fishing", label: "Фишинг" },
  { value: "unknown", label: "Неизвестно" },
  { value: "grant", label: "Грант" },
  { value: "mix", label: "Микс" },
];

function useCardForm() {
  const [country, setCountry] = useState("Россия");
  const [phonePrefix, setPhonePrefix] = useState("+7");
  const [dcId, setDcId] = useState("");
  const [hasPremium, setHasPremium] = useState(false);
  const [spamBlock, setSpamBlock] = useState("");
  const [origin, setOrigin] = useState("");
  const [lastActivity, setLastActivity] = useState("");
  const [registrationDate, setRegistrationDate] = useState("");
  const [price, setPrice] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [phone, setPhone] = useState("");
  const [userId, setUserId] = useState("");
  const [authKey, setAuthKey] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const reset = () => {
    setCountry("Россия"); setPhonePrefix("+7"); setDcId(""); setHasPremium(false);
    setSpamBlock(""); setOrigin(""); setLastActivity(""); setRegistrationDate("");
    setPrice(""); setIsFree(false); setPhone(""); setUserId(""); setAuthKey("");
    setHasPassword(false); setPassword(""); setDescription(""); setFile(null);
  };

  const fillFromLolz = (acc: LolzAccount) => {
    const raw = acc.country ?? "";
    const mapped = COUNTRY_FLAGS[raw] ? raw : raw;
    setCountry(mapped || "");
    const p = acc.phone ?? "";
    if (p) {
      const match = p.match(/^(\+\d{1,3})/);
      if (match) setPhonePrefix(match[1]);
      setPhone(p);
    }
    setDcId(acc.dcId ?? "");
    setUserId(acc.userId ?? "");
    setHasPremium(acc.hasPremium);
    const spam = acc.spamBlock;
    setSpamBlock(!spam || spam === "0" || spam === "none" ? "Отсутствует" : spam === "1" ? "Спам" : `Спам: ${spam}`);
    setRegistrationDate(acc.registrationDate ?? "");
    setOrigin(""); setLastActivity(""); setAuthKey(""); setHasPassword(false);
    setPassword(""); setDescription(""); setFile(null);
    setPrice(String(acc.price)); setIsFree(false);
  };

  return {
    country, setCountry, phonePrefix, setPhonePrefix, dcId, setDcId,
    hasPremium, setHasPremium, spamBlock, setSpamBlock, origin, setOrigin,
    lastActivity, setLastActivity, registrationDate, setRegistrationDate,
    price, setPrice, isFree, setIsFree, phone, setPhone,
    userId, setUserId, authKey, setAuthKey, hasPassword, setHasPassword,
    password, setPassword, description, setDescription, file, setFile,
    reset, fillFromLolz,
  };
}

export default function Accounts() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: accounts, isLoading } = useListAccounts({
    ...(statusFilter !== "all" && { status: statusFilter as any }),
  });

  const [isCardOpen, setIsCardOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingLolz, setPendingLolz] = useState<LolzAccount | null>(null);

  const form = useCardForm();

  const [isLolzOpen, setIsLolzOpen] = useState(false);
  const [lolzAccounts, setLolzAccounts] = useState<LolzAccount[]>([]);
  const [lolzLoading, setLolzLoading] = useState(false);

  const [lolzPmin, setLolzPmin] = useState("");
  const [lolzPmax, setLolzPmax] = useState("");
  const [lolzCount, setLolzCount] = useState("20");
  const [lolzIsFree, setLolzIsFree] = useState(false);
  const [lolzCountry, setLolzCountry] = useState("");
  const [lolzOrigin, setLolzOrigin] = useState("");
  const [lolzHasPassword, setLolzHasPassword] = useState(false);
  const [lolzHasPremium, setLolzHasPremium] = useState(false);
  const [lolzNoSpam, setLolzNoSpam] = useState(false);
  const [lolzApiCode, setLolzApiCode] = useState(false);
  const [lolzAccountIdMin, setLolzAccountIdMin] = useState("");
  const [lolzAccountIdMax, setLolzAccountIdMax] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteAccount = useDeleteAccount();

  const openManualCard = () => {
    setPendingLolz(null);
    form.reset();
    setIsCardOpen(true);
  };

  const openLolzCard = (acc: LolzAccount) => {
    setPendingLolz(acc);
    form.fillFromLolz(acc);
    if (lolzIsFree) form.setIsFree(true);
    setIsCardOpen(true);
  };

  const handleCardSave = async () => {
    if (!form.price && !form.isFree) {
      toast({ title: "Ошибка", description: "Укажите цену или отметьте как бесплатный", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      if (pendingLolz) {
        const res = await fetch(`/api/lolz/import/${pendingLolz.itemId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lolzPrice: pendingLolz.price,
            price: form.isFree ? 0 : parseFloat(form.price) || 0,
            isFree: form.isFree ? "true" : "false",
            country: form.country,
            phonePrefix: form.phonePrefix,
            phone: form.phone,
            dcId: form.dcId,
            userId: form.userId,
            authKey: form.authKey,
            hasPremium: form.hasPremium,
            hasPassword: form.hasPassword,
            password: form.hasPassword ? form.password : undefined,
            spamBlock: form.spamBlock,
            registrationDate: form.registrationDate,
            origin: form.origin,
            lastActivity: form.lastActivity,
            description: form.description,
          }),
        });
        const data = await res.json() as { success: boolean; message: string };
        if (data.success) {
          queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
          setLolzAccounts(prev => prev.filter(a => a.itemId !== pendingLolz.itemId));
          setIsCardOpen(false);
          form.reset();
          setPendingLolz(null);
          toast({ title: "Импортировано", description: data.message });
        } else {
          toast({ title: "Ошибка", description: data.message, variant: "destructive" });
        }
      } else {
        const formData = new FormData();
        if (form.file) formData.append("file", form.file);
        formData.append("phone", form.phone);
        formData.append("country", form.country);
        formData.append("phonePrefix", form.phonePrefix);
        formData.append("dcId", form.dcId);
        formData.append("userId", form.userId);
        formData.append("authKey", form.authKey);
        formData.append("price", form.isFree ? "0" : form.price);
        formData.append("isFree", form.isFree ? "true" : "false");
        formData.append("hasPremium", form.hasPremium ? "true" : "false");
        formData.append("hasPassword", form.hasPassword ? "true" : "false");
        if (form.hasPassword && form.password) formData.append("password", form.password);
        formData.append("spamBlock", form.spamBlock);
        formData.append("registrationDate", form.registrationDate);
        formData.append("origin", form.origin);
        formData.append("lastActivity", form.lastActivity);
        formData.append("description", form.description);

        const uploadRes = await fetch("/api/accounts/upload", { method: "POST", body: formData });
        if (!uploadRes.ok) throw new Error("Upload failed");
        const { accountId } = await uploadRes.json() as { accountId: number };
        queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
        setIsCardOpen(false);
        form.reset();
        toast({ title: "Успешно", description: `Аккаунт #${accountId} добавлен` });
      }
    } catch {
      toast({ title: "Ошибка", description: "Не удалось сохранить аккаунт", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Удалить этот аккаунт?")) return;
    deleteAccount.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
        toast({ title: "Успешно", description: "Аккаунт удалён" });
      }
    });
  };

  const handleDeleteAll = async () => {
    if (!confirm("Удалить ВСЕ аккаунты? Это невозвратно!")) return;
    const res = await fetch("/api/accounts", { method: "DELETE" });
    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
      toast({ title: "Успешно", description: "Все аккаунты удалены" });
    }
  };

  const handleLolzSearch = async () => {
    setLolzLoading(true);
    setLolzAccounts([]);
    try {
      const params = new URLSearchParams();
      if (lolzPmin) params.set("pmin", lolzPmin);
      if (lolzPmax) params.set("pmax", lolzPmax);
      if (lolzCount) params.set("count", lolzCount);
      if (lolzCountry) params.set("country", lolzCountry);
      if (lolzOrigin) params.set("item_origin", lolzOrigin);
      if (lolzHasPassword) params.set("has_password", "1");
      if (lolzHasPremium) params.set("has_premium", "1");
      if (lolzNoSpam) params.set("spam", "0");
      if (lolzApiCode) params.set("api_code", "1");
      if (lolzAccountIdMin) params.set("account_id_min", lolzAccountIdMin);
      if (lolzAccountIdMax) params.set("account_id_max", lolzAccountIdMax);

      const res = await fetch(`/api/lolz/accounts?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "Ошибка запроса");
      }
      const data = await res.json() as LolzAccount[];
      setLolzAccounts(data);
      if (data.length === 0) toast({ title: "Импорт", description: "Аккаунтов не найдено" });
    } catch (err) {
      toast({ title: "Ошибка", description: err instanceof Error ? err.message : "Ошибка поиска", variant: "destructive" });
    } finally {
      setLolzLoading(false);
    }
  };

  const getSpamLabel = (spam: string | null) => {
    if (!spam || spam === "0" || spam === "none") return null;
    if (spam === "1") return "Спам";
    return `Спам: ${spam}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Аккаунты</h2>
        <div className="flex gap-2 flex-wrap">
          <Button variant="destructive" size="sm" onClick={handleDeleteAll}>
            <Trash2 className="mr-1 h-4 w-4" /> Очистить все
          </Button>

          {/* LolzTeam Import */}
          <Dialog open={isLolzOpen} onOpenChange={setIsLolzOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" /> Импорт LolzTeam
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Импорт аккаунтов с LolzTeam Market</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Поиск и покупка Telegram аккаунтов. API ключ задаётся в <strong>Настройках</strong>.
                </p>

                <div className="grid grid-cols-3 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Мин. цена ($)</Label>
                    <Input value={lolzPmin} onChange={e => setLolzPmin(e.target.value)} placeholder="0" type="number" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Макс. цена ($)</Label>
                    <Input value={lolzPmax} onChange={e => setLolzPmax(e.target.value)} placeholder="100" type="number" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Кол-во</Label>
                    <Input value={lolzCount} onChange={e => setLolzCount(e.target.value)} placeholder="20" type="number" min="1" max="100" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" />Страна</Label>
                    <select
                      value={lolzCountry}
                      onChange={e => setLolzCountry(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">Любая</option>
                      {LOLZ_COUNTRIES.map(c => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Тип аккаунта</Label>
                    <select
                      value={lolzOrigin}
                      onChange={e => setLolzOrigin(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {LOLZ_ORIGINS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="flex items-center gap-1.5"><Key className="w-3.5 h-3.5" />ID аккаунта от</Label>
                    <Input value={lolzAccountIdMin} onChange={e => setLolzAccountIdMin(e.target.value)} placeholder="10000000 (8 цифр)" type="number" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>ID аккаунта до</Label>
                    <Input value={lolzAccountIdMax} onChange={e => setLolzAccountIdMax(e.target.value)} placeholder="999999999 (9 цифр)" type="number" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border rounded-lg p-3 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Switch id="filter-password" checked={lolzHasPassword} onCheckedChange={setLolzHasPassword} />
                    <Label htmlFor="filter-password" className="cursor-pointer text-sm flex items-center gap-1">
                      <Key className="w-3.5 h-3.5 text-orange-400" />Есть пароль (2FA)
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="filter-premium" checked={lolzHasPremium} onCheckedChange={setLolzHasPremium} />
                    <Label htmlFor="filter-premium" className="cursor-pointer text-sm flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5 text-yellow-400" />Есть Premium
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="filter-nospam" checked={lolzNoSpam} onCheckedChange={setLolzNoSpam} />
                    <Label htmlFor="filter-nospam" className="cursor-pointer text-sm flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-green-400" />Нет спамблока
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="filter-apicode" checked={lolzApiCode} onCheckedChange={setLolzApiCode} />
                    <Label htmlFor="filter-apicode" className="cursor-pointer text-sm flex items-center gap-1">
                      <Wifi className="w-3.5 h-3.5 text-blue-400" />Код по API
                    </Label>
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    <Switch id="filter-free" checked={lolzIsFree} onCheckedChange={setLolzIsFree} />
                    <Label htmlFor="filter-free" className="cursor-pointer text-sm">
                      <Star className="w-3.5 h-3.5 inline mr-1 text-yellow-400" />Выставить как бесплатный
                    </Label>
                  </div>
                </div>

                <Button onClick={handleLolzSearch} disabled={lolzLoading} className="w-full">
                  {lolzLoading
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Поиск...</>
                    : <><Search className="mr-2 h-4 w-4" /> Найти аккаунты</>}
                </Button>

                {lolzAccounts.length > 0 && (
                  <div className="border rounded-md divide-y max-h-80 overflow-y-auto">
                    {lolzAccounts.map(acc => (
                      <div key={acc.itemId} className="flex items-center justify-between p-3 gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium truncate mb-1" title={acc.title}>
                            {acc.title}
                          </div>
                          <div className="flex items-center gap-1 flex-wrap">
                            {acc.country && (
                              <span className="text-[10px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded font-medium uppercase">{acc.country}</span>
                            )}
                            {acc.dcId && (
                              <span className="text-[10px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded">DC {acc.dcId}</span>
                            )}
                            {acc.idDigitCount && (
                              <span className="text-[10px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded">{acc.idDigitCount} цифр ID</span>
                            )}
                            {acc.origin && (
                              <span className="text-[10px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded capitalize">{acc.origin}</span>
                            )}
                            {acc.hasPremium && (
                              <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                                <Crown className="w-2.5 h-2.5" />Premium
                              </span>
                            )}
                            {acc.hasPassword && (
                              <span className="text-[10px] bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                                <Key className="w-2.5 h-2.5" />Пароль
                              </span>
                            )}
                            {acc.canGetCode && (
                              <span className="text-[10px] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                                <Wifi className="w-2.5 h-2.5" />API
                              </span>
                            )}
                            {getSpamLabel(acc.spamBlock) && (
                              <span className="text-[10px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded font-medium">
                                {getSpamLabel(acc.spamBlock)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-semibold text-primary">${acc.price}</span>
                          <Button size="sm" onClick={() => { setIsLolzOpen(false); openLolzCard(acc); }}>
                            Заполнить
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Manual Upload */}
          <Button onClick={openManualCard}>
            <Plus className="mr-2 h-4 w-4" /> Загрузить
          </Button>
        </div>
      </div>

      {/* Unified Account Card Dialog */}
      <Dialog open={isCardOpen} onOpenChange={(open) => { if (!open) { setIsCardOpen(false); form.reset(); setPendingLolz(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {pendingLolz
                ? `Карточка товара — LolzTeam #${pendingLolz.itemId}`
                : "Карточка товара — новый аккаунт"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-1">
            {/* Section 1: Public card data */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Карточка товара (публично)</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Страна</Label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">{getFlag(form.country)}</span>
                    <Input value={form.country} onChange={e => form.setCountry(e.target.value)} placeholder="Россия" />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label>Префикс телефона</Label>
                  <Input value={form.phonePrefix} onChange={e => form.setPhonePrefix(e.target.value)} placeholder="+7" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>DC ID</Label>
                  <Input value={form.dcId} onChange={e => form.setDcId(e.target.value)} placeholder="2" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Происхождение</Label>
                  <Input value={form.origin} onChange={e => form.setOrigin(e.target.value)} placeholder="Авторег" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Последняя активность</Label>
                  <Input value={form.lastActivity} onChange={e => form.setLastActivity(e.target.value)} placeholder="01.05.2026" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Дата регистрации</Label>
                  <Input value={form.registrationDate} onChange={e => form.setRegistrationDate(e.target.value)} placeholder="2023" />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label>Спамблок</Label>
                <Input value={form.spamBlock} onChange={e => form.setSpamBlock(e.target.value)} placeholder="Отсутствует" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Цена (⭐ Stars)</Label>
                  <Input type="number" value={form.price} onChange={e => form.setPrice(e.target.value)} placeholder="50" disabled={form.isFree} />
                </div>
                <div className="flex items-end gap-3 pb-1">
                  <Switch id="free-toggle" checked={form.isFree} onCheckedChange={form.setIsFree} />
                  <Label htmlFor="free-toggle">Бесплатный</Label>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch id="premium-toggle" checked={form.hasPremium} onCheckedChange={form.setHasPremium} />
                <Label htmlFor="premium-toggle" className="flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-yellow-400" /> Telegram Premium
                </Label>
              </div>
            </div>

            {/* Section 2: Private data */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Данные после покупки (приватно)</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="grid gap-1.5">
                <Label>Полный номер телефона</Label>
                <Input value={form.phone} onChange={e => form.setPhone(e.target.value)} placeholder="+79991234567" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>User ID</Label>
                  <Input value={form.userId} onChange={e => form.setUserId(e.target.value)} placeholder="123456789" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Auth Key (HEX)</Label>
                  <Input value={form.authKey} onChange={e => form.setAuthKey(e.target.value)} placeholder="Ключ аутентификации" />
                </div>
              </div>

              {!pendingLolz && (
                <div className="grid gap-1.5">
                  <Label>ZIP файл (tdata) — необязательно</Label>
                  <Input type="file" accept=".zip" onChange={(e) => form.setFile(e.target.files?.[0] || null)} />
                </div>
              )}

              <div className="flex items-center gap-3">
                <Switch id="password-toggle" checked={form.hasPassword} onCheckedChange={form.setHasPassword} />
                <Label htmlFor="password-toggle" className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-orange-400" /> Есть пароль (2FA)
                </Label>
              </div>
              {form.hasPassword && (
                <div className="grid gap-1.5">
                  <Label>Пароль 2FA</Label>
                  <Input type="text" value={form.password} onChange={e => form.setPassword(e.target.value)} placeholder="Введите пароль" />
                </div>
              )}

              <div className="grid gap-1.5">
                <Label>Описание / заметки (необязательно)</Label>
                <Input value={form.description} onChange={e => form.setDescription(e.target.value)} placeholder="Доп. информация" />
              </div>
            </div>
          </div>

          <Button onClick={handleCardSave} disabled={isSaving} className="w-full">
            {isSaving
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Сохранение...</>
              : pendingLolz
                ? "Купить на LolzTeam и сохранить"
                : "Сохранить аккаунт"}
          </Button>
        </DialogContent>
      </Dialog>

      <div className="flex gap-4 items-center flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Фильтр по статусу" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="available">Доступен</SelectItem>
            <SelectItem value="sold">Продан</SelectItem>
            <SelectItem value="reserved">Зарезервирован</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Страна</TableHead>
                <TableHead>Номер</TableHead>
                <TableHead>DC</TableHead>
                <TableHead>Цена</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Добавлен</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Загрузка...</TableCell></TableRow>
              ) : accounts?.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Аккаунтов не найдено.</TableCell></TableRow>
              ) : (
                accounts?.map((acc: any) => (
                  <TableRow key={acc.id}>
                    <TableCell className="font-mono text-xs">#{acc.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <span>{getFlag(acc.country)}</span>
                        {acc.country || "—"}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{acc.phone ?? acc.phonePrefix ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{acc.dcId ?? "—"}</TableCell>
                    <TableCell>
                      {acc.isFree === "true" || acc.price === 0
                        ? <span className="text-green-500 text-xs">Бесплатно</span>
                        : <span className="flex items-center gap-1 text-sm">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            {acc.price}
                          </span>
                      }
                    </TableCell>
                    <TableCell>
                      <Badge variant={acc.status === "available" ? "default" : acc.status === "sold" ? "secondary" : "outline"}>
                        {STATUS_LABELS[acc.status] ?? acc.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {acc.createdAt ? format(new Date(acc.createdAt), "dd MMM yyyy", { locale: ru }) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(acc.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
