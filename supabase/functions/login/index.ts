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
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.password !== "string") {
      return new Response(
        JSON.stringify({ error: "Body must include password and email or phone" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const payload: Record<string, string> = { password: body.password };
    if (typeof body.email === "string" && body.email.length > 0) {
      payload.email = body.email.trim();
    } else if (typeof body.phone === "string" && body.phone.length > 0) {
      payload.phone = String(body.phone).trim();
    } else {
      return new Response(
        JSON.stringify({ error: "Body must include email or phone" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const upstream = await fetch(
      "https://platform.factorytele.com/api/v1/pub/auth/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Partner-Key": partnerKey,
        },
        body: JSON.stringify(payload),
      }
    );

    const text = await upstream.text();
    let data: unknown;
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
    console.error("login error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
