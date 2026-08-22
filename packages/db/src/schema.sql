-- Peaje · esquema
-- Correr en el SQL editor de Supabase.

create extension if not exists "pgcrypto";

create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  -- El API key se muestra una sola vez; guardamos solo el hash.
  api_key_hash text not null,
  api_key_prefix text not null,
  -- Secreto separado del API key: firma los JWT del iframe. Nunca va al browser.
  embed_secret text not null,
  origin_url text not null,
  payout_wallet text,
  created_at timestamptz not null default now()
);

create table if not exists allowed_origins (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  origin text not null,
  unique (tenant_id, origin)
);

create table if not exists routes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  method text not null default 'GET',
  path_pattern text not null,
  price_usd numeric(18, 6) not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, method, path_pattern)
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  route_id uuid references routes(id) on delete set null,
  path text not null,
  agent_wallet text,
  amount numeric(18, 6) not null,
  -- Hash de la tx en Tempo. Único: evita acreditar dos veces el mismo Receipt.
  receipt_ref text not null unique,
  method text not null default 'tempo',
  created_at timestamptz not null default now()
);

create table if not exists withdrawals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  amount numeric(18, 6) not null,
  to_wallet text not null,
  tx_ref text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'failed')),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create index if not exists payments_tenant_created_idx on payments (tenant_id, created_at desc);
create index if not exists withdrawals_tenant_created_idx on withdrawals (tenant_id, created_at desc);
create index if not exists routes_tenant_idx on routes (tenant_id) where active;

-- Balance disponible por tenant: cobrado menos retirado (pendiente cuenta como comprometido).
create or replace view tenant_balances as
select
  t.id as tenant_id,
  coalesce((select sum(amount) from payments p where p.tenant_id = t.id), 0) as revenue,
  coalesce((select sum(amount) from withdrawals w where w.tenant_id = t.id and w.status in ('pending', 'confirmed')), 0) as withdrawn,
  coalesce((select sum(amount) from payments p where p.tenant_id = t.id), 0)
    - coalesce((select sum(amount) from withdrawals w where w.tenant_id = t.id and w.status in ('pending', 'confirmed')), 0) as available,
  coalesce((select count(*) from payments p where p.tenant_id = t.id), 0) as request_count
from tenants t;

-- Todo el acceso pasa por el service role del backend. RLS prendido y sin políticas
-- para que la anon key no lea nada aunque se filtre.
alter table tenants enable row level security;
alter table allowed_origins enable row level security;
alter table routes enable row level security;
alter table payments enable row level security;
alter table withdrawals enable row level security;
