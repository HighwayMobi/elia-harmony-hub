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
    const type = String(body?.type || "mobile");
    const kind = body?.kind ? String(body.kind) : "";

    const url = new URL("https://platform.factorytele.com/api/v1/pub/catalog/plans");
    url.searchParams.set("type", type);
    if (kind) url.searchParams.set("kind", kind);

    const upstream = await fetch(url.toString(), {
      method: "GET",
      headers: { "X-Partner-Key": partnerKey },
    });

    const text = await upstream.text();
    console.log("get-catalog-plans upstream:", upstream.status, "type:", type, "kind:", kind, "body:", text?.slice(0, 800));

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
    console.error("get-catalog-plans error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
