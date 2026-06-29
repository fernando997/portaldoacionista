import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Webhook Asaas: SEMPRE retornar 200 (senao ele retenta)
  try {
    if (req.method !== "POST") {
      return new Response("OK", { status: 200 });
    }

    const body = await req.json();
    const event = body?.event;
    const payment = body?.payment;

    // Aceitar apenas eventos de pagamento confirmado
    if (!event || !["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"].includes(event)) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!payment?.id) {
      return new Response(JSON.stringify({ ok: true, ignored: true, reason: "no payment id" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Buscar veiculo pelo asaas_payment_id
    const { data: veiculo } = await supabase
      .from("veiculos_recebidos")
      .select("id, status")
      .eq("asaas_payment_id", payment.id)
      .maybeSingle();

    if (!veiculo) {
      console.log(`webhook-asaas-rastreador: veiculo nao encontrado para payment ${payment.id}`);
      return new Response(JSON.stringify({ ok: true, not_found: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Idempotente: se ja pago, nao faz nada
    if (veiculo.status === "pago") {
      return new Response(JSON.stringify({ ok: true, already_paid: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Atualizar veiculo para pago
    await supabase
      .from("veiculos_recebidos")
      .update({ status: "pago" })
      .eq("id", veiculo.id);

    // Atualizar pedido_rastreador_pagamentos para pago
    await supabase
      .from("pedido_rastreador_pagamentos")
      .update({ status: "pago" })
      .eq("veiculo_recebido_id", veiculo.id);

    console.log(`webhook-asaas-rastreador: veiculo ${veiculo.id} marcado como pago (event: ${event})`);

    return new Response(JSON.stringify({ ok: true, updated: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    // SEMPRE retornar 200 para o Asaas nao retentar
    console.error("webhook-asaas-rastreador error:", err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});
