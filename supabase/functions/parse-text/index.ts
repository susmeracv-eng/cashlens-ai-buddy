// Parses a natural-language transaction description into structured fields
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { text } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    const today = new Date().toISOString().slice(0, 10);

    const tools = [{
      type: "function",
      function: {
        name: "save_transaction",
        description: "Save the parsed transaction fields",
        parameters: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["expense", "income"] },
            merchant: { type: "string", description: "Store/merchant/payer name if mentioned" },
            amount: { type: "number", description: "Amount as a positive number" },
            occurred_on: { type: "string", description: "Date in YYYY-MM-DD format. Default to today if not specified." },
            category: {
              type: "string",
              enum: ["Groceries","Dining","Transport","Shopping","Entertainment","Bills","Health","Travel","Subscriptions","Income","Other"],
            },
            note: { type: "string" },
          },
          required: ["type", "amount", "category", "occurred_on"],
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
          { role: "system", content: `Extract a single transaction from the user's natural-language description. Today is ${today}. If the user says "yesterday", "last Friday", etc, resolve to a real date. Choose the best category. Use type=income for salary/refunds/payments received; otherwise expense.` },
          { role: "user", content: String(text || "") },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "save_transaction" } },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await resp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = call ? JSON.parse(call.function.arguments) : {};
    return new Response(JSON.stringify(args), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
