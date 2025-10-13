create extension if not exists pgcrypto;

-- Ensure lookup tables used by controllers exist with the expected shape
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'service_categories'
  ) then
    insert into categories (id, name, description, created_at, updated_at)
    select
      id,
      name,
      null,
      coalesce(created_at, now()),
      coalesce(updated_at, now())
    from service_categories
    on conflict (id) do nothing;
  end if;
end
$$;

create table if not exists services (
  id uuid primary key default gen_random_uuid()
);

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'services'
      and column_name = 'title'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'services'
      and column_name = 'name'
  ) then
    execute 'alter table services rename column name to title';
  end if;
end
$$;

alter table services
  add column if not exists provider_id uuid,
  add column if not exists category_id uuid,
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists price numeric(12,2),
  add column if not exists active boolean default true,
  add column if not exists created_at timestamp default now(),
  add column if not exists updated_at timestamp default now();

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'services'
      and column_name = 'name'
  ) then
    execute $$update services
             set title = coalesce(title, name)
             where title is null and name is not null$$;
  end if;
end
$$;

alter table if exists services drop column if exists name;

update services set active = true where active is null;
update services set created_at = now() where created_at is null;
update services set updated_at = now() where updated_at is null;

create index if not exists idx_services_provider on services(provider_id);
create index if not exists idx_services_category on services(category_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'services_provider_id_fkey'
  ) then
    alter table services
      add constraint services_provider_id_fkey foreign key (provider_id)
      references users(id) on delete cascade;
  end if;
  if exists (
    select 1 from pg_constraint where conname = 'services_category_id_fkey'
  ) then
    alter table services
      drop constraint services_category_id_fkey;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'services_category_id_fkey'
  ) then
    alter table services
      add constraint services_category_id_fkey foreign key (category_id)
      references categories(id) on delete set null;
  end if;
end
$$;

create table if not exists items (
  id uuid primary key default gen_random_uuid()
);

alter table items
  add column if not exists provider_id uuid,
  add column if not exists name text,
  add column if not exists description text,
  add column if not exists price numeric(12,2),
  add column if not exists stock integer default 0,
  add column if not exists active boolean default true,
  add column if not exists created_at timestamp default now(),
  add column if not exists updated_at timestamp default now();

update items set stock = 0 where stock is null;
update items set active = true where active is null;
update items set created_at = now() where created_at is null;
update items set updated_at = now() where updated_at is null;

create index if not exists idx_items_provider on items(provider_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'items_provider_id_fkey'
  ) then
    alter table items
      add constraint items_provider_id_fkey foreign key (provider_id)
      references users(id) on delete cascade;
  end if;
end
$$;

create table if not exists bookings (
  id uuid primary key default gen_random_uuid()
);

alter table bookings
  add column if not exists service_id uuid,
  add column if not exists customer_id uuid,
  add column if not exists date timestamp,
  add column if not exists status text default 'pending',
  add column if not exists notes text,
  add column if not exists created_at timestamp default now(),
  add column if not exists updated_at timestamp default now();

update bookings set status = 'pending' where status is null;
update bookings set created_at = now() where created_at is null;
update bookings set updated_at = now() where updated_at is null;

create index if not exists idx_bookings_customer on bookings(customer_id);
create index if not exists idx_bookings_service on bookings(service_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_service_id_fkey'
  ) then
    alter table bookings
      add constraint bookings_service_id_fkey foreign key (service_id)
      references services(id) on delete cascade;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_customer_id_fkey'
  ) then
    alter table bookings
      add constraint bookings_customer_id_fkey foreign key (customer_id)
      references users(id) on delete cascade;
  end if;
end
$$;

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
