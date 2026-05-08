import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/app/add")({
  component: AddPage,
});

const CATEGORIES = ["Groceries","Dining","Transport","Shopping","Entertainment","Bills","Health","Travel","Subscriptions","Income","Other"];

function AddPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Other");
  const [merchant, setMerchant] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      type, amount: Number(amount), category,
      merchant: merchant || null, note: note || null, occurred_on: date,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    nav({ to: "/app" });
  };

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-3xl">Log a transaction</h1>
      <p className="text-sm text-muted-foreground">Quick entry — under 10 seconds.</p>

      <form onSubmit={submit} className="mt-6 space-y-4 rounded-3xl border border-border bg-card p-6 shadow-soft">
        <div className="flex gap-2">
          <button type="button" onClick={() => { setType("expense"); if (category === "Income") setCategory("Other"); }} className={`flex-1 rounded-xl border px-3 py-2 text-sm transition ${type === "expense" ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>Expense</button>
          <button type="button" onClick={() => { setType("income"); setCategory("Income"); }} className={`flex-1 rounded-xl border px-3 py-2 text-sm transition ${type === "income" ? "border-accent bg-accent text-accent-foreground" : "border-border"}`}>Income</button>
        </div>

        <div className="space-y-1.5">
          <Label>Amount</Label>
          <Input type="number" inputMode="decimal" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="0.00" className="text-2xl font-semibold" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Merchant <span className="text-muted-foreground">(optional)</span></Label>
          <Input value={merchant} onChange={e => setMerchant(e.target.value)} placeholder="Trader Joe's" />
        </div>
        <div className="space-y-1.5">
          <Label>Note <span className="text-muted-foreground">(optional)</span></Label>
          <Textarea value={note} onChange={e => setNote(e.target.value)} rows={2} />
        </div>

        <Button type="submit" disabled={busy} className="w-full">{busy ? "Saving…" : "Save"}</Button>
      </form>
    </div>
  );
}
