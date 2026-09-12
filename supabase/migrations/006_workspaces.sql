-- ============================================================
-- DONFORMS — Migration 006: Multi-user Workspaces
-- ============================================================

-- ── workspace_members ────────────────────────────────────────
create table if not exists public.workspace_members (
  workspace_id  uuid not null references auth.users(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          text not null default 'member'
                  check (role in ('admin', 'member', 'viewer')),
  invited_by    uuid references auth.users(id),
  joined_at     timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

alter table public.workspace_members enable row level security;

create index if not exists idx_wm_workspace on public.workspace_members(workspace_id);
create index if not exists idx_wm_user      on public.workspace_members(user_id);

drop policy if exists "wm_select" on public.workspace_members;
drop policy if exists "wm_insert" on public.workspace_members;
drop policy if exists "wm_delete" on public.workspace_members;

-- Owner sees all their members; members see their own row
create policy "wm_select" on public.workspace_members
  for select using (workspace_id = auth.uid() or user_id = auth.uid());

-- Only owner can add members (accept flow uses security definer fn)
create policy "wm_insert" on public.workspace_members
  for insert with check (workspace_id = auth.uid());

-- Owner removes anyone; member can leave (remove themselves)
create policy "wm_delete" on public.workspace_members
  for delete using (workspace_id = auth.uid() or user_id = auth.uid());

-- ── workspace_invitations ────────────────────────────────────
create table if not exists public.workspace_invitations (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references auth.users(id) on delete cascade,
  email         text not null,
  role          text not null default 'member'
                  check (role in ('admin', 'member', 'viewer')),
  token         text not null unique
                  default encode(gen_random_bytes(32), 'hex'),
  invited_by    uuid references auth.users(id),
  expires_at    timestamptz not null default (now() + interval '7 days'),
  accepted_at   timestamptz,
  created_at    timestamptz not null default now()
);

alter table public.workspace_invitations enable row level security;

create index if not exists idx_wi_workspace on public.workspace_invitations(workspace_id);
create index if not exists idx_wi_token     on public.workspace_invitations(token);

drop policy if exists "wi_select" on public.workspace_invitations;
drop policy if exists "wi_insert" on public.workspace_invitations;
drop policy if exists "wi_delete" on public.workspace_invitations;

-- Owner manages their invitations
create policy "wi_select" on public.workspace_invitations
  for select using (workspace_id = auth.uid());

create policy "wi_insert" on public.workspace_invitations
  for insert with check (workspace_id = auth.uid());

create policy "wi_delete" on public.workspace_invitations
  for delete using (workspace_id = auth.uid());

-- ── forms RLS: include workspace members ─────────────────────
-- Drop the single "all" policy; replace with per-operation policies
drop policy if exists "forms_all_owner" on public.forms;

create policy "forms_select_owner_or_member" on public.forms
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = forms.user_id
        and wm.user_id = auth.uid()
    )
  );

-- Insert: only workspace owner (members edit existing forms only)
create policy "forms_insert_owner" on public.forms
  for insert with check (auth.uid() = user_id);

-- Update: owner or member/admin
create policy "forms_update_owner_or_member" on public.forms
  for update
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = forms.user_id
        and wm.user_id = auth.uid()
        and wm.role in ('member', 'admin')
    )
  )
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = forms.user_id
        and wm.user_id = auth.uid()
        and wm.role in ('member', 'admin')
    )
  );

-- Delete: owner or admin
create policy "forms_delete_owner_or_admin" on public.forms
  for delete using (
    auth.uid() = user_id
    or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = forms.user_id
        and wm.user_id = auth.uid()
        and wm.role = 'admin'
    )
  );

-- ── submissions RLS: include workspace members ────────────────
drop policy if exists "submissions_select_owner" on public.submissions;

create policy "submissions_select_owner" on public.submissions
  for select using (
    exists (
      select 1 from public.forms f
      where f.id = submissions.form_id
        and (
          f.user_id = auth.uid()
          or exists (
            select 1 from public.workspace_members wm
            where wm.workspace_id = f.user_id
              and wm.user_id = auth.uid()
          )
        )
    )
  );

-- ── Security-definer helpers ──────────────────────────────────

-- Get invitation details by token (bypasses RLS — token is the secret)
create or replace function public.get_invitation_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inv  record;
  prof record;
begin
  select wi.* into inv
  from public.workspace_invitations wi
  where wi.token = p_token
    and wi.accepted_at is null
    and wi.expires_at > now();

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Convite inválido ou expirado.');
  end if;

  select name, email into prof
  from public.profiles
  where id = inv.workspace_id;

  return jsonb_build_object(
    'ok',           true,
    'id',           inv.id,
    'email',        inv.email,
    'role',         inv.role,
    'workspace_id', inv.workspace_id,
    'owner_name',   coalesce(prof.name, prof.email, 'Workspace'),
    'expires_at',   inv.expires_at
  );
end;
$$;

-- Accept invitation: validates token, creates membership, marks accepted
create or replace function public.accept_workspace_invitation(p_token text, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
begin
  select * into inv
  from public.workspace_invitations
  where token = p_token
    and accepted_at is null
    and expires_at > now();

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Convite inválido ou expirado.');
  end if;

  if inv.workspace_id = p_user_id then
    return jsonb_build_object('ok', false, 'error', 'Não é possível aceitar convite do próprio workspace.');
  end if;

  -- Upsert membership
  insert into public.workspace_members (workspace_id, user_id, role, invited_by)
  values (inv.workspace_id, p_user_id, inv.role, inv.invited_by)
  on conflict (workspace_id, user_id) do update set role = excluded.role;

  -- Mark invitation accepted
  update public.workspace_invitations
  set accepted_at = now()
  where id = inv.id;

  return jsonb_build_object(
    'ok',           true,
    'workspace_id', inv.workspace_id::text,
    'role',         inv.role
  );
end;
$$;
