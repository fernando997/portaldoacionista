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

      // Verificar se e usuario interno
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
    const { locadora_bubble_id } = body;

    if (!locadora_bubble_id) {
      return json(
        { error: "Campo 'locadora_bubble_id' e obrigatorio" },
        400
      );
    }

    // Buscar arquivos pela locadora_bubble_id
    const { data: arquivos, error: arqErr } = await supabase
      .from("investidor_arquivos")
      .select("id, investidor_id, tipo, nome, file_url, locadora_bubble_id, created_at")
      .eq("locadora_bubble_id", locadora_bubble_id)
      .order("created_at", { ascending: false });

    if (arqErr) throw arqErr;

    // Buscar nome do investidor (do primeiro arquivo, se houver)
    let investidor_nome: string | null = null;
    if (arquivos && arquivos.length > 0) {
      const { data: inv } = await supabase
        .from("investidores")
        .select("nome")
        .eq("id", (arquivos[0] as any).investidor_id)
        .maybeSingle();
      investidor_nome = (inv as any)?.nome ?? null;
    }

    const tipoLabels: Record<string, string> = {
      rg_cnh: "RG / CNH",
      comprovante_residencia: "Comprovante de Residencia",
      precontrato: "Pre Contrato",
      contrato: "Contrato",
      cnpj: "CNPJ",
      certificado_digital: "Certificado Digital",
      cnh: "CNH",
      procuracao: "Procuracao",
      outro: "Outro",
    };

    return json({
      success: true,
      locadora_bubble_id,
      investidor_nome,
      total: (arquivos ?? []).length,
      arquivos: (arquivos ?? []).map((a: any) => ({
        id: a.id,
        tipo: a.tipo,
        tipo_label: tipoLabels[a.tipo] ?? a.tipo,
        nome: a.nome,
        file_url: a.file_url,
        created_at: a.created_at,
      })),
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
