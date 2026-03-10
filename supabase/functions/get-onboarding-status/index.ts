import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { pedido_id, api_key } = body;

    const validKey = Deno.env.get("ONBOARDING_API_KEY");
    if (!validKey || api_key !== validKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!pedido_id || typeof pedido_id !== "string" || pedido_id.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "pedido_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await supabase
      .from("onboarding_requests")
      .select("id, pedido_id, status, created_at, completed_at, cnpj, certificado_digital_url, cnh_url, procuracao_url")
      .eq("pedido_id", pedido_id.trim())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return new Response(JSON.stringify({ error: "Onboarding not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const documentos = {
      cnpj: data.cnpj ?? null,
      certificado_digital: data.certificado_digital_url ?? null,
      cnh: data.cnh_url ?? null,
      procuracao: data.procuracao_url ?? null,
    };

    const pendentes = Object.entries(documentos)
      .filter(([, v]) => !v)
      .map(([k]) => k);

    return new Response(
      JSON.stringify({
        success: true,
        onboarding: {
          id: data.id,
          pedido_id: data.pedido_id,
          status: data.status,
          created_at: data.created_at,
          completed_at: data.completed_at ?? null,
          documentos,
          pendentes,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
