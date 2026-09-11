-- ── Adiciona status ao pipeline de kanban ────────────────────────────────
alter table public.submissions
  add column if not exists status text not null default 'novo'
    check (status in ('novo', 'qualificado', 'em_negociacao', 'fechado'));

create index if not exists idx_submissions_status on public.submissions(status);

-- RLS: dono do form pode atualizar status
drop policy if exists "submissions_update_owner" on public.submissions;
create policy "submissions_update_owner" on public.submissions
  for update using (
    exists (
      select 1 from public.forms
      where id = form_id
        and user_id = auth.uid()
    )
  );
