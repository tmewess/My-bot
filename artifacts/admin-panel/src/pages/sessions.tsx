import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Smartphone, CheckCircle2, AlertCircle, RefreshCw, Upload } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface SessionRecord {
  id: number;
  phone: string;
  firstName: string | null;
  userId: string | null;
  status: string;
  createdAt: string;
  hasSession: boolean;
}

type AuthStep = "phone" | "code" | "password";

export default function Sessions() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTdataDialogOpen, setIsTdataDialogOpen] = useState(false);

  const [authStep, setAuthStep] = useState<AuthStep>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tdataFile, setTdataFile] = useState<File | null>(null);
  const [tdataPhone, setTdataPhone] = useState("");
  const [tdataCountry, setTdataCountry] = useState("");
  const [tdataLoading, setTdataLoading] = useState(false);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) setSessions(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSessions(); }, []);

  const resetDialog = () => {
    setAuthStep("phone");
    setPhone("");
    setCode("");
    setPassword("");
    setIsSubmitting(false);
  };

  const handleRequestCode = async () => {
    if (!phone.trim()) {
      toast({ title: "Ошибка", description: "Введите номер телефона", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/sessions/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setAuthStep("code");
        toast({ title: "Код отправлен", description: data.message });
      } else {
        toast({ title: "Ошибка", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Ошибка", description: "Нет подключения к API", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmCode = async (withPassword = false) => {
    if (!code.trim()) {
      toast({ title: "Ошибка", description: "Введите код из Telegram", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/sessions/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          code: code.trim(),
          ...(withPassword && password ? { password } : {}),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Готово", description: data.message });
        setIsDialogOpen(false);
        resetDialog();
        loadSessions();
      } else if (data.needsPassword) {
        setAuthStep("password");
        toast({ title: "Требуется 2FA", description: "Введите пароль двухфакторной аутентификации" });
      } else {
        toast({ title: "Ошибка", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Ошибка", description: "Нет подключения к API", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить эту сессию?")) return;
    const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSessions(prev => prev.filter(s => s.id !== id));
      toast({ title: "Удалено", description: "Сессия удалена" });
    }
  };

  const getStatusBadge = (s: SessionRecord) => {
    if (s.status === "active" && s.hasSession) {
      return <Badge className="bg-green-500/15 text-green-500 border-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1" />Активна</Badge>;
    }
    if (s.status === "pending") {
      return <Badge variant="outline" className="text-yellow-500 border-yellow-500/20"><AlertCircle className="w-3 h-3 mr-1" />Ожидание</Badge>;
    }
    return <Badge variant="outline" className="text-muted-foreground">Неактивна</Badge>;
  };

  const handleUploadTdata = async () => {
    if (!tdataFile) {
      toast({ title: "Ошибка", description: "Выберите ZIP-файл tdata", variant: "destructive" });
      return;
    }
    setTdataLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", tdataFile);
      if (tdataPhone) formData.append("phone", tdataPhone);
      if (tdataCountry) formData.append("country", tdataCountry);
      const res = await fetch("/api/sessions/tdata", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Успех", description: data.message });
        setIsTdataDialogOpen(false);
        setTdataFile(null);
        setTdataPhone("");
        setTdataCountry("");
        loadSessions();
      } else {
        toast({ title: "Ошибка", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Ошибка", description: "Нет подключения", variant: "destructive" });
    } finally {
      setTdataLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Сессии Telegram</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Авторизованные аккаунты для работы с API Telegram.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadSessions} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Обновить
          </Button>
          <Button variant="outline" onClick={() => { setIsTdataDialogOpen(true); }}>
            <Upload className="w-4 h-4 mr-2" />
            Загрузить tdata
          </Button>
          <Button onClick={() => { resetDialog(); setIsDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Добавить сессию
          </Button>
        </div>
      </div>

      {/* Info card */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="pt-4 pb-4">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Как это работает:</strong> добавьте Telegram-аккаунт через авторизацию (номер телефона → код).
            Сессия сохраняется на сервере и может использоваться для работы с аккаунтами.
            Для работы необходимо настроить <strong className="text-foreground">API ID</strong> и <strong className="text-foreground">API Hash</strong> в разделе{" "}
            <a href="/settings" className="text-primary underline">Настройки</a> (получить на{" "}
            <a href="https://my.telegram.org" target="_blank" rel="noreferrer" className="text-primary underline">my.telegram.org</a>).
          </p>
        </CardContent>
      </Card>

      {/* Sessions list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Активные сессии</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Smartphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Сессий нет. Добавьте первую.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sessions.map(s => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Smartphone className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-medium text-sm">{s.phone}</span>
                        {s.firstName && <span className="text-muted-foreground text-sm">{s.firstName}</span>}
                        {getStatusBadge(s)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {s.userId && `ID: ${s.userId} · `}
                        Добавлена {format(new Date(s.createdAt), "d MMM yyyy, HH:mm", { locale: ru })}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => handleDelete(s.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auth dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetDialog(); setIsDialogOpen(open); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              {authStep === "phone" && "Добавить сессию"}
              {authStep === "code" && "Введите код"}
              {authStep === "password" && "Двухфакторная защита"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {authStep === "phone" && (
              <>
                <p className="text-sm text-muted-foreground">
                  Введите номер телефона Telegram-аккаунта. Вам придёт код подтверждения.
                </p>
                <div className="space-y-1.5">
                  <Label>Номер телефона</Label>
                  <Input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+79991234567"
                    onKeyDown={e => e.key === "Enter" && handleRequestCode()}
                  />
                </div>
                <Button className="w-full" onClick={handleRequestCode} disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Отправка кода...</> : "Получить код"}
                </Button>
              </>
            )}

            {authStep === "code" && (
              <>
                <p className="text-sm text-muted-foreground">
                  Код отправлен в Telegram на номер <strong>{phone}</strong>.
                  Введите его ниже.
                </p>
                <div className="space-y-1.5">
                  <Label>Код из Telegram</Label>
                  <Input
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="12345"
                    maxLength={8}
                    onKeyDown={e => e.key === "Enter" && handleConfirmCode()}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setAuthStep("phone")} disabled={isSubmitting}>
                    Назад
                  </Button>
                  <Button className="flex-1" onClick={() => handleConfirmCode()} disabled={isSubmitting}>
                    {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Проверка...</> : "Подтвердить"}
                  </Button>
                </div>
              </>
            )}

            {authStep === "password" && (
              <>
                <p className="text-sm text-muted-foreground">
                  Аккаунт защищён двухфакторной аутентификацией. Введите пароль.
                </p>
                <div className="space-y-1.5">
                  <Label>Пароль 2FA</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Пароль"
                    onKeyDown={e => e.key === "Enter" && handleConfirmCode(true)}
                  />
                </div>
                <Button className="w-full" onClick={() => handleConfirmCode(true)} disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Проверка...</> : "Войти"}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* TData Upload Dialog */}
      <Dialog open={isTdataDialogOpen} onOpenChange={(open) => { setIsTdataDialogOpen(open); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Загрузить tdata
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Загрузите ZIP-архив с tdata-папкой. Сессия будет извлечена автоматически.
            </p>
            <div className="space-y-1.5">
              <Label>ZIP-файл tdata</Label>
              <Input type="file" accept=".zip" onChange={(e) => setTdataFile(e.target.files?.[0] || null)} />
            </div>
            <div className="space-y-1.5">
              <Label>Номер телефона (необязательно)</Label>
              <Input value={tdataPhone} onChange={e => setTdataPhone(e.target.value)} placeholder="+79991234567" />
            </div>
            <div className="space-y-1.5">
              <Label>Страна (необязательно)</Label>
              <Input value={tdataCountry} onChange={e => setTdataCountry(e.target.value)} placeholder="Россия" />
            </div>
            <Button className="w-full" onClick={handleUploadTdata} disabled={tdataLoading}>
              {tdataLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Загрузка...</> : "Создать сессию"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
