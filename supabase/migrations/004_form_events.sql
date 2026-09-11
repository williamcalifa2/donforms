-- form_events: analytics de funil por formulário
create table if not exists public.form_events (
  id            uuid primary key default gen_random_uuid(),
  form_id       uuid not null references public.forms(id) on delete cascade,
  event_type    text not null check (event_type in ('view','start','abandon','complete')),
  question_index integer,
  session_id    text,
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

-- Índices para queries de analytics
create index if not exists form_events_form_id_idx on public.form_events(form_id);
create index if not exists form_events_created_at_idx on public.form_events(created_at);

-- RLS
alter table public.form_events enable row level security;

-- Qualquer visitante (anon) pode inserir eventos
drop policy if exists "form_events_insert_anon" on public.form_events;
create policy "form_events_insert_anon" on public.form_events
  for insert
  to anon, authenticated
  with check (true);

-- Dono do form pode ler os eventos do seu form
drop policy if exists "form_events_select_owner" on public.form_events;
create policy "form_events_select_owner" on public.form_events
  for select
  using (
    exists (
      select 1 from public.forms
      where forms.id = form_events.form_id
        and forms.user_id = auth.uid()
    )
  );
