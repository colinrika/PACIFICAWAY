create extension if not exists pgcrypto;
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  password_hash text not null,
  role text not null check (role in ('customer','provider','job_seeker','agent','admin')),
  status text not null default 'active' check (status in ('active','suspended','pending')),
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);
create index if not exists idx_users_email on users(email);
