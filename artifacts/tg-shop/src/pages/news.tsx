import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Newspaper } from "lucide-react";

interface NewsItem {
  id: number;
  title: string;
  content: string;
  createdAt: string;
}

export default function News() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((data) => {
        setNews(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  return (
    <Layout>
      <div className="p-4 space-y-4 pb-20">
        <div className="space-y-0.5">
          <h1 className="text-lg font-semibold tracking-tight">Новости</h1>
          <p className="text-xs text-muted-foreground">Актуальная информация и обновления.</p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))
          ) : news.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              <Newspaper className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Новостей пока нет.</p>
            </div>
          ) : (
            news.map((item) => (
              <Card key={item.id} className="p-4 border-border/40 bg-card/80">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{item.title}</h3>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(item.createdAt), "d MMM yyyy", { locale: ru })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.content}</p>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
