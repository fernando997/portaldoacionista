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

const ZAPSIGN_TOKEN = "38ecec59-f52b-4e65-b0be-6f26eded39dde02494d7-d710-4b4b-ab43-70caf22d6e0c";

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

    const { token } = await req.json();
    if (!token) return json({ error: "token é obrigatório" }, 400);

    const res = await fetch(`https://api.zapsign.com.br/api/v1/docs/${token}/`, {
      headers: { "Authorization": `Bearer ${ZAPSIGN_TOKEN}` },
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      return json({ error: `Erro ZapSign: ${res.status}`, detail: err }, 502);
    }

    const data = await res.json();
    return json(data);
  } catch (err: any) {
    return json({ error: err.message || "Erro interno" }, 500);
  }
});
