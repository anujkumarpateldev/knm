-- ai_usage table — tracks AI calls per user for rate limiting and cost monitoring
-- Run this in Supabase SQL Editor

create table if not exists ai_usage (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  module        text not null,          -- 'quiz' | 'writing' | 'vocab' | 'reading'
  action        text not null,          -- 'hint' | 'explain' | 'grade' | 'mnemonic' | 'translate' | 'simplify'
  provider      text not null default 'unknown',  -- 'anthropic' | 'google' | 'openai' — set by aggregator
  model         text not null,          -- actual model used, reported by aggregator
  input_tokens  int  default 0,
  output_tokens int  default 0,
  created_at    timestamptz default now()
);

alter table ai_usage enable row level security;

-- Users can read their own usage (for showing "8 of 50 AI credits used today")
create policy "Users view own AI usage"
  on ai_usage for select
  using (auth.uid() = user_id);

-- Only the service role (Edge Function) can insert usage records
-- (No insert policy for anon/authenticated — inserts happen server-side)

-- Index for fast rate-limit queries
create index if not exists idx_ai_usage_user_created
  on ai_usage (user_id, created_at desc);

-- ── Admin queries ─────────────────────────────────────────────────────────────

-- Daily usage per user (rate limit check):
-- select count(*) from ai_usage
-- where user_id = '<uid>'
-- and created_at > now() - interval '24 hours';

-- Cost monitoring by day and model:
-- select
--   date_trunc('day', created_at) as day,
--   model,
--   count(*)                      as requests,
--   sum(input_tokens)             as total_input_tokens,
--   sum(output_tokens)            as total_output_tokens
-- from ai_usage
-- group by 1, 2
-- order by 1 desc, 3 desc;

-- Top actions by module:
-- select module, action, count(*) as calls
-- from ai_usage
-- group by module, action
-- order by calls desc;

-- Provider breakdown (see which provider is actually being used):
-- select
--   provider,
--   count(*)             as requests,
--   sum(input_tokens)    as total_input,
--   sum(output_tokens)   as total_output
-- from ai_usage
-- where created_at > now() - interval '7 days'
-- group by provider
-- order by requests desc;
