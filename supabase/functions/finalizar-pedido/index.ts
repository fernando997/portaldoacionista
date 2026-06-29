import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Autenticar via API key OU JWT
    const apiKey = req.headers.get("x-api-key");
    const expectedKey = Deno.env.get("RASTREADOR_API_KEY");

    if (apiKey) {
      if (!expectedKey || apiKey !== expectedKey) {
        return json({ error: "API key invalida" }, 401);
      }
    } else {
      const authHeader = req.headers.get("authorization") ?? "";
      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
      } = await supabase.auth.getUser(token);
      if (!user) return json({ error: "Nao autorizado" }, 401);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const internalRoles = [
        "admin",
        "superadmin",
        "vendedor",
        "viewer",
        "sac",
        "suporte",
      ];
      const isInternal = (roles ?? []).some((r: any) =>
        internalRoles.includes(r.role)
      );
      if (!isInternal) return json({ error: "Acesso restrito" }, 403);
    }

    const body = await req.json();
    const { numero } = body;

    if (!numero) {
      return json(
        { error: "Campo 'numero' e obrigatorio (ex: 90 ou PED-2026-0090)" },
        400
      );
    }

    // Extrair numero puro se vier no formato PED-YYYY-NNNN
    let numericoPedido: number;
    const match = String(numero).match(/PED-\d{4}-(\d+)/i);
    if (match) {
      numericoPedido = parseInt(match[1], 10);
    } else {
      numericoPedido = parseInt(String(numero), 10);
    }

    if (isNaN(numericoPedido)) {
      return json({ error: "Numero invalido" }, 400);
    }

    // Buscar pedido
    const { data: pedido, error: pedidoErr } = await supabase
      .from("pedidos")
      .select("id, numero, status")
      .eq("numero", numericoPedido)
      .maybeSingle();

    if (pedidoErr) throw pedidoErr;
    if (!pedido) return json({ error: "Pedido nao encontrado" }, 404);

    // Atualizar status para FINALIZADO
    const { error: updateErr } = await supabase
      .from("pedidos")
      .update({ status: "FINALIZADO" })
      .eq("id", (pedido as any).id);

    if (updateErr) throw updateErr;

    return json({
      success: true,
      pedido: {
        id: (pedido as any).id,
        numero: (pedido as any).numero,
        status_anterior: (pedido as any).status,
        status_novo: "FINALIZADO",
      },
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
