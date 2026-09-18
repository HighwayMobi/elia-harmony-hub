const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Safe health-check: calls a public FactoryTele endpoint with the partner key
// and returns ONLY the upstream status. The key value is never returned/logged.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const partnerKey = Deno.env.get("FACTORYTELE_PARTNER_KEY");
    if (!partnerKey) {
      return json({ configured: false, ok: false, status: null, message: "Key is not configured" });
    }

    const url = new URL("https://platform.factorytele.com/api/v1/pub/catalog/plans");
    url.searchParams.set("type", "mobile");

    const started = Date.now();
    const upstream = await fetch(url.toString(), {
      method: "GET",
      headers: { "X-Partner-Key": partnerKey },
    });
    // Drain body without exposing it
    await upstream.text().catch(() => "");

    console.log("partner-key-check upstream status:", upstream.status);

    return json({
      configured: true,
      key_length: partnerKey.length,
      ok: upstream.ok,
      status: upstream.status,
      latency_ms: Date.now() - started,
      endpoint: "/api/v1/pub/catalog/plans",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("partner-key-check error:", message);
    return json({ configured: true, ok: false, status: null, message }, 200);
  }
});
