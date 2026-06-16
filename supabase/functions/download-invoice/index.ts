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
    const month = body?.month;
    const subscriptionId = body?.subscription_id;

    if (typeof token !== "string" || !token) {
      return new Response(
        JSON.stringify({ error: "Missing auth token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (typeof month !== "string" || !/^\d{4}-\d{2}$/.test(month)) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid month (YYYY-MM)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const params = new URLSearchParams({ month });
    if (subscriptionId) params.set("subscription_id", String(subscriptionId));

    const url = `https://platform.factorytele.com/api/v1/pub/account/invoice?${params.toString()}`;

    const upstream = await fetch(url, {
      method: "GET",
      headers: {
        "X-Partner-Key": partnerKey,
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("download-invoice upstream:", upstream.status, "month:", month, "sub:", subscriptionId);

    const contentType = upstream.headers.get("content-type") || "";

    if (!upstream.ok) {
      const text = await upstream.text();
      let data: any;
      try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
      return new Response(
        JSON.stringify({ ok: false, status: upstream.status, data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (contentType.includes("application/pdf")) {
      const pdf = await upstream.arrayBuffer();
      return new Response(pdf, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="factura-${month}.pdf"`,
        },
      });
    }

    // Fallback: forward whatever upstream returned as JSON envelope.
    const text = await upstream.text();
    let data: any;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    return new Response(
      JSON.stringify({ ok: true, status: upstream.status, data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("download-invoice error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
