-- word_dictionary: shared Dutch word store. Deduplicates words across users.
-- Admin can edit. All authenticated users can read and insert new words.

create table if not exists word_dictionary (
  id          uuid  primary key default gen_random_uuid(),
  dutch       text  not null,
  dutch_lower text  generated always as (lower(trim(dutch))) stored,
  english     text  not null,
  meaning     text  not null default '',
  example     text  not null default '',
  usage_count int   not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (dutch_lower)
);

alter table word_dictionary enable row level security;

create policy "authenticated read dictionary"
  on word_dictionary for select
  to authenticated using (true);

create policy "authenticated insert dictionary"
  on word_dictionary for insert
  to authenticated with check (true);

-- Only admin can update or delete dictionary entries
create policy "admin update dictionary"
  on word_dictionary for update
  using  ( is_admin() ) with check ( is_admin() );

create policy "admin delete dictionary"
  on word_dictionary for delete
  using ( is_admin() );

create or replace function touch_dict_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger word_dictionary_updated_at
  before update on word_dictionary
  for each row execute function touch_dict_updated_at();

create index if not exists idx_dict_dutch_lower on word_dictionary (dutch_lower);
create index if not exists idx_dict_usage       on word_dictionary (usage_count desc);
create index if not exists idx_dict_updated     on word_dictionary (updated_at desc);
