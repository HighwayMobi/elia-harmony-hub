const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const UPSTREAM_BASE = "https://platform.factorytele.com/api/v1/pub/billing/payment-methods";

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
    const action = body?.action || "list";
    const pmId = body?.pm_id;
    const lineId = body?.line_id ?? body?.id;

    if (typeof token !== "string" || !token) {
      return new Response(
        JSON.stringify({ error: "Missing auth token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!lineId) {
      return new Response(
        JSON.stringify({ error: "Missing line_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const qs = `?line_id=${encodeURIComponent(String(lineId))}`;
    let url = `${UPSTREAM_BASE}${qs}`;
    let method: "GET" | "DELETE" = "GET";
    if (action === "delete") {
      if (!pmId) {
        return new Response(
          JSON.stringify({ error: "Missing pm_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      url = `${UPSTREAM_BASE}/${encodeURIComponent(String(pmId))}${qs}`;
      method = "DELETE";
    }

    const upstream = await fetch(url, {
      method,
      headers: {
        "X-Partner-Key": partnerKey,
        Authorization: `Bearer ${token}`,
      },
    });

    const text = await upstream.text();
    console.log("billing-payment-methods:", action, "line_id:", lineId, "status:", upstream.status, "body:", text?.slice(0, 300));

    let data: any;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    return new Response(
      JSON.stringify({ ok: upstream.ok, status: upstream.status, data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("billing-payment-methods error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
