-- ============================================
-- AGENCY SETTINGS
-- Egyetlen sor. Nem technikai kulcsok, hanem
-- vizuális és üzleti metaadatok.
-- ============================================
create table agency_settings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  primary_color text default '#1f6feb',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- PLATFORMS
-- Multi-platform-ready konfigurációs tábla.
-- MVP-ben csak Google Ads aktív.
-- ============================================
create table platforms (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                 -- 'google_ads'
  display_name text not null,                -- 'Google Ads'
  windsor_connector text not null,           -- 'google_ads'
  icon_color text not null,                  -- '#4285f4'
  icon_letter text not null,                 -- 'G'

  -- fields_config definiálja:
  -- - milyen mezőket kérünk a Windsorból
  -- - hogyan rendereljük a fiókszintű táblát
  -- - hogyan rendereljük a kampánytáblát
  -- - kampány megjelenítési limitek
  fields_config jsonb not null,

  is_active boolean default false,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- ============================================
-- CLIENTS
-- ============================================
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null
    check (type in ('webshop', 'szolgaltato')),
  industry text,
  contact_email text,
  logo_url text,
  notes text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- CLIENT CONNECTIONS
-- Egy ügyfélhez több platform kapcsolat tartozhat.
-- ============================================
create table client_connections (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  platform_id uuid not null references platforms(id),
  account_id text not null,
  account_name text,
  is_active boolean default true,
  last_synced_at timestamptz,
  created_at timestamptz default now(),

  unique(client_id, platform_id, account_id)
);

-- ============================================
-- PERIOD METRICS
-- Nem "monthly", mert egyedi időszakokat is kezel.
-- Egy connection adott időszakára vonatkozó
-- aggregált nyers adat + kampánybontás.
-- ============================================
create table period_metrics (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  connection_id uuid not null references client_connections(id) on delete cascade,

  period_start date not null,
  period_end date not null,

  impressions bigint,
  clicks bigint,
  ctr numeric(10,4),
  cpc numeric(12,2),
  spend numeric(14,2),
  conversions numeric(12,2),
  cost_per_conversion numeric(12,2),
  conversion_value numeric(14,2),
  roas numeric(10,4),

  extra_data jsonb default '{}',

  fetched_at timestamptz default now(),

  unique(connection_id, period_start, period_end)
);

-- ============================================
-- REPORTS
-- Egy riport egy aktuális szerkeszthető példány.
-- Nincs approval, nincs verziózás.
-- ============================================
create table reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,

  mode text not null
    check (mode in ('monthly', 'custom')),

  -- monthly report esetén az adott hónap első napja
  month_bucket date,

  current_period_start date not null,
  current_period_end date not null,
  comparison_period_start date not null,
  comparison_period_end date not null,

  -- Fontos: a riport a generáláskori típust használja,
  -- nem a client jelenlegi típusát.
  template_type text not null
    check (template_type in ('webshop', 'szolgaltato')),

  status text not null default 'draft'
    check (status in ('draft', 'completed')),

  last_generated_at timestamptz default now(),
  last_pdf_downloaded_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  check (current_period_start <= current_period_end),
  check (comparison_period_start <= comparison_period_end),
  check (
    (mode = 'monthly' and month_bucket is not null)
    or
    (mode = 'custom' and month_bucket is null)
  )
);

-- Egy havi riport / ügyfél / hónap
create unique index uniq_reports_monthly
  on reports(client_id, month_bucket)
  where mode = 'monthly';

-- Egyedi riport deduplikáció azonos current+comparison párokra
create unique index uniq_reports_custom
  on reports(
    client_id,
    current_period_start,
    current_period_end,
    comparison_period_start,
    comparison_period_end
  )
  where mode = 'custom';

-- ============================================
-- REPORT SECTIONS
-- Szöveges tartalom és enabled állapot.
-- A számtáblák a period_metrics-ből épülnek.
-- ============================================
create table report_sections (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  connection_id uuid references client_connections(id),
  section_type text not null
    check (section_type in ('platform_analysis', 'executive_summary', 'glossary')),
  ai_generated_text text,
  edited_text text,
  is_enabled boolean default true,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index uniq_report_platform_sections
  on report_sections(report_id, connection_id)
  where section_type = 'platform_analysis';

create unique index uniq_report_executive_summary
  on report_sections(report_id, section_type)
  where section_type = 'executive_summary';

create unique index uniq_report_glossary
  on report_sections(report_id, section_type)
  where section_type = 'glossary';

-- ============================================
-- GLOSSARY TERMS
-- ============================================
create table glossary_terms (
  id uuid primary key default gen_random_uuid(),
  term text not null,
  full_name text,
  definition text not null,
  sort_order int default 0,
  is_active boolean default true
);

-- ============================================
-- INDEXEK
-- ============================================
create index idx_connections_client on client_connections(client_id);
create index idx_period_metrics_connection on period_metrics(connection_id);
create index idx_period_metrics_period on period_metrics(period_start, period_end);
create index idx_reports_client on reports(client_id);
create index idx_reports_month on reports(month_bucket);
create index idx_sections_report on report_sections(report_id);
