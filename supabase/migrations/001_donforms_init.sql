-- ============================================================
-- DONFORMS — Migration 001 (idempotente)
-- Projeto: cpnwkmmhtjllcyruvqek
-- Safe to re-run: usa IF NOT EXISTS em tudo.
-- ============================================================

-- ============================================================
-- PROFILES (pode já existir do Don Caronas — só adiciona cols)
-- ============================================================
create table if not exists public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  name        text        not null,
  email       text        not null,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Trigger helper: atualiza updated_at em qualquer tabela
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger de updated_at em profiles (recria se já existir)
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-cria profile ao registrar usuário no Auth
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS policies (drop antes pra evitar "already exists")
drop policy if exists "profiles_select_own"   on public.profiles;
drop policy if exists "profiles_insert_self"  on public.profiles;
drop policy if exists "profiles_update_own"   on public.profiles;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_insert_self" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- ============================================================
-- FORMS
-- ============================================================
create table if not exists public.forms (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles(id) on delete cascade,
  title         text        not null default 'Sem título',
  slug          text        not null unique,
  settings      jsonb       not null default '{
    "primaryColor": "#6366f1",
    "bgColor": "#ffffff",
    "logoUrl": null,
    "redirectUrl": null,
    "thankYouMessage": "Obrigado! Suas respostas foram enviadas."
  }'::jsonb,
  fields        jsonb       not null default '[]'::jsonb,
  is_published  boolean     not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint slug_format check (slug ~ '^[a-z0-9][a-z0-9\-]{2,62}[a-z0-9]$')
);

create index if not exists idx_forms_user_id   on public.forms(user_id);
create index if not exists idx_forms_slug      on public.forms(slug);
create index if not exists idx_forms_published on public.forms(is_published) where is_published = true;

alter table public.forms enable row level security;

drop trigger if exists trg_forms_updated_at on public.forms;
create trigger trg_forms_updated_at
  before update on public.forms
  for each row execute function public.set_updated_at();

drop policy if exists "forms_all_owner"        on public.forms;
drop policy if exists "forms_select_published" on public.forms;

create policy "forms_all_owner" on public.forms
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "forms_select_published" on public.forms
  for select using (is_published = true);

-- ============================================================
-- SUBMISSIONS
-- ============================================================
create table if not exists public.submissions (
  id          uuid        primary key default gen_random_uuid(),
  form_id     uuid        not null references public.forms(id) on delete cascade,
  answers     jsonb       not null default '{}'::jsonb,
  metadata    jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_submissions_form_id    on public.submissions(form_id);
create index if not exists idx_submissions_created_at on public.submissions(created_at desc);

alter table public.submissions enable row level security;

drop policy if exists "submissions_insert_anon"    on public.submissions;
drop policy if exists "submissions_select_owner"   on public.submissions;

create policy "submissions_insert_anon" on public.submissions
  for insert with check (
    exists (
      select 1 from public.forms
      where id = form_id
        and is_published = true
    )
  );

create policy "submissions_select_owner" on public.submissions
  for select using (
    exists (
      select 1 from public.forms
      where id = form_id
        and user_id = auth.uid()
    )
  );

-- ============================================================
-- STORAGE: form-assets
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'form-assets',
  'form-assets',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp','image/svg+xml']
)
on conflict (id) do nothing;

drop policy if exists "form_assets_public_read"    on storage.objects;
drop policy if exists "form_assets_owner_insert"   on storage.objects;
drop policy if exists "form_assets_owner_update"   on storage.objects;
drop policy if exists "form_assets_owner_delete"   on storage.objects;

create policy "form_assets_public_read" on storage.objects
  for select using (bucket_id = 'form-assets');

create policy "form_assets_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'form-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "form_assets_owner_update" on storage.objects
  for update using (
    bucket_id = 'form-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "form_assets_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'form-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- FUNCTION: slug único a partir do título
-- ============================================================
create or replace function public.generate_slug(title text)
returns text
language plpgsql
as $$
declare
  base_slug text;
  candidate text;
  suffix    int := 0;
begin
  base_slug := lower(trim(title));
  base_slug := regexp_replace(base_slug, '[àáâãäå]', 'a', 'g');
  base_slug := regexp_replace(base_slug, '[èéêë]',   'e', 'g');
  base_slug := regexp_replace(base_slug, '[ìíîï]',   'i', 'g');
  base_slug := regexp_replace(base_slug, '[òóôõö]',  'o', 'g');
  base_slug := regexp_replace(base_slug, '[ùúûü]',   'u', 'g');
  base_slug := regexp_replace(base_slug, '[ç]',      'c', 'g');
  base_slug := regexp_replace(base_slug, '[ñ]',      'n', 'g');
  base_slug := regexp_replace(base_slug, '[^a-z0-9\s\-]', '', 'g');
  base_slug := regexp_replace(base_slug, '[\s\-]+',  '-', 'g');
  base_slug := substr(base_slug, 1, 50);
  base_slug := trim(both '-' from base_slug);

  if length(base_slug) < 4 then
    base_slug := base_slug || '-form';
  end if;

  candidate := base_slug;

  loop
    if not exists (select 1 from public.forms where slug = candidate) then
      return candidate;
    end if;
    suffix    := suffix + 1;
    candidate := base_slug || '-' || suffix::text;
  end loop;
end;
$$;

-- ============================================================
-- VIEW: forms + contagem de respostas
-- ============================================================
create or replace view public.forms_with_submission_count
  with (security_invoker = true)
as
  select
    f.*,
    count(s.id)::int as submission_count
  from public.forms f
  left join public.submissions s on s.form_id = f.id
  group by f.id;
