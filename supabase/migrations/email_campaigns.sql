-- email_campaigns: log of bulk emails sent by admins.
-- Actual sending happens via the admin-ops Edge Function.

create table if not exists email_campaigns (
  id             uuid    primary key default gen_random_uuid(),
  sent_by        uuid    references auth.users(id) on delete set null,
  subject        text    not null,
  body           text    not null,
  recipient_ids  uuid[]  not null default '{}',    -- user_ids selected
  recipient_count int    not null default 0,
  status         text    not null default 'draft'
                         check (status in ('draft', 'sending', 'sent', 'failed')),
  error_message  text,
  sent_at        timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table email_campaigns enable row level security;

-- Only admins can see or manage campaigns
create policy "admin manages campaigns"
  on email_campaigns for all
  using  ( is_admin() )
  with check ( is_admin() );

create trigger email_campaigns_updated_at
  before update on email_campaigns
  for each row execute function touch_profile_updated_at();

create index if not exists idx_campaigns_status    on email_campaigns (status);
create index if not exists idx_campaigns_sent_by   on email_campaigns (sent_by);
create index if not exists idx_campaigns_created   on email_campaigns (created_at desc);
