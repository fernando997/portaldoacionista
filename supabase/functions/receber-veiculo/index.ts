import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
};

const ASAAS_BASE = "https://api.asaas.com/v3";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function asaasGet(url: string, token: string) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", access_token: token },
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

async function asaasPost(url: string, token: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", access_token: token },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

function parseNumero(raw: string): number | null {
  const match = String(raw).match(/PED-\d{4}-(\d+)/i);
  const num = match ? parseInt(match[1], 10) : parseInt(String(raw), 10);
  return isNaN(num) ? null : num;
}

function formatDueDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // 1. Validate API key
    const apiKey = req.headers.get("x-api-key");
    const expectedKey = Deno.env.get("RASTREADOR_API_KEY");
    if (!expectedKey || apiKey !== expectedKey) {
      return json({ error: "API key invalida" }, 401);
    }

    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const body = await req.json();
    const { pedido_numero, chassi, data_recebimento } = body;

    // 2. Validate required fields
    if (!pedido_numero || !chassi) {
      return json({ error: "pedido_numero e chassi sao obrigatorios" }, 400);
    }

    // 3. Parse numero
    const numero = parseNumero(String(pedido_numero));
    if (!numero) {
      return json({ error: "pedido_numero invalido" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 4. Buscar pedido
    const { data: pedido, error: pedidoErr } = await supabase
      .from("pedidos")
      .select("id, investidor_id, quantidade, pagamento_rastreador")
      .eq("numero", numero)
      .single();

    if (pedidoErr || !pedido) {
      return json({ error: "Pedido nao encontrado" }, 404);
    }

    // 5. Idempotencia: verificar se chassi ja existe
    const { data: existing } = await supabase
      .from("veiculos_recebidos")
      .select("*")
      .eq("chassi", chassi)
      .maybeSingle();

    if (existing) {
      return json({
        ok: true,
        already_exists: true,
        data: {
          id: existing.id,
          chassi: existing.chassi,
          pedido_numero: numero,
          status: existing.status,
          cobranca: existing.asaas_payment_id
            ? {
                asaas_payment_id: existing.asaas_payment_id,
                asaas_payment_url: existing.asaas_payment_url,
                valor: existing.valor_cobranca,
              }
            : null,
        },
      });
    }

    // 6. Contar veiculos ja recebidos
    const { count } = await supabase
      .from("veiculos_recebidos")
      .select("id", { count: "exact", head: true })
      .eq("pedido_id", pedido.id);

    const recebidos = count ?? 0;
    if (recebidos >= pedido.quantidade) {
      return json({
        error: `Todos os ${pedido.quantidade} veiculos do pedido ja foram recebidos`,
      }, 400);
    }

    const veiculoIndex = recebidos + 1;
    const dataReceb = data_recebimento ? new Date(data_recebimento).toISOString() : new Date().toISOString();

    const isPix = pedido.pagamento_rastreador === "pix_recebimento";

    let veiculoRecord: any;
    let cobrancaInfo: any = null;

    if (isPix) {
      // ─── PIX: buscar investidor, criar customer Asaas, gerar cobranca ───
      const rawKey = Deno.env.get("ASAAS_API_KEY") || "";
      const ASAAS_API_KEY = rawKey.replace(/[\s\r\n]+/g, "").trim();
      if (!ASAAS_API_KEY) {
        return json({ error: "ASAAS_API_KEY nao configurada" }, 500);
      }

      // Buscar investidor
      const { data: investidor } = await supabase
        .from("investidores")
        .select("nome, cpf, email")
        .eq("id", pedido.investidor_id)
        .single();

      if (!investidor) {
        return json({ error: "Investidor nao encontrado" }, 404);
      }

      const cpfCnpj = (investidor.cpf || "").replace(/\D/g, "");

      // Buscar ou criar customer no Asaas
      let customerId: string;
      const searchRes = await asaasGet(
        `${ASAAS_BASE}/customers?cpfCnpj=${cpfCnpj}`,
        ASAAS_API_KEY
      );

      if (searchRes.ok && searchRes.data?.data?.length > 0) {
        customerId = searchRes.data.data[0].id;
      } else {
        // Criar customer
        const createRes = await asaasPost(`${ASAAS_BASE}/customers`, ASAAS_API_KEY, {
          name: investidor.nome || `Investidor ${cpfCnpj}`,
          cpfCnpj,
          email: investidor.email,
        });
        if (!createRes.ok) {
          console.error("Erro ao criar customer Asaas:", createRes.data);
          return json({
            error: "Falha ao criar customer no Asaas",
            asaas_error: createRes.data?.errors?.[0]?.description || JSON.stringify(createRes.data),
          }, 502);
        }
        customerId = createRes.data.id;
      }

      // Inserir veiculo_recebido primeiro (para ter o ID como externalReference)
      const { data: veiculo, error: insertErr } = await supabase
        .from("veiculos_recebidos")
        .insert({
          pedido_id: pedido.id,
          chassi,
          data_recebimento: dataReceb,
          status: "recebido", // sera atualizado apos criar cobranca
          asaas_customer_id: customerId,
        })
        .select()
        .single();

      if (insertErr) {
        return json({ error: "Erro ao registrar veiculo: " + insertErr.message }, 500);
      }

      // Criar cobranca PIX no Asaas
      const paymentRes = await asaasPost(`${ASAAS_BASE}/payments`, ASAAS_API_KEY, {
        customer: customerId,
        billingType: "PIX",
        value: 990,
        dueDate: formatDueDate(3),
        description: `Rastreador GPS - Chassi ${chassi} - Pedido #${numero}`,
        externalReference: veiculo.id,
      });

      if (!paymentRes.ok) {
        console.error("Erro ao criar cobranca Asaas:", paymentRes.data);
        // Veiculo ja registrado com status 'recebido' - nao falha, mas sinaliza
        veiculoRecord = veiculo;
        cobrancaInfo = {
          error: paymentRes.data?.errors?.[0]?.description || "Falha ao gerar cobranca",
        };
      } else {
        // Atualizar veiculo com dados da cobranca
        const { data: updated } = await supabase
          .from("veiculos_recebidos")
          .update({
            status: "cobranca_gerada",
            asaas_payment_id: paymentRes.data.id,
            asaas_payment_url: paymentRes.data.invoiceUrl,
            valor_cobranca: 990,
          })
          .eq("id", veiculo.id)
          .select()
          .single();

        veiculoRecord = updated;
        cobrancaInfo = {
          asaas_payment_id: paymentRes.data.id,
          asaas_payment_url: paymentRes.data.invoiceUrl,
          valor: 990,
        };
      }

      // Inserir pedido_rastreador_pagamentos
      await supabase.from("pedido_rastreador_pagamentos").insert({
        pedido_id: pedido.id,
        tipo: "pix_veiculo",
        valor: 990,
        status: "pendente",
        veiculo_index: veiculoIndex,
        veiculo_recebido_id: veiculoRecord.id,
      });
    } else {
      // ─── VOUCHER: registrar sem cobranca ───
      const { data: veiculo, error: insertErr } = await supabase
        .from("veiculos_recebidos")
        .insert({
          pedido_id: pedido.id,
          chassi,
          data_recebimento: dataReceb,
          status: "recebido",
        })
        .select()
        .single();

      if (insertErr) {
        return json({ error: "Erro ao registrar veiculo: " + insertErr.message }, 500);
      }

      veiculoRecord = veiculo;

      // Inserir pagamento como pago (voucher)
      await supabase.from("pedido_rastreador_pagamentos").insert({
        pedido_id: pedido.id,
        tipo: "voucher_comprovante",
        valor: 990,
        status: "pago",
        veiculo_index: veiculoIndex,
        veiculo_recebido_id: veiculo.id,
      });
    }

    // 10. Se todos veiculos recebidos, atualizar status do pedido
    if (veiculoIndex === pedido.quantidade) {
      await supabase
        .from("pedidos")
        .update({ status: "VEICULOS RECEBIDOS" })
        .eq("id", pedido.id);
    }

    return json({
      ok: true,
      already_exists: false,
      data: {
        id: veiculoRecord.id,
        chassi: veiculoRecord.chassi,
        pedido_numero: numero,
        veiculo_index: veiculoIndex,
        status: veiculoRecord.status,
        cobranca: cobrancaInfo,
      },
      veiculos_recebidos: veiculoIndex,
      veiculos_total: pedido.quantidade,
    });
  } catch (err: any) {
    console.error("receber-veiculo error:", err);
    return json({ error: err.message || "Erro interno" }, 500);
  }
});
