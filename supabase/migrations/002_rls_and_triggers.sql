-- ============================================
-- ROW LEVEL SECURITY
-- Egyfelhasználós MVP: minden autentikált user
-- mindent lát és módosíthat.
-- ============================================

alter table agency_settings enable row level security;
alter table platforms enable row level security;
alter table clients enable row level security;
alter table client_connections enable row level security;
alter table period_metrics enable row level security;
alter table reports enable row level security;
alter table report_sections enable row level security;
alter table glossary_terms enable row level security;

create policy "Authenticated full access" on agency_settings
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated full access" on platforms
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated full access" on clients
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated full access" on client_connections
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated full access" on period_metrics
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated full access" on reports
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated full access" on report_sections
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated full access" on glossary_terms
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_agency_settings_updated_at
  before update on agency_settings
  for each row execute function update_updated_at();

create trigger trg_clients_updated_at
  before update on clients
  for each row execute function update_updated_at();

create trigger trg_reports_updated_at
  before update on reports
  for each row execute function update_updated_at();

create trigger trg_report_sections_updated_at
  before update on report_sections
  for each row execute function update_updated_at();
