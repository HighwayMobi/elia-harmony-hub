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
    if (typeof token !== "string" || !token) {
      return new Response(
        JSON.stringify({ error: "Missing auth token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build update payload with only allowed fields
    const updateBody: Record<string, any> = {};
    if (typeof body.language === "string") updateBody.language = body.language;
    if (typeof body.phone === "string") updateBody.phone = body.phone;

    const upstream = await fetch(
      "https://platform.factorytele.com/api/v1/pub/account/profile",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Partner-Key": partnerKey,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateBody),
      }
    );

    const text = await upstream.text();
    const requestId = upstream.headers.get("x-request-id") ?? undefined;
    console.log("update-profile upstream:", upstream.status, "req-id:", requestId, "body:", text.slice(0, 500));

    let data: any;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    return new Response(
      JSON.stringify({ ok: upstream.ok, status: upstream.status, data }),
      {
        status: upstream.ok ? 200 : upstream.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("update-profile error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
