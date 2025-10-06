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
