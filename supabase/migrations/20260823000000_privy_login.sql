-- Login por email vía Privy: cada tenant queda atado a un privy_user_id y su
-- wallet de payout la crea Privy automáticamente (ya no hay API key que pegar).

alter table tenants add column if not exists email text;
alter table tenants add column if not exists privy_user_id text;

create unique index if not exists tenants_email_idx on tenants (email) where email is not null;
create unique index if not exists tenants_privy_user_id_idx on tenants (privy_user_id) where privy_user_id is not null;

-- El API key deja de ser obligatorio: el alta nueva ya no lo genera.
alter table tenants alter column api_key_hash drop not null;
alter table tenants alter column api_key_prefix drop not null;
