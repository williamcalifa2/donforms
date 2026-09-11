-- ─── Histórico de alterações de forms ─────────────────────────────────────────
create table if not exists public.form_history (
  id          uuid        primary key default gen_random_uuid(),
  form_id     uuid        not null references public.forms(id) on delete cascade,
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  summary     text        not null,   -- e.g. "Título alterado", "Campo adicionado: Email"
  details     jsonb       default '{}' -- optional extra info
);

create index if not exists idx_form_history_form_id on public.form_history(form_id, created_at desc);

alter table public.form_history enable row level security;

-- Usuário vê histórico dos seus próprios forms
create policy "form_history_select_own" on public.form_history
  for select using (
    exists (
      select 1 from public.forms f
      where f.id = form_id and f.user_id = auth.uid()
    )
  );

-- Usuário insere histórico dos seus próprios forms
create policy "form_history_insert_own" on public.form_history
  for insert with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.forms f
      where f.id = form_id and f.user_id = auth.uid()
    )
  );
