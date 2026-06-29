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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Validate API key
    const apiKey = req.headers.get("x-api-key");
    const expectedKey = Deno.env.get("RASTREADOR_API_KEY");
    if (!expectedKey || apiKey !== expectedKey) {
      return json({ error: "API key invalida" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Parse multipart form data
    const formData = await req.formData();
    const pedidoNumero = formData.get("pedido_numero") as string | null;
    const veiculoIndexStr = formData.get("veiculo_index") as string | null;
    const comprovante = formData.get("comprovante") as File | null;

    if (!pedidoNumero || !veiculoIndexStr || !comprovante) {
      return json({ error: "pedido_numero, veiculo_index e comprovante sao obrigatorios" }, 400);
    }

    const veiculoIndex = parseInt(veiculoIndexStr, 10);
    if (isNaN(veiculoIndex) || veiculoIndex < 1) {
      return json({ error: "veiculo_index deve ser um numero >= 1" }, 400);
    }

    // Find pedido by numero (accept "PED-2026-0001" or just "1")
    const cleanNumero = pedidoNumero.replace(/^PED-\d{4}-0*/i, "");
    const numero = parseInt(cleanNumero, 10) || parseInt(pedidoNumero, 10);

    if (isNaN(numero)) {
      return json({ error: "pedido_numero invalido" }, 400);
    }

    const { data: pedido, error: pedidoErr } = await supabase
      .from("pedidos")
      .select("id, investidor_id, quantidade")
      .eq("numero", numero)
      .single();

    if (pedidoErr || !pedido) {
      return json({ error: "Pedido nao encontrado" }, 404);
    }

    if (veiculoIndex > pedido.quantidade) {
      return json({
        error: `veiculo_index (${veiculoIndex}) excede quantidade do pedido (${pedido.quantidade})`,
      }, 400);
    }

    // Upload file to storage
    const ext = comprovante.name.split(".").pop() ?? "bin";
    const timestamp = Date.now();
    const path = `${pedido.investidor_id}/rastreador/${pedido.id}/pix_${veiculoIndex}_${timestamp}.${ext}`;

    const arrayBuffer = await comprovante.arrayBuffer();
    const { error: uploadErr } = await supabase.storage
      .from("investidor-docs")
      .upload(path, arrayBuffer, {
        contentType: comprovante.type || "application/octet-stream",
      });

    if (uploadErr) {
      return json({ error: "Erro no upload: " + uploadErr.message }, 500);
    }

    const { data: { publicUrl } } = supabase.storage
      .from("investidor-docs")
      .getPublicUrl(path);

    // Check if there's already a record for this veiculo_index
    const { data: existing } = await supabase
      .from("pedido_rastreador_pagamentos")
      .select("id")
      .eq("pedido_id", pedido.id)
      .eq("tipo", "pix_veiculo")
      .eq("veiculo_index", veiculoIndex)
      .maybeSingle();

    let record;
    if (existing) {
      // Update existing record
      const { data, error } = await supabase
        .from("pedido_rastreador_pagamentos")
        .update({
          comprovante_url: publicUrl,
          status: "pendente",
        })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);
      record = data;
    } else {
      // Insert new record
      const { data, error } = await supabase
        .from("pedido_rastreador_pagamentos")
        .insert({
          pedido_id: pedido.id,
          tipo: "pix_veiculo",
          valor: 990,
          status: "pendente",
          comprovante_url: publicUrl,
          veiculo_index: veiculoIndex,
        })
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);
      record = data;
    }

    return json({ ok: true, data: record });
  } catch (err: any) {
    return json({ error: err.message || "Erro interno" }, 500);
  }
});
