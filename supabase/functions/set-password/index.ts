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

    const body = await req.json().catch(() => null);
    const password = body?.password;
    const token = body?.token;
    if (typeof password !== "string" || password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (typeof token !== "string" || !token) {
      return new Response(
        JSON.stringify({ error: "Missing auth token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const upstream = await fetch(
      "https://platform.factorytele.com/api/v1/pub/account/password",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Partner-Key": partnerKey,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      }
    );

    const text = await upstream.text();
    const requestId = upstream.headers.get("x-request-id") ?? undefined;
    console.log("set-password upstream:", upstream.status, "req-id:", requestId, "body:", text);

    let data: any;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }
    if (!upstream.ok && (!data || Object.keys(data).length === 0)) {
      data = {
        message: `Upstream error ${upstream.status} (empty body). Request id: ${requestId ?? "n/a"}`,
        request_id: requestId,
      };
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
    console.error("set-password error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
