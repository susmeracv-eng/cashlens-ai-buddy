import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

export const Route = createFileRoute("/app/ask")({
  component: AskPage,
});

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "How much did I spend on dining this month?",
  "What are my biggest expense categories?",
  "Where can I cut $100 next month?",
  "Did I overspend last week?",
];

function AskPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("chat_messages").select("role,content").order("created_at", { ascending: true }).limit(100)
      .then(({ data }) => setMessages((data as Msg[]) ?? []));
  }, [user]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  const ask = async (text: string) => {
    if (!text.trim() || !user || busy) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages([...next, { role: "assistant", content: "" }]);
    setBusy(true);

    await supabase.from("chat_messages").insert({ user_id: user.id, role: "user", content: text });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ messages: next.map(m => ({ role: m.role, content: m.content })) }),
      });
      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast.error("Rate limited — try again shortly.");
        else if (resp.status === 402) toast.error("AI credits exhausted.");
        else toast.error("AI error");
        setMessages(next);
        return;
      }
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = "", full = "";
      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += dec.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx); buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") { done = true; break; }
          try {
            const p = JSON.parse(j);
            const c = p.choices?.[0]?.delta?.content;
            if (c) {
              full += c;
              setMessages(m => { const cp = [...m]; cp[cp.length - 1] = { role: "assistant", content: full }; return cp; });
            }
          } catch { buf = line + "\n" + buf; break; }
        }
      }
      if (full) await supabase.from("chat_messages").insert({ user_id: user.id, role: "assistant", content: full });
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <div className="mb-3 flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent/15 text-accent"><Sparkles className="h-4 w-4" /></div>
        <div>
          <div className="font-display text-2xl">Ask CashLens</div>
          <div className="text-xs text-muted-foreground">Natural-language answers about your spending</div>
        </div>
      </div>

      <div className="flex-1 space-y-3 rounded-3xl border border-border bg-card p-4 shadow-soft sm:p-6">
        {messages.length === 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => ask(s)} className="rounded-2xl border border-border bg-muted/40 p-3 text-left text-sm transition hover:border-accent hover:bg-muted">
                {s}
              </button>
            ))}
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "rounded-tr-sm bg-primary text-primary-foreground" : "rounded-tl-sm bg-muted"}`}>
                {m.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-strong:text-foreground">
                    <ReactMarkdown>{m.content || (busy ? "…" : "")}</ReactMarkdown>
                  </div>
                ) : m.content}
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={e => { e.preventDefault(); ask(input); }} className="sticky bottom-20 mt-3 flex gap-2 md:bottom-3">
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask anything about your spending…" disabled={busy} className="rounded-full" />
        <Button type="submit" disabled={busy || !input.trim()} className="rounded-full"><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}
