import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    // Valida JWT do usuário
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autorizado" }, 401);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) return json({ error: "Não autorizado" }, 401);

    const { locadora, startDate, finishDate, offset = 0, limit = 20 } = await req.json();

    if (!locadora || !startDate || !finishDate) {
      return json({ error: "locadora, startDate e finishDate são obrigatórios" }, 400);
    }

    // Verifica que o locadora pertence ao usuário autenticado
    const { data: profile } = await supabase
      .from("profiles")
      .select("id_locadora")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.id_locadora !== locadora) {
      return json({ error: "Acesso negado" }, 403);
    }

    // Busca o token Asaas via pool-locadora
    const locadoraRes = await fetch("https://modocorreapp.com.br/api/1.1/wf/pool-locadora", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locadora }),
    });

    if (!locadoraRes.ok) {
      return json({ error: "Erro ao buscar credenciais da locadora" }, 502);
    }

    const locadoraData = await locadoraRes.json();
    const asaasToken = locadoraData?.response?.token_asaas || locadoraData?.response?.token;

    if (!asaasToken) {
      return json({ error: "Token Asaas não encontrado para esta locadora" }, 502);
    }

    // Busca extrato no Asaas
    const params = new URLSearchParams({
      startDate,
      finishDate,
      offset: String(offset),
      limit: String(limit),
    });

    const asaasRes = await fetch(
      `https://api.asaas.com/v3/financialTransactions?${params}`,
      { headers: { "access_token": asaasToken } }
    );

    if (!asaasRes.ok) {
      const err = await asaasRes.text().catch(() => "");
      return json({ error: `Erro Asaas: ${asaasRes.status}`, detail: err }, 502);
    }

    const asaasData = await asaasRes.json();

    return json({
      data: asaasData.data ?? [],
      totalCount: asaasData.totalCount ?? 0,
      limit: asaasData.limit ?? limit,
      offset: asaasData.offset ?? offset,
      hasMore: asaasData.hasMore ?? false,
    });
  } catch (err: any) {
    return json({ error: err.message || "Erro interno" }, 500);
  }
});
