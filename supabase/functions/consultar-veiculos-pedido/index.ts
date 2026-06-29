import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function parseNumero(raw: string): number | null {
  const match = String(raw).match(/PED-\d{4}-(\d+)/i);
  const num = match ? parseInt(match[1], 10) : parseInt(String(raw), 10);
  return isNaN(num) ? null : num;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Auth: API key OU JWT de usuario interno
    const apiKey = req.headers.get("x-api-key");
    const expectedKey = Deno.env.get("RASTREADOR_API_KEY");
    const hasValidApiKey = expectedKey && apiKey === expectedKey;

    if (!hasValidApiKey) {
      // Tentar JWT
      const authHeader = req.headers.get("authorization") ?? "";
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) return json({ error: "Nao autorizado" }, 401);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const internalRoles = ["admin", "superadmin", "vendedor", "viewer", "sac", "suporte"];
      const isInternal = (roles ?? []).some((r: any) => internalRoles.includes(r.role));
      if (!isInternal) return json({ error: "Acesso restrito" }, 403);
    }

    const body = await req.json();
    const { pedido_numero } = body;

    if (!pedido_numero) {
      return json({ error: "pedido_numero e obrigatorio" }, 400);
    }

    const numero = parseNumero(String(pedido_numero));
    if (!numero) {
      return json({ error: "pedido_numero invalido" }, 400);
    }

    // Buscar pedido
    const { data: pedido, error: pedidoErr } = await supabase
      .from("pedidos")
      .select("id, numero, quantidade, pagamento_rastreador, status")
      .eq("numero", numero)
      .single();

    if (pedidoErr || !pedido) {
      return json({ error: "Pedido nao encontrado" }, 404);
    }

    // Buscar veiculos recebidos
    const { data: veiculos } = await supabase
      .from("veiculos_recebidos")
      .select("chassi, data_recebimento, status, asaas_payment_url, valor_cobranca")
      .eq("pedido_id", pedido.id)
      .order("created_at", { ascending: true });

    const lista = veiculos ?? [];
    const pagos = lista.filter((v: any) => v.status === "pago").length;
    const pendentes = lista.filter((v: any) => v.status === "cobranca_gerada").length;

    return json({
      pedido: {
        numero: pedido.numero,
        quantidade: pedido.quantidade,
        pagamento_rastreador: pedido.pagamento_rastreador,
        status: pedido.status,
      },
      veiculos: lista,
      resumo: {
        total: pedido.quantidade,
        recebidos: lista.length,
        pagos,
        pendentes,
        faltam_receber: pedido.quantidade - lista.length,
      },
    });
  } catch (err: any) {
    return json({ error: err.message || "Erro interno" }, 500);
  }
});
