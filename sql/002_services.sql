create table if not exists service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references users(id) on delete cascade,
  category_id uuid references service_categories(id),
  name text not null,
  description text,
  price numeric(12,2) not null,
  active boolean not null default true,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);
create index if not exists idx_services_provider on services(provider_id);
create index if not exists idx_services_category on services(category_id);
