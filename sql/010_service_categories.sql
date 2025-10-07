create table if not exists service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

alter table services
  add column if not exists category_id uuid references service_categories(id);

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
    insert into service_categories (name)
    select distinct category
    from services
    where category is not null
    on conflict (name) do nothing;

    update services s
    set category_id = sc.id
    from service_categories sc
    where s.category = sc.name
      and s.category is not null
      and s.category_id is null;
  end if;
end $$;

alter table services
  drop column if exists category;
