import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { email, password, name, group_name, id_grupo, id_locadora, id_pedido, role } = await req.json()

  if (!email || !password || !name) {
    return new Response(JSON.stringify({ error: 'Email, senha e nome são obrigatórios' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Create user
  const { data: userData, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name }
  })

  if (createError) {
    return new Response(JSON.stringify({ error: createError.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Update profile with additional fields
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

  if (profileError) {
    return new Response(JSON.stringify({ error: profileError.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Assign role
  const assignRole = role || 'user'
  const { error: roleError } = await supabase
    .from('user_roles')
    .insert({ user_id: userData.user.id, role: assignRole })

  if (roleError) {
    return new Response(JSON.stringify({ error: roleError.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ success: true, user_id: userData.user.id }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
