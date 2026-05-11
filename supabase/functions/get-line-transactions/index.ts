const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const partnerKey = Deno.env.get("FACTORYTELE_PARTNER_KEY");
    if (!partnerKey) {
      return new Response(
        JSON.stringify({ error: "FACTORYTELE_PARTNER_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const token = body?.token;
    const lineId = body?.line_id ?? body?.id;
    const month = body?.month;
    if (typeof token !== "string" || !token) {
      return new Response(
        JSON.stringify({ error: "Missing auth token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!lineId) {
      return new Response(
        JSON.stringify({ error: "Missing line id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (typeof month !== "string" || !/^\d{4}-\d{2}$/.test(month)) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid month (YYYY-MM)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = `https://platform.factorytele.com/api/v1/account/lines/${encodeURIComponent(
      String(lineId)
    )}/transactions?month=${encodeURIComponent(month)}`;

    const upstream = await fetch(url, {
      method: "GET",
      headers: {
        "X-Partner-Key": partnerKey,
        Authorization: `Bearer ${token}`,
      },
    });

    const text = await upstream.text();
    console.log("get-line-transactions upstream:", upstream.status, "id:", lineId, "month:", month, "body:", text?.slice(0, 2000));

    let data: any;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    return new Response(
      JSON.stringify({ ok: upstream.ok, status: upstream.status, data }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("get-line-transactions error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
