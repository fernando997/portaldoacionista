import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { user_id } = await req.json()

    if (!user_id) return json({ error: 'user_id é obrigatório' }, 400)

    // Delete from user_roles
    const { error: rolesError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', user_id)

    if (rolesError) return json({ error: rolesError.message }, 500)

    // Delete from profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', user_id)

    if (profileError) return json({ error: profileError.message }, 500)

    // Delete from auth.users
    const { error: authError } = await supabase.auth.admin.deleteUser(user_id)

    if (authError) return json({ error: authError.message }, 500)

    return json({ success: true })
  } catch (err: any) {
    return json({ error: err?.message || 'Erro interno' }, 500)
  }
})
