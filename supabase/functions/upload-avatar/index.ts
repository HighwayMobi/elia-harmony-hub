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

    const form = await req.formData();
    const token = form.get("token");
    const file = form.get("avatar");

    if (typeof token !== "string" || !token) {
      return new Response(
        JSON.stringify({ error: "Missing auth token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!(file instanceof File)) {
      return new Response(
        JSON.stringify({ error: "Missing avatar file" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const upstreamForm = new FormData();
    upstreamForm.append("avatar", file, file.name || "avatar.jpg");

    const upstream = await fetch(
      "https://platform.factorytele.com/api/v1/pub/line/avatar",
      {
        method: "POST",
        headers: {
          "X-Partner-Key": partnerKey,
          Authorization: `Bearer ${token}`,
        },
        body: upstreamForm,
      }
    );

    const text = await upstream.text();
    console.log("upload-avatar upstream:", upstream.status);

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
    console.error("upload-avatar error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
