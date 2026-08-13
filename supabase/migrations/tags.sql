-- tags: predefined word tags, shown as suggestions in the word journal.
-- Readable by all authenticated users. Writable by admins only.

create table if not exists tags (
  id         uuid  primary key default gen_random_uuid(),
  name       text  not null unique,
  color      text  not null default '#6b8c84',   -- hex colour shown in UI
  sort_order int   not null default 0,            -- admin-controlled display order
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table tags enable row level security;

-- Everyone authenticated can read tags (used as suggestions in add-word form)
create policy "authenticated read tags"
  on tags for select
  to authenticated
  using (true);

-- Only admins can insert / update / delete
create policy "admin manages tags"
  on tags for all
  using  ( is_admin() )
  with check ( is_admin() );

create trigger tags_updated_at
  before update on tags
  for each row execute function touch_profile_updated_at();

create index if not exists idx_tags_sort on tags (sort_order, name);

-- ── Seed common tags ─────────────────────────────────────────────────────────
insert into tags (name, color, sort_order) values
  ('daily life',   '#10b981', 1),
  ('work',         '#3b82f6', 2),
  ('transport',    '#8b5cf6', 3),
  ('food',         '#f59e0b', 4),
  ('housing',      '#ef4444', 5),
  ('health',       '#06b6d4', 6),
  ('government',   '#6366f1', 7),
  ('education',    '#84cc16', 8),
  ('shopping',     '#f97316', 9),
  ('family',       '#ec4899', 10),
  ('nature',       '#14b8a6', 11),
  ('time',         '#a855f7', 12)
on conflict (name) do nothing;
