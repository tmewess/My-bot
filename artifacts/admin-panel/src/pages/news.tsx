import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface NewsItem {
  id: number;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function NewsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isActive, setIsActive] = useState(true);

  const fetchNews = () => {
    setIsLoading(true);
    fetch("/api/news")
      .then((r) => r.json())
      .then((data) => {
        setItems(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setIsActive(true);
    setShowForm(false);
    setEditing(null);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast({ title: "Ошибка", description: "Заполните заголовок и текст", variant: "destructive" });
      return;
    }
    try {
      const url = editing ? `/api/news/${editing.id}` : "/api/news";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, isActive }),
      });
      if (res.ok) {
        toast({ title: "Успех", description: editing ? "Новость обновлена" : "Новость создана" });
        resetForm();
        fetchNews();
      } else {
        const data = await res.json();
        toast({ title: "Ошибка", description: data.error ?? "Не удалось сохранить", variant: "destructive" });
      }
    } catch {
      toast({ title: "Ошибка", description: "Нет подключения", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить новость?")) return;
    try {
      const res = await fetch(`/api/news/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Удалено" });
        fetchNews();
      } else {
        toast({ title: "Ошибка", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Ошибка", description: "Нет подключения", variant: "destructive" });
    }
  };

  const handleEdit = (item: NewsItem) => {
    setEditing(item);
    setTitle(item.title);
    setContent(item.content);
    setIsActive(item.isActive);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Новости</h1>
          <p className="text-sm text-muted-foreground">Управление новостями для WebApp и бота.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-1" />
          {showForm ? "Отмена" : "Добавить"}
        </Button>
      </div>

      {showForm && (
        <Card className="p-4 border-border/40">
          <div className="space-y-3">
            <Input placeholder="Заголовок" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea placeholder="Текст новости" rows={4} value={content} onChange={(e) => setContent(e.target.value)} />
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-primary" />
              <label htmlFor="isActive" className="text-sm">Активна</label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave}>{editing ? "Сохранить" : "Создать"}</Button>
              <Button variant="outline" onClick={resetForm}>Отмена</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Загрузка...</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">Новостей пока нет.</div>
        ) : (
          items.map((item) => (
            <Card key={item.id} className="p-4 border-border/40 bg-card/80">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{item.title}</h3>
                    {item.isActive ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{item.content}</p>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(item.createdAt), "d MMM yyyy HH:mm", { locale: ru })}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>Редактировать</Button>
                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
