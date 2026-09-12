-- ============================================================
-- DONFORMS — Migration 007: Webhook Logs
-- ============================================================

create table if not exists public.webhook_logs (
  id             uuid        primary key default gen_random_uuid(),
  form_id        uuid        not null references public.forms(id) on delete cascade,
  submission_id  uuid        references public.submissions(id) on delete set null,
  url            text        not null,
  status_code    int,
  ok             boolean     not null default false,
  error_msg      text,
  duration_ms    int,
  is_test        boolean     not null default false,
  created_at     timestamptz not null default now()
);

alter table public.webhook_logs enable row level security;

create index if not exists idx_wl_form_id    on public.webhook_logs(form_id);
create index if not exists idx_wl_created_at on public.webhook_logs(created_at desc);

drop policy if exists "wl_select_owner" on public.webhook_logs;
drop policy if exists "wl_insert_any"   on public.webhook_logs;

-- Only form owner/members can read logs
create policy "wl_select_owner" on public.webhook_logs
  for select using (
    exists (
      select 1 from public.forms f
      where f.id = webhook_logs.form_id
        and (
          f.user_id = auth.uid()
          or exists (
            select 1 from public.workspace_members wm
            where wm.workspace_id = f.user_id and wm.user_id = auth.uid()
          )
        )
    )
  );

-- Insert unrestricted (server-side only via API routes)
create policy "wl_insert_any" on public.webhook_logs
  for insert with check (true);
