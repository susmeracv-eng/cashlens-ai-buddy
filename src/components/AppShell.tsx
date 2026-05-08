import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Plus, Camera, Sparkles, LogOut, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

const tabs = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/add", label: "Add", icon: Plus },
  { to: "/app/scan", label: "Scan", icon: Camera },
  { to: "/app/ask", label: "Ask AI", icon: Sparkles },
];

export function AppShell() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [user, loading, nav]);

  if (loading || !user) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-background bg-mesh">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/app" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-hero shadow-glow">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <div className="leading-tight">
              <div className="font-display text-xl">CashLens</div>
              <div className="-mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">AI · personal finance</div>
            </div>
          </Link>
          <nav className="hidden gap-1 md:flex">
            {tabs.map(t => {
              const active = loc.pathname === t.to || (t.to !== "/app" && loc.pathname.startsWith(t.to));
              return (
                <Link key={t.to} to={t.to} className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm transition ${active ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-muted"}`}>
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </Link>
              );
            })}
          </nav>
          <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-28">
        <Outlet />
      </main>

      {/* Mobile nav */}
      <nav className="fixed bottom-3 left-1/2 z-40 flex -translate-x-1/2 gap-1 rounded-full border border-border/60 bg-background/80 p-1 shadow-soft backdrop-blur-xl md:hidden">
        {tabs.map(t => {
          const active = loc.pathname === t.to || (t.to !== "/app" && loc.pathname.startsWith(t.to));
          return (
            <Link key={t.to} to={t.to} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs transition ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              <t.icon className="h-4 w-4" />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
