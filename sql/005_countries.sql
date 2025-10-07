create extension if not exists pgcrypto;

create table if not exists countries (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  iso_code text unique,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now(),
  constraint iso_code_length check (iso_code is null or char_length(iso_code) = 2)
);

alter table if exists users
  add column if not exists phone_number text;

alter table if exists users
  add column if not exists country_id uuid references countries(id);

create index if not exists idx_users_country_id on users(country_id);
