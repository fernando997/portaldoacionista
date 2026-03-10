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
    const {
      api_key,
      email,
      password,
      name,
      group_name,
      id_grupo,
      id_locadora,
      id_pedido,
      participation_percent,
      total_motos,
      invested_value,
      status,
    } = body;

    // Auth via API key
    const validKey = Deno.env.get("ONBOARDING_API_KEY");
    if (!validKey || api_key !== validKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validações obrigatórias
    if (!email || !password || !name) {
      return new Response(
        JSON.stringify({ error: "email, password e name são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Criar usuário no Supabase Auth
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    // Atualizar perfil com dados do acionista
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        name,
        group_name: group_name || "Grupo Modo Corre",
        id_grupo: id_grupo || null,
        id_locadora: id_locadora || null,
        id_pedido: id_pedido || null,
        participation_percent: participation_percent ?? 0,
        total_motos: total_motos ?? 0,
        invested_value: invested_value ?? 0,
        status: status || "Ativo",
      })
      .eq("user_id", userId);

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Atribuir role 'user' (acionista)
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: "user" });

    if (roleError) {
      return new Response(JSON.stringify({ error: roleError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        shareholder: {
          user_id: userId,
          email,
          name,
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
