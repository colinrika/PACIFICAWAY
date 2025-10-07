create extension if not exists pgcrypto;

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
