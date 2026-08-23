-- Recursos por link: URLs absolutas vendidas detrás de un 402.
-- A diferencia de routes (patrones sobre el origin del tenant), un resource
-- apunta a cualquier URL pública y se sirve en /{tenant}/r/{slug}.
create table if not exists resources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  slug text not null,
  url text not null,
  title text,
  price_usd numeric(18, 6) not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, slug)
);
create index if not exists resources_tenant_idx on resources (tenant_id) where active;
alter table resources enable row level security;
