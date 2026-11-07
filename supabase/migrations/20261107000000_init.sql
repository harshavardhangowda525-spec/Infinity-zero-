-- Infinity ZERO — initial schema
-- Run with the Supabase CLI (`supabase db push`) or paste into the SQL editor.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users). role controls founder access.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 100),
  role text not null default 'user' check (role in ('user', 'founder')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.user_settings (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

create or replace function public.is_founder() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'founder');
$$;

-- ---------------------------------------------------------------------------
-- user_settings
-- ---------------------------------------------------------------------------
create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  hourly_value numeric check (hourly_value is null or hourly_value >= 0),
  reduced_motion boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger user_settings_updated before update on public.user_settings
  for each row execute function public.set_updated_at();

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- workflows + steps
-- ---------------------------------------------------------------------------
create table public.workflows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  category text not null check (char_length(category) <= 80),
  description text not null check (char_length(description) <= 3000),
  per_week numeric not null check (per_week > 0 and per_week <= 1000),
  avg_minutes numeric not null check (avg_minutes > 0 and avg_minutes <= 2880),
  notes text not null default '' check (char_length(notes) <= 1000),
  sample_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workflows_user_idx on public.workflows (user_id, created_at desc);
create trigger workflows_updated before update on public.workflows
  for each row execute function public.set_updated_at();

create table public.workflow_steps (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows (id) on delete cascade,
  position int not null check (position >= 0),
  name text not null check (char_length(name) <= 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workflow_id, position)
);
create trigger workflow_steps_updated before update on public.workflow_steps
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- analyses + friction points
-- ---------------------------------------------------------------------------
create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  source_kind text not null check (source_kind in ('ai', 'sample', 'rules')),
  provider text,
  model text,
  summary text not null,
  current_minutes numeric not null check (current_minutes >= 0),
  improved_minutes numeric not null check (improved_minutes >= 0),
  per_week numeric not null check (per_week >= 0),
  difficulty text not null check (difficulty in ('easy', 'moderate', 'hard')),
  payload jsonb not null, -- full analysis (steps, causes, limitations, assumptions)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index analyses_user_idx on public.analyses (user_id, created_at desc);
create index analyses_workflow_idx on public.analyses (workflow_id);
create trigger analyses_updated before update on public.analyses
  for each row execute function public.set_updated_at();

create table public.friction_points (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  client_ref text not null,
  name text not null,
  category text not null check (category in (
    'repetitive_manual','unnecessary_approvals','duplicate_entry','info_searching',
    'communication_delays','manual_scheduling','repeated_responses','disconnected_tools')),
  severity text not null check (severity in ('low','medium','high')),
  confidence text not null check (confidence in ('low','medium','high')),
  difficulty text not null check (difficulty in ('easy','moderate','hard')),
  minutes_per_execution numeric not null check (minutes_per_execution >= 0),
  improved_minutes numeric not null check (improved_minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index friction_points_analysis_idx on public.friction_points (analysis_id);
create index friction_points_category_idx on public.friction_points (category);
create trigger friction_points_updated before update on public.friction_points
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- improvement plans + measurements
-- ---------------------------------------------------------------------------
create table public.improvement_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  title text not null,
  status text not null default 'proposed' check (status in ('proposed','accepted','rejected','implemented')),
  friction_decisions jsonb not null default '{}'::jsonb,
  inputs jsonb not null,
  implemented_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index improvement_plans_user_idx on public.improvement_plans (user_id, created_at desc);
create trigger improvement_plans_updated before update on public.improvement_plans
  for each row execute function public.set_updated_at();

create table public.improvement_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid not null references public.improvement_plans (id) on delete cascade,
  before_minutes numeric not null check (before_minutes >= 0),
  after_minutes numeric not null check (after_minutes >= 0),
  executions_measured int not null check (executions_measured > 0),
  notes text not null default '' check (char_length(notes) <= 1000),
  measured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index improvement_measurements_plan_idx on public.improvement_measurements (plan_id);
create trigger improvement_measurements_updated before update on public.improvement_measurements
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Customer validation (kept separate from product/demo content).
-- Anonymous: no user id, no IP, no email stored with feedback.
-- ---------------------------------------------------------------------------
create table public.feedback_responses (
  id uuid primary key default gen_random_uuid(),
  submission_key text not null unique, -- idempotency key: prevents duplicate submissions
  respondent_type text check (respondent_type in ('Business owner','Freelancer','Student','Employee','Other')),
  experience text not null default '' check (char_length(experience) <= 2000),
  usefulness text not null check (usefulness in ('yes','possibly','no')),
  usefulness_detail text not null default '' check (char_length(usefulness_detail) <= 2000),
  rating text not null check (rating in ('excellent','good','needs_improvement')),
  improvement_detail text not null default '' check (char_length(improvement_detail) <= 2000),
  time_consuming_task text not null default '' check (char_length(time_consuming_task) <= 1000),
  feature_wish text not null default '' check (char_length(feature_wish) <= 1000),
  pay_intent text check (pay_intent in ('yes','maybe','no')),
  price_range text check (char_length(price_range) <= 40),
  source text not null check (source in ('feedback_page','live_demo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint needs_improvement_detail check (rating <> 'needs_improvement' or char_length(improvement_detail) >= 3)
);
create index feedback_created_idx on public.feedback_responses (created_at desc);
create index feedback_type_idx on public.feedback_responses (respondent_type);
create trigger feedback_responses_updated before update on public.feedback_responses
  for each row execute function public.set_updated_at();

create table public.feedback_feature_requests (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.feedback_responses (id) on delete cascade,
  kind text not null check (kind in ('feature_wish','improvement','usefulness_gap','pain_point')),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index feedback_feature_requests_feedback_idx on public.feedback_feature_requests (feedback_id);
create trigger feedback_feature_requests_updated before update on public.feedback_feature_requests
  for each row execute function public.set_updated_at();

create table public.pricing_interest (
  id uuid primary key default gen_random_uuid(),
  plan text not null check (plan in ('free','personal','professional','business')),
  respondent_type text check (respondent_type in ('Business owner','Freelancer','Student','Employee','Other')),
  name text not null default '' check (char_length(name) <= 100),
  email text not null default '' check (char_length(email) <= 254),
  note text not null default '' check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index pricing_interest_plan_idx on public.pricing_interest (plan, created_at desc);
create trigger pricing_interest_updated before update on public.pricing_interest
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.workflows enable row level security;
alter table public.workflow_steps enable row level security;
alter table public.analyses enable row level security;
alter table public.friction_points enable row level security;
alter table public.improvement_plans enable row level security;
alter table public.improvement_measurements enable row level security;
alter table public.feedback_responses enable row level security;
alter table public.feedback_feature_requests enable row level security;
alter table public.pricing_interest enable row level security;

-- profiles: users read/update their own row; cannot change role themselves
create policy "own profile read" on public.profiles for select using (id = auth.uid());
create policy "own profile update" on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid());
-- Users may only change display_name; role is changed by an admin in the SQL editor.
revoke update on public.profiles from anon, authenticated;
grant update (display_name) on public.profiles to authenticated;

create policy "own settings" on public.user_settings for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Private product data: owner only. Founders cannot read other users' workflows.
create policy "own workflows" on public.workflows for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own workflow steps" on public.workflow_steps for all
  using (exists (select 1 from public.workflows w where w.id = workflow_id and w.user_id = auth.uid()))
  with check (exists (select 1 from public.workflows w where w.id = workflow_id and w.user_id = auth.uid()));
create policy "own analyses" on public.analyses for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own friction points" on public.friction_points for all
  using (exists (select 1 from public.analyses a where a.id = analysis_id and a.user_id = auth.uid()))
  with check (exists (select 1 from public.analyses a where a.id = analysis_id and a.user_id = auth.uid()));
create policy "own plans" on public.improvement_plans for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own measurements" on public.improvement_measurements for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Feedback: anyone (incl. anonymous) may insert; only founders may read.
create policy "anyone submits feedback" on public.feedback_responses for insert to anon, authenticated with check (true);
create policy "founders read feedback" on public.feedback_responses for select using (public.is_founder());
create policy "anyone submits feature requests" on public.feedback_feature_requests for insert to anon, authenticated with check (true);
create policy "founders read feature requests" on public.feedback_feature_requests for select using (public.is_founder());
create policy "anyone registers interest" on public.pricing_interest for insert to anon, authenticated with check (true);
create policy "founders read interest" on public.pricing_interest for select using (public.is_founder());

-- To make yourself a founder after signing up:
--   update public.profiles set role = 'founder' where id = '<your auth user id>';
