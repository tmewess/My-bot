import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, ShoppingCart, Settings, LogOut, ScrollText, Menu, X, Globe, Smartphone, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppLayoutProps {
  children: ReactNode;
  username?: string | null;
  onLogout?: () => void;
}

export function AppLayout({ children, username, onLogout }: AppLayoutProps) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { href: "/", label: "Главная", icon: LayoutDashboard },
    { href: "/accounts", label: "Аккаунты", icon: Users },
    { href: "/orders", label: "Заказы", icon: ShoppingCart },
    { href: "/users", label: "Пользователи", icon: Globe },
    { href: "/sessions", label: "Сессии", icon: Smartphone },
    { href: "/news", label: "Новости", icon: Newspaper },
    { href: "/settings", label: "Настройки", icon: Settings },
  ];

  const NavLinks = ({ onNav }: { onNav?: () => void }) => (
    <>
      {links.map((link) => {
        const Icon = link.icon;
        const active = location === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNav}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"}`}
          >
            <Icon className="w-4 h-4" />
            {link.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="flex min-h-screen w-full bg-background dark">
      {/* Desktop sidebar */}
      <aside className="w-64 border-r border-border bg-card flex-col hidden md:flex">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="h-8 w-8 rounded-md neon-logo" />
          <h1 className="text-xl font-bold font-mono tracking-tight text-primary">VoidAccount</h1>
          <p className="text-xs text-muted-foreground">Панель управления</p>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          <NavLinks />
        </nav>
        {username && (
          <div className="p-3 border-t border-border flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground font-mono truncate">@{username}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
              onClick={onLogout}
              title="Выйти"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card flex flex-col transition-transform duration-200 md:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold font-mono tracking-tight text-primary">VoidAccount</h1>
            <p className="text-xs text-muted-foreground">Панель управления</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          <NavLinks onNav={() => setMobileOpen(false)} />
        </nav>
        {username && (
          <div className="p-3 border-t border-border flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground font-mono truncate">@{username}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0" onClick={onLogout} title="Выйти">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 md:hidden">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold font-mono text-primary">VoidAccount</h1>
          {onLogout && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={onLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </header>
        <div className="flex-1 p-6 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
