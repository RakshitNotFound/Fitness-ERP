-- ============================================================================
-- Fitness ERP — 001_init.sql
--
-- Initial schema + Row Level Security.
--
-- Multi-tenant model: every row belongs to exactly one gym. A user is linked to
-- a gym through `profiles.gym_id`, and RLS restricts every table to rows whose
-- `gym_id` matches the caller's gym.
--
-- Run this whole file once in the Supabase SQL editor (it is safe to re-run on a
-- fresh project).
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ----------------------------------------------------------------------------
-- Shared helper: keeps `updated_at` fresh on every UPDATE.
-- Attached to each table at the bottom of this file.
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- gyms — one row per tenant. Created automatically by `handle_new_user()`.
-- ----------------------------------------------------------------------------
create table if not exists public.gyms (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  owner_email      text not null,
  trial_started_at timestamptz not null default now(),
  trial_ends_at    timestamptz not null default (now() + interval '3 days'),
  is_paid          boolean not null default false,
  paid_until       date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- gyms has no gym_id column (it *is* the tenant), so index the lookup keys.
create index if not exists gyms_owner_email_idx on public.gyms (lower(owner_email));
create index if not exists gyms_trial_ends_at_idx on public.gyms (trial_ends_at);

-- ----------------------------------------------------------------------------
-- profiles — one row per auth user, pointing at the user's gym.
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  gym_id     uuid not null references public.gyms (id) on delete cascade,
  email      text not null,
  role       text not null default 'owner' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_gym_id_idx on public.profiles (gym_id);

-- ----------------------------------------------------------------------------
-- plans — membership plans sold by a gym (e.g. "Monthly", 30 days, ₹1000).
-- ----------------------------------------------------------------------------
create table if not exists public.plans (
  id            uuid primary key default gen_random_uuid(),
  gym_id        uuid not null references public.gyms (id) on delete cascade,
  name          text not null,
  duration_days integer not null check (duration_days > 0),
  price         numeric(10, 2) not null default 0 check (price >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists plans_gym_id_idx on public.plans (gym_id);

-- ----------------------------------------------------------------------------
-- members — people training at a gym.
-- ----------------------------------------------------------------------------
create table if not exists public.members (
  id         uuid primary key default gen_random_uuid(),
  gym_id     uuid not null references public.gyms (id) on delete cascade,
  name       text not null,
  phone      text,
  email      text,
  plan_id    uuid references public.plans (id) on delete set null,
  join_date  date not null default current_date,
  status     text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists members_gym_id_idx on public.members (gym_id);
create index if not exists members_gym_id_status_idx on public.members (gym_id, status);
create index if not exists members_plan_id_idx on public.members (plan_id);
create index if not exists members_phone_idx on public.members (gym_id, phone);

-- ----------------------------------------------------------------------------
-- payments — money received from a member.
-- ----------------------------------------------------------------------------
create table if not exists public.payments (
  id         uuid primary key default gen_random_uuid(),
  gym_id     uuid not null references public.gyms (id) on delete cascade,
  member_id  uuid not null references public.members (id) on delete cascade,
  amount     numeric(10, 2) not null check (amount >= 0),
  method     text not null default 'cash' check (method in ('cash', 'gpay', 'upi', 'other')),
  paid_on    date not null default current_date,
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_gym_id_idx on public.payments (gym_id);
create index if not exists payments_gym_id_paid_on_idx on public.payments (gym_id, paid_on desc);
create index if not exists payments_member_id_idx on public.payments (member_id);

-- ----------------------------------------------------------------------------
-- classes — recurring weekly class slots (day_of_week: 0 = Sunday … 6 = Saturday).
-- ----------------------------------------------------------------------------
create table if not exists public.classes (
  id           uuid primary key default gen_random_uuid(),
  gym_id       uuid not null references public.gyms (id) on delete cascade,
  name         text not null,
  trainer_name text,
  day_of_week  smallint not null check (day_of_week between 0 and 6),
  start_time   time not null,
  capacity     integer not null default 0 check (capacity >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists classes_gym_id_idx on public.classes (gym_id);
create index if not exists classes_gym_id_day_idx on public.classes (gym_id, day_of_week, start_time);

-- ----------------------------------------------------------------------------
-- class_enrollments — which member is booked into which class.
-- ----------------------------------------------------------------------------
create table if not exists public.class_enrollments (
  id         uuid primary key default gen_random_uuid(),
  gym_id     uuid not null references public.gyms (id) on delete cascade,
  class_id   uuid not null references public.classes (id) on delete cascade,
  member_id  uuid not null references public.members (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_enrollments_class_id_member_id_key unique (class_id, member_id)
);

create index if not exists class_enrollments_gym_id_idx on public.class_enrollments (gym_id);
create index if not exists class_enrollments_class_id_idx on public.class_enrollments (class_id);
create index if not exists class_enrollments_member_id_idx on public.class_enrollments (member_id);

-- ----------------------------------------------------------------------------
-- Attach the `updated_at` trigger to every table.
-- ----------------------------------------------------------------------------
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'gyms',
    'profiles',
    'plans',
    'members',
    'payments',
    'classes',
    'class_enrollments'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', tbl);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()',
      tbl
    );
  end loop;
end;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Tenant lookup used by every policy: "which gym does the current user belong
-- to?" — exactly `select gym_id from profiles where id = auth.uid()`.
--
-- It lives in a SECURITY DEFINER function because a policy on `profiles` that
-- sub-queries `profiles` would recurse infinitely (Postgres error 42P17).
-- The function body is the required subquery; RLS policies simply call it.
create or replace function public.current_gym_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select gym_id from public.profiles where id = auth.uid();
$$;

revoke all on function public.current_gym_id() from public;
grant execute on function public.current_gym_id() to authenticated;

-- Enable RLS on EVERY table (no row is readable without a matching policy).
alter table public.gyms              enable row level security;
alter table public.profiles          enable row level security;
alter table public.plans             enable row level security;
alter table public.members           enable row level security;
alter table public.payments          enable row level security;
alter table public.classes           enable row level security;
alter table public.class_enrollments enable row level security;

-- ----------------------------------------------------------------------------
-- Policies: one `for all` policy per table, restricted to signed-in users.
-- `for all` + `using` (SELECT/UPDATE/DELETE visibility) + `with check`
-- (INSERT/UPDATE result) covers SELECT, INSERT, UPDATE and DELETE.
-- ----------------------------------------------------------------------------

-- gyms: the tenant row itself is keyed by `id`, not `gym_id`.
drop policy if exists gyms_tenant_isolation on public.gyms;
create policy gyms_tenant_isolation on public.gyms
  for all
  to authenticated
  using (id = public.current_gym_id())
  with check (id = public.current_gym_id());

-- profiles: users see/edit only colleagues in their own gym.
drop policy if exists profiles_tenant_isolation on public.profiles;
create policy profiles_tenant_isolation on public.profiles
  for all
  to authenticated
  using (gym_id = public.current_gym_id())
  with check (gym_id = public.current_gym_id());

drop policy if exists plans_tenant_isolation on public.plans;
create policy plans_tenant_isolation on public.plans
  for all
  to authenticated
  using (gym_id = public.current_gym_id())
  with check (gym_id = public.current_gym_id());

drop policy if exists members_tenant_isolation on public.members;
create policy members_tenant_isolation on public.members
  for all
  to authenticated
  using (gym_id = public.current_gym_id())
  with check (gym_id = public.current_gym_id());

drop policy if exists payments_tenant_isolation on public.payments;
create policy payments_tenant_isolation on public.payments
  for all
  to authenticated
  using (gym_id = public.current_gym_id())
  with check (gym_id = public.current_gym_id());

drop policy if exists classes_tenant_isolation on public.classes;
create policy classes_tenant_isolation on public.classes
  for all
  to authenticated
  using (gym_id = public.current_gym_id())
  with check (gym_id = public.current_gym_id());

drop policy if exists class_enrollments_tenant_isolation on public.class_enrollments;
create policy class_enrollments_tenant_isolation on public.class_enrollments
  for all
  to authenticated
  using (gym_id = public.current_gym_id())
  with check (gym_id = public.current_gym_id());

-- Data API access for signed-in users (RLS still decides which rows).
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ============================================================================
-- NEW USER PROVISIONING
-- ============================================================================

-- On every `auth.users` insert: create the gym (3-day trial) + an owner profile.
--
-- Optional metadata used for naming, if the client passed it at sign-up:
--   supabase.auth.signUp({ options: { data: { gym_name: 'Iron Paradise' } } })
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_gym_id uuid;
  user_email text;
  gym_name   text;
begin
  user_email := coalesce(nullif(trim(new.email), ''), new.id::text);
  gym_name   := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'gym_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(user_email, '@', 1),
    'My Gym'
  );

  insert into public.gyms (name, owner_email, trial_started_at, trial_ends_at)
  values (gym_name, user_email, now(), now() + interval '3 days')
  returning id into new_gym_id;

  insert into public.profiles (id, gym_id, email, role)
  values (new.id, new_gym_id, user_email, 'owner')
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
