import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-user-token",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const userToken =
      req.headers.get("x-user-token") ||
      req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!userToken) return json({ error: "Não autorizado" }, 401);

    const { data: { user }, error: authError } = await supabase.auth.getUser(userToken);
    if (authError || !user) return json({ error: "Não autorizado" }, 401);

    const { locadora } = await req.json();
    if (!locadora) return json({ error: "locadora é obrigatório" }, 400);

    const { data: profile } = await supabase
      .from("profiles")
      .select("id_locadora")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.id_locadora !== locadora) {
      return json({ error: "Acesso negado" }, 403);
    }

    const res = await fetch("https://modocorreapp.com.br/api/1.1/wf/pool_contratos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locadora }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      return json({ error: `Erro ao buscar contratos: ${res.status}`, detail: err }, 502);
    }

    const data = await res.json();
    return json({ data: data?.response ?? data });
  } catch (err: any) {
    return json({ error: err.message || "Erro interno" }, 500);
  }
});
