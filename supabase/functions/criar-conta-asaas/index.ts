import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_BASE = "https://api.asaas.com/v3";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function asaasPost(url: string, token: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      access_token: token,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const { onboarding_request_id, retry_bubble } = await req.json();
    if (!onboarding_request_id) {
      return jsonResponse({ error: "onboarding_request_id is required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ─── Retry Bubble only ────────────────────────────────────────────────────
    if (retry_bubble) {
      const { data: onb } = await supabase
        .from("onboarding_requests")
        .select("*")
        .eq("id", onboarding_request_id)
        .maybeSingle();
      if (!onb) return jsonResponse({ error: "Onboarding not found" }, 404);

      const { data: creds } = await supabase
        .from("asaas_credentials")
        .select("asaas_api_key")
        .eq("onboarding_request_id", onboarding_request_id)
        .maybeSingle();
      if (!creds?.asaas_api_key) return jsonResponse({ error: "Token Asaas nao encontrado. Crie a conta primeiro." }, 400);

      let locBubbleId: string | null = null;
      let frotBubbleId: string | null = null;
      if (onb.investidor_id) {
        const { data: inv } = await supabase.from("investidores").select("locadora_bubble_id").eq("id", onb.investidor_id).maybeSingle();
        locBubbleId = inv?.locadora_bubble_id ?? null;
        const { data: ped } = await supabase.from("pedidos").select("frota_bubble_id").eq("investidor_id", onb.investidor_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
        frotBubbleId = ped?.frota_bubble_id ?? null;
      }
      if (!locBubbleId || !frotBubbleId) {
        return jsonResponse({ error: `Dados faltando: locadora_bubble_id=${locBubbleId}, frota_bubble_id=${frotBubbleId}` }, 400);
      }

      const cnpj = (onb.cnpj || "").replace(/\D/g, "");
      const params = new URLSearchParams({
        locadora: locBubbleId,
        bairro: onb.bairro || "",
        cep: (onb.cep || "").replace(/\D/g, ""),
        cidade: onb.cidade || "",
        cnpj,
        email: onb.email_corporativo || "",
        logradouro: onb.rua || "",
        Frota: frotBubbleId,
        nome: onb.razao_social || "",
        token: creds.asaas_api_key,
        apikey: "sderfgy65434567uyt432wsdtyu90lkjfe32",
      });

      const bubRes = await fetch(
        "https://modocorreapp.com.br/version-test/api/1.1/wf/pedido-at-locadora-pf-pj",
        { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params.toString() }
      );

      if (bubRes.ok) {
        // Remover erro de Bubble do asaas_config
        const cfg = onb.asaas_config ?? {};
        const filteredErrors = (cfg.errors || []).filter((e: string) => !e.startsWith("Bubble:"));
        await supabase.from("onboarding_requests").update({ asaas_config: { ...cfg, bubbleRegistered: true, errors: filteredErrors } }).eq("id", onboarding_request_id);
        return jsonResponse({ success: true, message: "Registro no Bubble reenviado com sucesso!" });
      } else {
        const txt = await bubRes.text();
        return jsonResponse({ error: `Bubble: HTTP ${bubRes.status} — ${txt}` }, 400);
      }
    }

    // ─── Full flow ────────────────────────────────────────────────────────────
    const rawKey = Deno.env.get("ASAAS_API_KEY") || "";
    const ASAAS_API_KEY = rawKey.replace(/[\s\r\n]+/g, "").trim();
    console.log("ASAAS_API_KEY length:", rawKey.length, "->", ASAAS_API_KEY.length, "has whitespace:", rawKey !== ASAAS_API_KEY);
    if (!ASAAS_API_KEY) {
      return jsonResponse({ error: "ASAAS_API_KEY not configured" }, 500);
    }

    // Load onboarding data
    const { data: onboarding, error: fetchErr } = await supabase
      .from("onboarding_requests")
      .select("*")
      .eq("id", onboarding_request_id)
      .maybeSingle();

    if (fetchErr || !onboarding) {
      return jsonResponse({ error: "Onboarding not found" }, 404);
    }

    const asaasConfig = onboarding.asaas_config ?? {};
    const cnpjDigits = (onboarding.cnpj || "").replace(/\D/g, "");
    const errors: string[] = [];

    // Buscar locadora_bubble_id do investidor
    let locadoraBubbleId: string | null = null;
    if (onboarding.investidor_id) {
      const { data: investidor } = await supabase
        .from("investidores")
        .select("locadora_bubble_id")
        .eq("id", onboarding.investidor_id)
        .maybeSingle();
      locadoraBubbleId = investidor?.locadora_bubble_id ?? null;
    }

    // Buscar frota_bubble_id do pedido mais recente
    let frotaBubbleId: string | null = null;
    if (onboarding.investidor_id) {
      const { data: pedido } = await supabase
        .from("pedidos")
        .select("frota_bubble_id")
        .eq("investidor_id", onboarding.investidor_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      frotaBubbleId = pedido?.frota_bubble_id ?? null;
    }

    // ─── Call 1: Criar sub-conta ──────────────────────────────────────────────

    const accountBody: Record<string, unknown> = {
      name: onboarding.cliente || `Empresa ${cnpjDigits}`,
      email: onboarding.email_corporativo || `${cnpjDigits}@modocorreinvest.com.br`,
      cpfCnpj: cnpjDigits,
      birthDate: "1990-05-15",
      companyType: "LIMITED",
      incomeValue: 10000,
      address: onboarding.rua || "Rua Exemplo",
      addressNumber: onboarding.numero || "100",
      province: onboarding.bairro || "Centro",
      postalCode: (onboarding.cep || "").replace(/\D/g, ""),
      city: onboarding.cidade || "Sao Paulo",
      state: onboarding.estado || "SP",
    };

    const accountRes = await asaasPost(
      `${ASAAS_BASE}/accounts`,
      ASAAS_API_KEY,
      accountBody
    );

    console.log("Call 1 - Criar sub-conta:", JSON.stringify({ ok: accountRes.ok, status: accountRes.status, data: accountRes.data }));

    if (!accountRes.ok) {
      const msg = accountRes.data?.errors?.[0]?.description || accountRes.data?.message || JSON.stringify(accountRes.data);
      return jsonResponse({
        error: `Falha ao criar sub-conta Asaas: ${msg}`,
        asaasResponse: accountRes.data,
      }, 400);
    }

    const subAccountApiKey = accountRes.data.apiKey;
    const subAccountId = accountRes.data.id;

    // Save credentials (service_role only table)
    await supabase.from("asaas_credentials").upsert({
      onboarding_request_id,
      asaas_account_id: subAccountId,
      asaas_api_key: subAccountApiKey,
    }, { onConflict: "onboarding_request_id" });

    // ─── Call 2: PIX (se pixAuto) ────────────────────────────────────────────

    const pixCreated = false;
    // PIX desabilitado temporariamente
    // if (asaasConfig.pixAuto) {
    //   const pixRes = await asaasPost(
    //     `${ASAAS_BASE}/pix/addressKeys`,
    //     subAccountApiKey,
    //     { type: "EVP" }
    //   );
    //   if (pixRes.ok) {
    //     pixCreated = true;
    //   } else {
    //     errors.push(`PIX: ${pixRes.data?.errors?.[0]?.description || JSON.stringify(pixRes.data)}`);
    //   }
    // }

    // ─── Call 3-5: Webhooks ──────────────────────────────────────────────────

    const webhooksCreated: string[] = [];

    const webhookConfigs = [
      {
        enabled: asaasConfig.webhookVencido,
        name: "MODO CORRE PRODUCAO VENCIDO",
        url: "https://devmodocorre.bubbleapps.io/api/1.1/wf/clientes_criticos_asaas",
        email: "fernandovinicius344@gmail.com",
        events: ["PAYMENT_OVERDUE"],
      },
      {
        enabled: asaasConfig.webhookTransferencia,
        name: "MODO CORRE PRODUCAO PAGAMENTO REALIZADO",
        url: "https://devmodocorre.bubbleapps.io/api/1.1/wf/asaas_transf_conc",
        email: "fernandovinicius344@gmail.com",
        events: ["TRANSFER_DONE"],
      },
      {
        enabled: asaasConfig.webhookPagamento,
        name: "MODO CORRE PRODUCAO RECEBIMENTO",
        url: "https://modocorreapp.com.br/api/1.1/wf/asaas_recebimento",
        email: "webhook@modocorre.com.br",
        events: ["PAYMENT_RECEIVED"],
      },
    ];

    for (const wh of webhookConfigs) {
      if (!wh.enabled) continue;
      const whRes = await asaasPost(
        `${ASAAS_BASE}/webhooks`,
        subAccountApiKey,
        {
          name: wh.name,
          url: wh.url,
          email: wh.email,
          apiVersion: 3,
          enabled: true,
          interrupted: false,
          authToken: "123",
          sendType: "SEQUENTIALLY",
          events: wh.events,
        }
      );
      if (whRes.ok) {
        webhooksCreated.push(...wh.events);
      } else {
        errors.push(`Webhook ${wh.events[0]}: ${whRes.data?.errors?.[0]?.description || JSON.stringify(whRes.data)}`);
      }
    }

    // ─── Call 6: Registrar no Bubble ──────────────────────────────────────────

    let bubbleRegistered = false;
    if (!locadoraBubbleId || !frotaBubbleId) {
      errors.push(
        `Bubble: dados faltando (locadora_bubble_id=${locadoraBubbleId}, frota_bubble_id=${frotaBubbleId})`
      );
    } else {
      try {
        const bubbleParams = new URLSearchParams({
          locadora: locadoraBubbleId,
          bairro: onboarding.bairro || "",
          cep: (onboarding.cep || "").replace(/\D/g, ""),
          cidade: onboarding.cidade || "",
          cnpj: cnpjDigits,
          email: onboarding.email_corporativo || "",
          logradouro: onboarding.rua || "",
          Frota: frotaBubbleId,
          nome: onboarding.razao_social || "",
          token: subAccountApiKey,
          apikey: "sderfgy65434567uyt432wsdtyu90lkjfe32",
        });

        const bubbleRes = await fetch(
          "https://modocorreapp.com.br/version-test/api/1.1/wf/pedido-at-locadora-pf-pj",
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: bubbleParams.toString(),
          }
        );

        if (bubbleRes.ok) {
          bubbleRegistered = true;
        } else {
          const bubbleText = await bubbleRes.text();
          errors.push(`Bubble: HTTP ${bubbleRes.status} — ${bubbleText}`);
        }
      } catch (bubbleErr) {
        errors.push(`Bubble: ${bubbleErr.message}`);
      }
    }

    // ─── Update asaas_config with results ────────────────────────────────────

    const updatedConfig = {
      ...asaasConfig,
      accountCreated: true,
      accountId: subAccountId,
      pixCreated,
      webhooksCreated,
      bubbleRegistered,
      errors,
      createdAt: new Date().toISOString(),
    };

    await supabase
      .from("onboarding_requests")
      .update({ asaas_config: updatedConfig })
      .eq("id", onboarding_request_id);

    return jsonResponse({
      success: true,
      accountId: subAccountId,
      pixCreated,
      webhooksCreated,
      errors,
    });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
});
