// Generates 3-5 insights and detects recurring expenses
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
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

    const since = new Date(Date.now() - 120 * 86400000).toISOString().slice(0, 10);
    const { data: tx } = await supabase.from("transactions").select("type,amount,category,merchant,occurred_on").gte("occurred_on", since).limit(1000);

    const tools = [{
      type: "function",
      function: {
        name: "report",
        parameters: {
          type: "object",
          properties: {
            insights: { type: "array", items: { type: "string" }, description: "3-5 short data-driven insights with concrete numbers" },
            recurring: { type: "array", items: {
              type: "object",
              properties: {
                merchant: { type: "string" },
                category: { type: "string" },
                amount: { type: "number" },
                cadence: { type: "string", enum: ["weekly","monthly","yearly"] },
              },
              required: ["merchant","amount","cadence"],
              additionalProperties: false,
            }},
          },
          required: ["insights","recurring"],
          additionalProperties: false,
        },
      },
    }];

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You analyze personal spending. Return concise insights (with $ amounts and % changes) and detect recurring charges (subscriptions/bills) by similar merchant + amount + cadence." },
          { role: "user", content: `Transactions:\n${(tx ?? []).map(t => `${t.occurred_on} ${t.type} $${t.amount} ${t.category} ${t.merchant ?? ""}`).join("\n")}` },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "report" } },
      }),
    });
    if (!resp.ok) {
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await resp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = call ? JSON.parse(call.function.arguments) : { insights: [], recurring: [] };
    return new Response(JSON.stringify(args), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
