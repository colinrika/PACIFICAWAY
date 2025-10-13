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
end $$;

alter table services
  add column if not exists category_id uuid references categories(id) on delete set null;

create index if not exists idx_services_category on services(category_id);

do $$
declare
  column_exists boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'services'
      and column_name = 'category'
  ) into column_exists;

  if column_exists then
    insert into categories (name)
    select distinct category
    from services
    where category is not null
    on conflict (name) do nothing;

    update services s
    set category_id = c.id
    from categories c
    where s.category = c.name
      and s.category is not null
      and s.category_id is null;
  end if;
end $$;

alter table services
  drop column if exists category;
