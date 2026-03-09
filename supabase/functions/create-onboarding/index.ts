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

    // Simple API key check — use the ONBOARDING_API_KEY secret
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

    // Create onboarding request using service role (bypasses RLS)
    const { data, error } = await supabase
      .from("onboarding_requests")
      .insert({
        pedido_id: pedido_id.trim(),
        // Use a system UUID for API-created requests
        created_by: "00000000-0000-0000-0000-000000000000",
      })
      .select("id, pedido_id, token, status, created_at")
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = Deno.env.get("ONBOARDING_BASE_URL") || "https://poolmodocorre.lovable.app";
    const link = `${baseUrl}/onboarding?token=${data.token}`;

    return new Response(
      JSON.stringify({
        success: true,
        onboarding: {
          id: data.id,
          pedido_id: data.pedido_id,
          status: data.status,
          created_at: data.created_at,
          link,
        },
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
