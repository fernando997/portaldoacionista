const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CPANEL_URL = "https://srv242.prodns.com.br:2083/execute/Email/add_pop";
const CPANEL_AUTH = "cpanel modocorre:OQ92O099MYFMO71UUC6ZMMU7I26FM6GY";
const DOMAIN = "modocorreinvest.com.br";
const DEFAULT_PASSWORD = "Modo@corre1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { cnpj } = await req.json();

    if (!cnpj || typeof cnpj !== "string") {
      return new Response(JSON.stringify({ error: "cnpj is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use CNPJ digits as email username, or raw string if not a valid CNPJ
    const cnpjDigits = cnpj.replace(/\D/g, "");
    const emailUser = cnpjDigits.length === 14 ? cnpjDigits : cnpj.replace(/[^a-zA-Z0-9._-]/g, "").toLowerCase();

    if (!emailUser) {
      return new Response(JSON.stringify({ error: "CNPJ/username inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const fullEmail = `${emailUser}@${DOMAIN}`;

    const formData = new URLSearchParams();
    formData.append("email", emailUser);
    formData.append("domain", DOMAIN);
    formData.append("password", DEFAULT_PASSWORD);

    const cpanelRes = await fetch(CPANEL_URL, {
      method: "POST",
      headers: {
        Authorization: CPANEL_AUTH,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const cpanelData = await cpanelRes.json();

    if (!cpanelRes.ok || (cpanelData.errors && cpanelData.errors.length > 0)) {
      const errorMsg = cpanelData.errors?.[0] || `cPanel HTTP ${cpanelRes.status}`;
      return new Response(
        JSON.stringify({ error: errorMsg, email: fullEmail }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, email: fullEmail }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
