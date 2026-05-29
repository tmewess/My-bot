import { Link, useLocation } from "wouter";
import { useEffect } from "react";
import WebApp from "@twa-dev/sdk";
import { isTelegramWebApp } from "@/lib/telegram";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  useEffect(() => {
    if (isTelegramWebApp()) {
      WebApp.ready();
      WebApp.expand();
    }
  }, []);

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-background text-foreground pb-[70px]">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 gap-3">
          <img src="/logo.png" alt="VoidAccount" className="h-10 w-10 rounded-md neon-logo" />
          <span className="font-semibold tracking-tight text-lg">VoidAccount</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur h-[60px] pb-safe">
        <div className="flex h-full w-full items-center justify-around px-1">
          <Link href="/" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${location === "/" ? "text-primary" : "text-muted-foreground"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/></svg>
            <span className="text-[10px] font-medium">Каталог</span>
          </Link>
          <Link href="/orders" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${location === "/orders" ? "text-primary" : "text-muted-foreground"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
            <span className="text-[10px] font-medium">Заказы</span>
          </Link>
          <Link href="/news" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${location === "/news" ? "text-primary" : "text-muted-foreground"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>
            <span className="text-[10px] font-medium">Новости</span>
          </Link>
          <Link href="/profile" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${location === "/profile" ? "text-primary" : "text-muted-foreground"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span className="text-[10px] font-medium">Профиль</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
