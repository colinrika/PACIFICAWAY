create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references users(id) on delete cascade,
  name text not null,
  description text,
  price numeric(12,2) not null,
  stock integer not null default 0,
  active boolean not null default true,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);
create index if not exists idx_items_provider on items(provider_id);
