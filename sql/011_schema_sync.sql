create extension if not exists pgcrypto;

-- Ensure lookup tables used by controllers exist with the expected shape
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

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services(id) on delete cascade,
  customer_id uuid not null references users(id) on delete cascade,
  date timestamp not null,
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled','completed')),
  notes text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);
create index if not exists idx_bookings_customer on bookings(customer_id);
create index if not exists idx_bookings_service on bookings(service_id);

create table if not exists countries (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  iso_code text unique,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now(),
  constraint iso_code_length check (iso_code is null or char_length(iso_code) = 2)
);

alter table if exists users
  add column if not exists phone_number text,
  add column if not exists country_id uuid references countries(id);
create index if not exists idx_users_country_id on users(country_id);

create table if not exists states (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references countries(id) on delete cascade,
  name text not null,
  code text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now(),
  constraint states_country_id_name_key unique (country_id, name),
  constraint states_code_length check (code is null or char_length(code) <= 10)
);
create index if not exists idx_states_country_id on states(country_id);
create unique index if not exists idx_states_country_id_code on states(country_id, code) where code is not null;

create table if not exists cities (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references countries(id) on delete cascade,
  state_id uuid references states(id) on delete set null,
  name text not null,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now(),
  state_lookup uuid generated always as (
    coalesce(state_id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) stored,
  constraint cities_country_lookup_name_key unique (country_id, state_lookup, name)
);
create index if not exists idx_cities_country_id on cities(country_id);
create index if not exists idx_cities_state_id on cities(state_id);
