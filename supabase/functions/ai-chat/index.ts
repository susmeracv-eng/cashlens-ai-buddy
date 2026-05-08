// Natural-language Q&A about user spending. Streams answer.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    // Pull last 90 days of transactions and profile
    const since = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    const [{ data: tx }, { data: profileArr }] = await Promise.all([
      supabase.from("transactions").select("type,amount,category,merchant,note,occurred_on").gte("occurred_on", since).order("occurred_on", { ascending: false }).limit(500),
      supabase.from("profiles").select("monthly_income,monthly_budget,currency").eq("user_id", user.id).limit(1),
    ]);
    const profile = profileArr?.[0] || {};

    const ctx = `User profile: ${JSON.stringify(profile)}.\nLast 90 days transactions (${tx?.length ?? 0}):\n${(tx ?? []).map(t => `${t.occurred_on} ${t.type} $${t.amount} ${t.category} ${t.merchant ?? ""} ${t.note ?? ""}`.trim()).join("\n")}`;

    const sys = `You are CashLens AI, a sharp, friendly personal finance analyst. Answer the user's questions about their spending using ONLY the provided data. Be concise, use bullets and bold totals. Currency: ${profile.currency || "USD"}.\n\n${ctx}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        messages: [{ role: "system", content: sys }, ...messages],
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await resp.text();
      console.error("ai err", resp.status, t);
      return new Response(JSON.stringify({ error: "AI error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(resp.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
