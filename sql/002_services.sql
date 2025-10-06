create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references users(id) on delete cascade,
  name text not null,
  description text,
  category text,
  price numeric(12,2) not null,
  active boolean not null default true,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);
create index if not exists idx_services_provider on services(provider_id);
