import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Wallet, Sparkles, Camera, MessageSquare, TrendingUp, Repeat, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CashLens AI — Effortless budget tracking" },
      { name: "description", content: "Snap receipts, log expenses, and ask AI about your spending. Get a daily safe-to-spend number." },
      { property: "og:title", content: "CashLens AI" },
      { property: "og:description", content: "AI-powered personal finance for busy adults." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-hero shadow-glow">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-xl">CashLens</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/login"><Button variant="ghost">Sign in</Button></Link>
          <Link to="/login"><Button>Get started</Button></Link>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh" />
        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-12 lg:pt-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> AI-native personal finance
          </div>
          <h1 className="mt-5 max-w-3xl font-display text-5xl leading-[1.05] sm:text-6xl lg:text-7xl">
            Understand your money<br /><span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">without the bookkeeping.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            CashLens reads your receipts, learns your habits, and answers questions in plain English. So you always know what's safe to spend today.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/login"><Button size="lg" className="rounded-full px-6">Start free <ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
            <a href="#features"><Button size="lg" variant="outline" className="rounded-full px-6">See features</Button></a>
          </div>

          <div className="mt-14 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <div className="overflow-hidden rounded-3xl border border-border bg-card-gradient p-8 text-white shadow-glow">
              <div className="text-xs uppercase tracking-widest opacity-70">Safe to spend today</div>
              <div className="mt-2 font-display text-6xl">$84.20</div>
              <div className="mt-1 text-sm opacity-80">Based on your monthly budget, recurring bills, and what you've already spent.</div>
              <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
                {[["Groceries","$312"],["Dining","$184"],["Transport","$72"]].map(([k,v]) => (
                  <div key={k} className="rounded-xl bg-white/10 p-3 backdrop-blur">
                    <div className="opacity-70">{k}</div>
                    <div className="text-lg font-semibold">{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <div className="flex items-center gap-2 text-sm font-medium"><MessageSquare className="h-4 w-4 text-accent" /> Ask CashLens</div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-2xl rounded-tr-sm bg-muted px-4 py-2">How much did I spend on coffee this month?</div>
                <div className="rounded-2xl rounded-tl-sm bg-primary px-4 py-2 text-primary-foreground">You've spent <b>$47.30</b> on coffee across 9 visits — 23% more than last month. Skipping 2 visits/week saves ~$40.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-display text-4xl">Everything you need, nothing you don't.</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Camera, title: "Snap a receipt", desc: "Photograph any receipt. AI extracts merchant, amount, date, and category." },
            { icon: MessageSquare, title: "Ask anything", desc: "Natural-language Q&A across all your transactions." },
            { icon: TrendingUp, title: "Live insights", desc: "Spot trends, overspending, and category drift before it hurts." },
            { icon: Repeat, title: "Recurring detection", desc: "Subscriptions and bills surfaced automatically." },
            { icon: Sparkles, title: "Safe to spend", desc: "Daily number that respects upcoming bills and your budget." },
            { icon: Wallet, title: "Private by design", desc: "Your data stays yours. Bank-level encryption." },
          ].map(f => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6 shadow-soft transition hover:shadow-glow">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent">
                <f.icon className="h-5 w-5" />
              </div>
              <div className="mt-3 text-lg font-semibold">{f.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-sm text-muted-foreground">
          <div>© {new Date().getFullYear()} CashLens AI</div>
          <Link to="/login" className="hover:text-foreground">Sign in →</Link>
        </div>
      </footer>
    </div>
  );
}
