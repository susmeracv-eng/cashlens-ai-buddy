import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Camera, Loader2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/app/scan")({
  component: ScanPage,
});

const CATEGORIES = ["Groceries","Dining","Transport","Shopping","Entertainment","Bills","Health","Travel","Subscriptions","Other"];

function ScanPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [category, setCategory] = useState("Other");
  const [note, setNote] = useState("");

  const onFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const parse = async () => {
    if (!file) return;
    setParsing(true);
    try {
      const b64: string = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res((r.result as string).split(",")[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke("parse-receipt", {
        body: { imageBase64: b64, mimeType: file.type },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setMerchant(data.merchant ?? "");
      setAmount(data.amount ? String(data.amount) : "");
      setDate(data.occurred_on || date);
      setCategory(data.category || "Other");
      setNote(data.note ?? "");
      toast.success("Parsed! Review and save.");
    } catch (e: any) {
      toast.error(e.message ?? "Parse failed");
    } finally { setParsing(false); }
  };

  const save = async () => {
    if (!user || !file) return;
    setSaving(true);
    try {
      const path = `${user.id}/${Date.now()}-${file.name.replace(/\s+/g,"_")}`;
      const { error: upErr } = await supabase.storage.from("receipts").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { error } = await supabase.from("transactions").insert({
        user_id: user.id, type: "expense",
        amount: Number(amount), category, merchant: merchant || null, note: note || null,
        occurred_on: date, receipt_url: path, source: "receipt",
      });
      if (error) throw error;
      toast.success("Receipt saved");
      nav({ to: "/app" });
    } catch (e: any) {
      toast.error(e.message ?? "Could not save");
    } finally { setSaving(false); }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl">Scan a receipt</h1>
      <p className="text-sm text-muted-foreground">Snap or upload — AI extracts the details.</p>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <Label htmlFor="rc" className="cursor-pointer">
            <div className="grid aspect-[3/4] place-items-center rounded-2xl border-2 border-dashed border-border bg-muted/40 text-center text-sm text-muted-foreground transition hover:bg-muted">
              {preview ? (
                <img src={preview} alt="receipt" className="h-full w-full rounded-2xl object-contain" />
              ) : (
                <div className="space-y-2">
                  <Camera className="mx-auto h-8 w-8" />
                  <div>Tap to take a photo or upload</div>
                </div>
              )}
            </div>
          </Label>
          <input id="rc" type="file" accept="image/*" capture="environment" className="hidden" onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
          <Button onClick={parse} disabled={!file || parsing} className="mt-3 w-full">
            {parsing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Reading…</> : <><Sparkles className="mr-2 h-4 w-4" />Parse with AI</>}
          </Button>
        </div>

        <div className="space-y-3 rounded-3xl border border-border bg-card p-5 shadow-soft">
          <div className="space-y-1.5">
            <Label>Merchant</Label>
            <Input value={merchant} onChange={e => setMerchant(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Input value={note} onChange={e => setNote(e.target.value)} />
          </div>
          <Button onClick={save} disabled={!file || !amount || saving} className="w-full">
            {saving ? "Saving…" : "Save expense"}
          </Button>
        </div>
      </div>
    </div>
  );
}
