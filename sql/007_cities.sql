create extension if not exists pgcrypto;

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
