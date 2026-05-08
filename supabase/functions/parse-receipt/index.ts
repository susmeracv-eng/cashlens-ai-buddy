// Parses a receipt image using Lovable AI vision and returns structured fields
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { imageBase64, mimeType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    const dataUrl = `data:${mimeType || "image/jpeg"};base64,${imageBase64}`;

    const tools = [{
      type: "function",
      function: {
        name: "save_receipt",
        description: "Save the parsed receipt fields",
        parameters: {
          type: "object",
          properties: {
            merchant: { type: "string", description: "Store/merchant name" },
            amount: { type: "number", description: "Total amount paid" },
            occurred_on: { type: "string", description: "Date in YYYY-MM-DD format" },
            category: {
              type: "string",
              enum: ["Groceries","Dining","Transport","Shopping","Entertainment","Bills","Health","Travel","Subscriptions","Other"],
            },
            note: { type: "string" },
          },
          required: ["merchant", "amount", "category"],
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
          { role: "system", content: "Extract receipt data accurately. Use today's date if not visible." },
          { role: "user", content: [
            { type: "text", text: "Parse this receipt and call save_receipt." },
            { type: "image_url", image_url: { url: dataUrl } },
          ]},
        ],
        tools,
        tool_choice: { type: "function", function: { name: "save_receipt" } },
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
