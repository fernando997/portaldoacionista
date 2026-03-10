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

    const { email, password, name, group_name, id_grupo, id_locadora, id_pedido, role } = await req.json()

    if (!email || !password || !name) {
      return json({ error: 'Email, senha e nome são obrigatórios' })
    }

    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name }
    })

    if (createError) return json({ error: createError.message })

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        name,
        group_name: group_name || 'Grupo Modo Corre',
        id_grupo: id_grupo || null,
        id_locadora: id_locadora || null,
        id_pedido: id_pedido || null,
      })
      .eq('user_id', userData.user.id)

    if (profileError) return json({ error: profileError.message })

    const assignRole = role || 'user'
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({ user_id: userData.user.id, role: assignRole })

    if (roleError) return json({ error: roleError.message })

    return json({ success: true, user_id: userData.user.id })
  } catch (err: any) {
    return json({ error: err?.message || 'Erro interno' })
  }
})
