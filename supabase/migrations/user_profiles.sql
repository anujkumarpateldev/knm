-- user_profiles: extends auth.users with role, soft-delete, and last login tracking.
-- Auto-created on registration via trigger. Admin can deactivate/reactivate.

create table if not exists user_profiles (
  user_id          uuid        primary key references auth.users(id) on delete cascade,
  email            text        not null default '',          -- denormalised copy for admin queries
  role             text        not null default 'user'
                               check (role in ('admin', 'user')),
  is_active        boolean     not null default true,
  deactivated_at   timestamptz,
  deactivated_by   uuid        references auth.users(id) on delete set null,
  reactivated_at   timestamptz,
  last_login_at    timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── Helper: is current user an active admin? ─────────────────────────────────
-- security definer + stable so Postgres evaluates it once per query, not per row.
create or replace function is_admin()
returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from user_profiles
    where user_id  = (select auth.uid())
    and   role     = 'admin'
    and   is_active = true
  );
$$;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table user_profiles enable row level security;

-- Users see their own profile; admins see everyone
create policy "select own or admin"
  on user_profiles for select
  using ( (select auth.uid()) = user_id or is_admin() );

-- Only admin can update any profile (activate/deactivate/role change)
create policy "admin updates profiles"
  on user_profiles for update
  using  ( is_admin() )
  with check ( is_admin() );

-- Row is inserted automatically by the trigger below (no manual insert needed)
create policy "insert own profile"
  on user_profiles for insert
  with check ( (select auth.uid()) = user_id or is_admin() );

-- ── Trigger: auto-create profile on registration ─────────────────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into user_profiles (user_id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── Trigger: keep updated_at fresh ───────────────────────────────────────────
create or replace function touch_profile_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger user_profiles_updated_at
  before update on user_profiles
  for each row execute function touch_profile_updated_at();

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists idx_user_profiles_role     on user_profiles (role);
create index if not exists idx_user_profiles_active   on user_profiles (is_active);
create index if not exists idx_user_profiles_email    on user_profiles (email);

-- ── Seed: make the first user (or a specific email) admin ────────────────────
-- Run manually after creating your admin account:
-- update user_profiles set role = 'admin' where email = 'your@email.com';
