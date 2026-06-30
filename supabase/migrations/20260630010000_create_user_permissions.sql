-- Tabela de permissões granulares por usuário
create table if not exists public.user_permissions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  permission text not null,
  granted boolean not null default true,
  created_at timestamptz default now(),
  unique(user_id, permission)
);

-- RLS
alter table public.user_permissions enable row level security;

-- Superadmin/admin podem ler todas as permissões
create policy "internal_read_all_permissions"
  on public.user_permissions for select
  using (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role in ('superadmin', 'admin')
    )
  );

-- Usuário pode ler suas próprias permissões
create policy "user_read_own_permissions"
  on public.user_permissions for select
  using (user_id = auth.uid());

-- Superadmin pode inserir/atualizar/deletar permissões
create policy "superadmin_insert_permissions"
  on public.user_permissions for insert
  with check (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'superadmin'
    )
  );

create policy "superadmin_update_permissions"
  on public.user_permissions for update
  using (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'superadmin'
    )
  );

create policy "superadmin_delete_permissions"
  on public.user_permissions for delete
  using (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'superadmin'
    )
  );
