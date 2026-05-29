import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import { useAuth } from "@/hooks/use-auth";

import Dashboard from "@/pages/dashboard";
import Accounts from "@/pages/accounts";
import Orders from "@/pages/orders";
import Logs from "@/pages/logs";
import Settings from "@/pages/settings";
import Users from "@/pages/users";
import Sessions from "@/pages/sessions";
import News from "@/pages/news";

const queryClient = new QueryClient();

function Router() {
  const { authenticated, login, logout, username } = useAuth();

  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-background dark flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Загрузка...</div>
      </div>
    );
  }

  if (!authenticated) {
    return <Login onLogin={login} />;
  }

  return (
    <AppLayout username={username} onLogout={logout}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/accounts" component={Accounts} />
        <Route path="/orders" component={Orders} />
        <Route path="/logs" component={Logs} />
        <Route path="/users" component={Users} />
        <Route path="/settings" component={Settings} />
        <Route path="/sessions" component={Sessions} />
        <Route path="/news" component={News} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
