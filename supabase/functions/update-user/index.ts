import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const json = (data: unknown) =>
  new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Não autorizado' })

    const { data: { user: caller } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!caller) return json({ error: 'Não autorizado' })

    const { data: callerRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)

    if (!callerRoles?.some((r: any) => r.role === 'admin')) {
      return json({ error: 'Acesso negado' })
    }

    const {
      user_id, name, email, password, group_name,
      id_grupo, id_locadora, id_pedido, status,
      participation_percent, total_motos, invested_value
    } = await req.json()

    if (!user_id) return json({ error: 'user_id é obrigatório' })

    // Update auth user if email or password changed
    const authUpdates: Record<string, string> = {}
    if (email) authUpdates.email = email
    if (password) authUpdates.password = password

    if (Object.keys(authUpdates).length > 0) {
      const { error: authError } = await supabase.auth.admin.updateUserById(user_id, authUpdates)
      if (authError) return json({ error: authError.message })
    }

    // Update profile
    const profileUpdates: Record<string, unknown> = {}
    if (name !== undefined) profileUpdates.name = name
    if (email !== undefined) profileUpdates.email = email
    if (group_name !== undefined) profileUpdates.group_name = group_name
    if (id_grupo !== undefined) profileUpdates.id_grupo = id_grupo
    if (id_locadora !== undefined) profileUpdates.id_locadora = id_locadora
    if (id_pedido !== undefined) profileUpdates.id_pedido = id_pedido
    if (status !== undefined) profileUpdates.status = status
    if (participation_percent !== undefined) profileUpdates.participation_percent = participation_percent
    if (total_motos !== undefined) profileUpdates.total_motos = total_motos
    if (invested_value !== undefined) profileUpdates.invested_value = invested_value

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('user_id', user_id)

      if (profileError) return json({ error: profileError.message })
    }

    return json({ success: true })
  } catch (err: any) {
    return json({ error: err?.message || 'Erro interno' })
  }
})
