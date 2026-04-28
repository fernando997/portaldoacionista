const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userName, userEmail, locadoraName, idLocadora, question } =
      await req.json();

    if (!userName || !question) {
      return new Response(
        JSON.stringify({ error: "userName e question são obrigatórios" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY não configurada" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const emailHtml = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
  <div style="background: linear-gradient(135deg, #1a3a2a, #2d6a4f); padding: 28px 32px; border-radius: 12px 12px 0 0;">
    <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">Novo Ticket de SAC</h1>
    <p style="margin: 6px 0 0; color: #a8d5b5; font-size: 14px;">Portal do Acionista — Modo Corre Invest</p>
  </div>

  <div style="background: #f9fafb; padding: 28px 32px; border: 1px solid #e5e7eb; border-top: none;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; width: 40%;">
          <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Cliente</span>
        </td>
        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
          <span style="font-size: 14px; color: #111827; font-weight: 500;">${userName}</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
          <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">E-mail</span>
        </td>
        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
          <span style="font-size: 14px; color: #111827;">${userEmail || "Não informado"}</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
          <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Locadora</span>
        </td>
        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
          <span style="font-size: 14px; color: #111827; font-weight: 600;">${locadoraName || "Não identificada"}</span>
          ${idLocadora ? `<span style="font-size: 12px; color: #6b7280; margin-left: 8px;">(ID: ${idLocadora})</span>` : ""}
        </td>
      </tr>
    </table>

    <div style="margin-top: 24px;">
      <p style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; margin-bottom: 10px;">Dúvida / Mensagem</p>
      <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
        <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.6; white-space: pre-wrap;">${question}</p>
      </div>
    </div>
  </div>

  <div style="background: #f3f4f6; padding: 16px 32px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
      Ticket enviado automaticamente pelo Portal do Acionista
    </p>
  </div>
</div>
    `.trim();

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "SAC Portal do Acionista <noreply@modocorreinvest.com.br>",
        to: ["suporte@modocorreinvest.com.br"],
        reply_to: userEmail || undefined,
        subject: `[SAC] ${userName} — ${locadoraName || "Locadora não identificada"}`,
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(
        JSON.stringify({ error: `Erro ao enviar email: ${errText}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
