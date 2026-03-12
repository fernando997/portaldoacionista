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

    // Busca token Asaas via Bubble
    const locadoraRes = await fetch("https://modocorreapp.com.br/api/1.1/wf/pool-locadora", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locadora }),
    });

    if (!locadoraRes.ok) return json({ error: "Erro ao buscar credenciais da locadora" }, 502);

    const locadoraData = await locadoraRes.json();
    const asaasToken = locadoraData?.response?.locadora_tck;
    if (!asaasToken) return json({ error: "Token Asaas não encontrado" }, 502);

    // Busca dados da conta Asaas
    const accountRes = await fetch("https://api.asaas.com/v3/myAccount", {
      headers: { "access_token": asaasToken },
    });

    if (!accountRes.ok) {
      const err = await accountRes.text().catch(() => "");
      return json({ error: `Erro Asaas: ${accountRes.status}`, detail: err }, 502);
    }

    const accountData = await accountRes.json();
    return json({ data: accountData });
  } catch (err: any) {
    return json({ error: err.message || "Erro interno" }, 500);
  }
});
