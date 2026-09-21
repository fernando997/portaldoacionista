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

    // Valida JWT do usuário (pode vir no header x-user-token ou Authorization)
    const userToken =
      req.headers.get("x-user-token") ||
      req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!userToken) return json({ error: "Não autorizado" }, 401);

    const { data: { user }, error: authError } = await supabase.auth.getUser(userToken);
    if (authError || !user) return json({ error: "Não autorizado" }, 401);

    const { locadora, startDate, finishDate, offset = 0, limit = 20, order = "desc" } = await req.json();

    if (!locadora || !startDate || !finishDate) {
      return json({ error: "locadora, startDate e finishDate são obrigatórios" }, 400);
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
    const asaasToken = locadoraData?.response?.locadora_tck;

    if (!asaasToken) {
      return json({ error: "Token Asaas não encontrado para esta locadora" }, 502);
    }

    // Busca extrato no Asaas (max 100 por request da API)
    const ASAAS_MAX = 100;
    const sortOrder = order === "asc" ? "asc" : "desc";
    const allItems: unknown[] = [];
    let totalCount = 0;
    let currentOffset = offset;
    const remaining = limit;

    while (allItems.length < remaining) {
      const batchLimit = Math.min(ASAAS_MAX, remaining - allItems.length);
      const params = new URLSearchParams({
        startDate,
        finishDate,
        offset: String(currentOffset),
        limit: String(batchLimit),
        order: sortOrder,
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
      totalCount = asaasData.totalCount ?? 0;
      const items = asaasData.data ?? [];
      allItems.push(...items);

      if (!asaasData.hasMore || items.length === 0) break;
      currentOffset += items.length;
    }

    return json({
      data: allItems,
      totalCount,
      limit,
      offset,
      hasMore: offset + allItems.length < totalCount,
    });
  } catch (err: any) {
    return json({ error: err.message || "Erro interno" }, 500);
  }
});
