import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    const body = await req.json();
    const { numero } = body;

    if (!numero) {
      return json({ error: "Campo 'numero' e obrigatorio (ex: 90 ou PED-2026-0090)" }, 400);
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

    // 1. Buscar pedido
    const { data: pedido, error: pedidoErr } = await supabase
      .from("pedidos")
      .select("*")
      .eq("numero", numericoPedido)
      .maybeSingle();

    if (pedidoErr) throw pedidoErr;
    if (!pedido) return json({ error: "Pedido nao encontrado" }, 404);

    // 2. Buscar investidor
    const { data: investidor } = await supabase
      .from("investidores")
      .select("id, nome, cpf, email, whatsapp, profile_id")
      .eq("id", (pedido as any).investidor_id)
      .maybeSingle();

    // 3. Buscar rastreador pagamentos
    const { data: rastreadores } = await supabase
      .from("pedido_rastreador_pagamentos")
      .select("*")
      .eq("pedido_id", (pedido as any).id)
      .order("veiculo_index", { ascending: true });

    const rastreadoresList = (rastreadores ?? []) as any[];
    const totalRastreador = rastreadoresList.reduce(
      (s: number, r: any) => s + Number(r.valor),
      0
    );
    const totalPago = rastreadoresList
      .filter((r: any) => r.status === "pago")
      .reduce((s: number, r: any) => s + Number(r.valor), 0);
    const totalPendente = totalRastreador - totalPago;

    // 4. Buscar onboarding (se novo investidor)
    let onboarding = null;
    if ((pedido as any).tipo_investidor === "novo") {
      const year = new Date((pedido as any).created_at).getFullYear();
      const pedidoNum = `PED-${year}-${String((pedido as any).numero).padStart(4, "0")}`;
      const { data: onb } = await supabase
        .from("onboarding_requests")
        .select(
          "id, status, cnpj, certificado_digital_url, cnh_url, procuracao_url, assinatura_url, senha_certificado, created_at, completed_at"
        )
        .eq("pedido_id", pedidoNum)
        .maybeSingle();
      if (onb) {
        const items = [
          { campo: "cnpj", preenchido: !!(onb as any).cnpj },
          {
            campo: "certificado_digital",
            preenchido: !!(onb as any).certificado_digital_url,
          },
          {
            campo: "senha_certificado",
            preenchido: !!(onb as any).senha_certificado,
          },
          { campo: "cnh", preenchido: !!(onb as any).cnh_url },
          { campo: "procuracao", preenchido: !!(onb as any).procuracao_url },
          { campo: "assinatura", preenchido: !!(onb as any).assinatura_url },
        ];
        const preenchidos = items.filter((i) => i.preenchido).length;
        onboarding = {
          id: (onb as any).id,
          status: (onb as any).status,
          progresso: `${preenchidos}/${items.length}`,
          completo: preenchidos === items.length,
          itens: items,
          cnpj: (onb as any).cnpj,
          certificado_digital_url: (onb as any).certificado_digital_url,
          cnh_url: (onb as any).cnh_url,
          procuracao_url: (onb as any).procuracao_url,
          assinatura_url: (onb as any).assinatura_url,
          created_at: (onb as any).created_at,
          completed_at: (onb as any).completed_at,
        };
      }
    }

    // 5. Buscar nome do criador
    let criado_por = null;
    if ((pedido as any).created_by) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("user_id", (pedido as any).created_by)
        .maybeSingle();
      criado_por = (profile as any)?.name ?? null;
    }

    // Montar resposta
    const p = pedido as any;
    const year = new Date(p.created_at).getFullYear();
    const pedidoNumFormatado = `PED-${year}-${String(p.numero).padStart(4, "0")}`;

    return json({
      success: true,
      pedido: {
        id: p.id,
        numero: p.numero,
        numero_formatado: pedidoNumFormatado,
        status: p.status,
        tipo_investidor: p.tipo_investidor,
        created_at: p.created_at,
        criado_por,
        investidor: investidor
          ? {
              id: (investidor as any).id,
              nome: (investidor as any).nome,
              cpf: (investidor as any).cpf,
              email: (investidor as any).email,
              whatsapp: (investidor as any).whatsapp,
              vinculado_profile: !!(investidor as any).profile_id,
            }
          : null,
        veiculo: {
          fornecedor: p.fornecedor_nome,
          modelo: p.modelo,
          quantidade: p.quantidade,
          frota: p.frota_nome,
        },
        pagamento: {
          forma: p.pagamento_rastreador,
          forma_label:
            p.pagamento_rastreador === "voucher"
              ? "Voucher a vista"
              : p.pagamento_rastreador === "pix_recebimento"
              ? "PIX por recebimento"
              : null,
          total: totalRastreador,
          pago: totalPago,
          pendente: totalPendente,
          quitado: totalPendente <= 0 && totalRastreador > 0,
        },
        rastreadores: rastreadoresList.map((r: any) => ({
          id: r.id,
          tipo: r.tipo,
          valor: Number(r.valor),
          status: r.status,
          veiculo_index: r.veiculo_index,
          comprovante_url: r.comprovante_url,
          observacao: r.observacao,
        })),
        onboarding,
        observacao: p.observacao,
      },
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
