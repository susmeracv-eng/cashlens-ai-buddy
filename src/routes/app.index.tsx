import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, TrendingUp, ArrowDownRight, ArrowUpRight, Repeat, Pencil, Trash2 } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

type Tx = {
  id: string; type: "expense" | "income"; amount: number; category: string;
  merchant: string | null; note: string | null; occurred_on: string; receipt_url: string | null;
};

const COLORS = ["oklch(0.78 0.16 165)","oklch(0.65 0.18 250)","oklch(0.78 0.18 50)","oklch(0.7 0.2 320)","oklch(0.65 0.18 25)","oklch(0.6 0.15 200)","oklch(0.7 0.13 130)"];

function fmt(n: number) { return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }); }
function fmt2(n: number) { return n.toLocaleString(undefined, { style: "currency", currency: "USD" }); }

function Dashboard() {
  const { user } = useAuth();
  const [tx, setTx] = useState<Tx[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [insights, setInsights] = useState<{ insights: string[]; recurring: any[] } | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [income, setIncome] = useState("");
  const [budget, setBudget] = useState("");

  const load = async () => {
    if (!user) return;
    const [{ data: txs }, { data: prof }] = await Promise.all([
      supabase.from("transactions").select("*").order("occurred_on", { ascending: false }).limit(200),
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    setTx((txs as Tx[]) ?? []);
    setProfile(prof);
    setIncome(String(prof?.monthly_income ?? ""));
    setBudget(String(prof?.monthly_budget ?? ""));
  };
  useEffect(() => { load(); }, [user]);

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dayOfMonth = today.getDate();
  const daysLeft = Math.max(1, daysInMonth - dayOfMonth + 1);

  const monthTx = useMemo(() => tx.filter(t => new Date(t.occurred_on) >= monthStart), [tx]);
  const spentMonth = monthTx.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const incomeMonth = monthTx.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const budget0 = Number(profile?.monthly_budget ?? 0);
  const remaining = Math.max(0, budget0 - spentMonth);
  const safeToday = budget0 > 0 ? remaining / daysLeft : 0;

  const byCat = useMemo(() => {
    const map = new Map<string, number>();
    monthTx.filter(t => t.type === "expense").forEach(t => map.set(t.category, (map.get(t.category) ?? 0) + Number(t.amount)));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [monthTx]);

  const last14 = useMemo(() => {
    const out: { day: string; spend: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0,10);
      const spend = tx.filter(t => t.occurred_on === key && t.type === "expense").reduce((s,t) => s + Number(t.amount), 0);
      out.push({ day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), spend: Math.round(spend) });
    }
    return out;
  }, [tx]);

  const fetchInsights = async () => {
    setLoadingInsights(true);
    try {
      const { data, error } = await supabase.functions.invoke("insights");
      if (error) throw error;
      setInsights(data);
    } catch (e: any) {
      toast.error(e.message ?? "Could not load insights");
    } finally { setLoadingInsights(false); }
  };

  const saveProfile = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({
      monthly_income: Number(income) || 0,
      monthly_budget: Number(budget) || 0,
    }).eq("user_id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditingProfile(false);
    load();
  };

  const removeTx = async (id: string) => {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setTx(tx.filter(t => t.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Hero card */}
      <div className="overflow-hidden rounded-3xl bg-card-gradient p-6 text-white shadow-glow sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-white/70">Safe to spend today</div>
            <div className="mt-1 font-display text-5xl sm:text-6xl">{budget0 > 0 ? fmt2(safeToday) : "—"}</div>
            <div className="mt-1 text-sm text-white/80">{budget0 > 0 ? `${fmt(remaining)} left for ${daysLeft} days · ${today.toLocaleString(undefined,{ month:"long" })}` : "Set a monthly budget to see your safe-to-spend number."}</div>
          </div>
          <div className="flex gap-2">
            <Link to="/app/add"><Button variant="secondary" className="rounded-full bg-white/15 text-white hover:bg-white/25">Add expense</Button></Link>
            <Button variant="secondary" className="rounded-full bg-white/15 text-white hover:bg-white/25" onClick={() => setEditingProfile(v => !v)}>
              <Pencil className="h-4 w-4" /> Budget
            </Button>
          </div>
        </div>

        {editingProfile && (
          <div className="mt-5 grid gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur sm:grid-cols-3">
            <div>
              <Label className="text-white/80">Monthly income</Label>
              <Input value={income} onChange={e => setIncome(e.target.value)} type="number" className="mt-1 border-white/20 bg-white/10 text-white placeholder:text-white/50" />
            </div>
            <div>
              <Label className="text-white/80">Monthly budget</Label>
              <Input value={budget} onChange={e => setBudget(e.target.value)} type="number" className="mt-1 border-white/20 bg-white/10 text-white placeholder:text-white/50" />
            </div>
            <div className="flex items-end">
              <Button onClick={saveProfile} className="bg-accent text-accent-foreground hover:bg-accent/90">Save</Button>
            </div>
          </div>
        )}

        <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl bg-white/10 p-3 backdrop-blur">
            <div className="text-white/70">Spent this month</div>
            <div className="text-lg font-semibold">{fmt(spentMonth)}</div>
          </div>
          <div className="rounded-xl bg-white/10 p-3 backdrop-blur">
            <div className="text-white/70">Income</div>
            <div className="text-lg font-semibold">{fmt(incomeMonth)}</div>
          </div>
          <div className="rounded-xl bg-white/10 p-3 backdrop-blur">
            <div className="text-white/70">Budget</div>
            <div className="text-lg font-semibold">{budget0 > 0 ? fmt(budget0) : "—"}</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <div className="font-medium">By category · this month</div>
            <span className="text-xs text-muted-foreground">{byCat.length} categories</span>
          </div>
          {byCat.length === 0 ? (
            <div className="grid h-[220px] place-items-center text-sm text-muted-foreground">No expenses yet.</div>
          ) : (
            <div className="mt-2 grid items-center gap-4 sm:grid-cols-[180px_1fr]">
              <div className="h-[180px]">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={byCat} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={2}>
                      {byCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt2(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 text-sm">
                {byCat.slice(0, 6).map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{c.name}</div>
                    <div className="font-medium">{fmt2(c.value)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <div className="font-medium">Last 14 days</div>
          <div className="mt-2 h-[220px]">
            <ResponsiveContainer>
              <BarChart data={last14}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 240)" />
                <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: number) => fmt2(v)} />
                <Bar dataKey="spend" radius={[6,6,0,0]} fill="oklch(0.78 0.16 165)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium"><Sparkles className="h-4 w-4 text-accent" /> AI insights & recurring</div>
          <Button size="sm" variant="outline" onClick={fetchInsights} disabled={loadingInsights || tx.length === 0}>
            {loadingInsights ? "Analyzing…" : insights ? "Refresh" : "Generate"}
          </Button>
        </div>
        {!insights ? (
          <p className="mt-3 text-sm text-muted-foreground">{tx.length === 0 ? "Add a few transactions and CashLens will surface trends and recurring charges." : "Click Generate to analyze your spending."}</p>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium"><TrendingUp className="h-4 w-4 text-accent" /> Insights</div>
              <ul className="space-y-2 text-sm">
                {insights.insights.map((s, i) => <li key={i} className="rounded-xl bg-muted/60 px-3 py-2">{s}</li>)}
              </ul>
            </div>
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium"><Repeat className="h-4 w-4 text-accent" /> Recurring</div>
              {insights.recurring.length === 0 ? <p className="text-sm text-muted-foreground">No recurring charges detected yet.</p> : (
                <ul className="space-y-2 text-sm">
                  {insights.recurring.map((r, i) => (
                    <li key={i} className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2">
                      <div><div className="font-medium">{r.merchant}</div><div className="text-xs text-muted-foreground">{r.cadence} · {r.category ?? "—"}</div></div>
                      <div className="font-medium">{fmt2(Number(r.amount))}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Recent transactions */}
      <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <div className="font-medium">Recent transactions</div>
          <Link to="/app/add" className="text-sm text-primary hover:underline">+ Add</Link>
        </div>
        {tx.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nothing yet — log an expense or scan a receipt to begin.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {tx.slice(0, 12).map(t => (
              <li key={t.id} className="flex items-center gap-3 py-3">
                <div className={`grid h-9 w-9 place-items-center rounded-full ${t.type === "expense" ? "bg-destructive/10 text-destructive" : "bg-success/15 text-success-foreground"}`}>
                  {t.type === "expense" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate font-medium">{t.merchant || t.note || t.category}</div>
                    <div className={`font-semibold ${t.type === "expense" ? "" : "text-success-foreground"}`}>{t.type === "expense" ? "-" : "+"}{fmt2(Number(t.amount))}</div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div>{t.category} · {new Date(t.occurred_on).toLocaleDateString()}</div>
                    <button onClick={() => removeTx(t.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
