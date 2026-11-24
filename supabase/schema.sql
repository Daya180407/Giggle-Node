-- GigleNode — Supabase schema
-- PRD section 13 ke hisaab se. Isko Supabase SQL editor me chala kar tables + RLS set kijiye.
-- App abhi local JSON store (data/db.json) se chalta hai; production me in tables ko use karein.

create extension if not exists "uuid-ossp";

-- ---------- enums ----------
do $$ begin
  create type price_type as enum ('free', 'freemium', 'paid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type post_status as enum ('draft', 'published');
exception when duplicate_object then null; end $$;

do $$ begin
  create type post_type as enum ('news', 'comparison', 'top10', 'tutorial');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role as enum ('user', 'admin');
exception when duplicate_object then null; end $$;

-- ---------- profiles (auth.users ke saath 1:1) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text not null,
  avatar text default '',
  role user_role not null default 'user',
  created_at timestamptz not null default now()
);

-- ---------- AI ----------
create table if not exists public.ai (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  logo text default '🤖',
  color text default '#4F46E5',
  website text,
  category text not null,
  price_type price_type not null default 'freemium',
  description text default '',
  best_for text[] default '{}',
  pros text[] default '{}',
  cons text[] default '{}',
  plan_price numeric(10, 2) default 0,
  unit_cost numeric(10, 4) default 0,
  free_alternative_id uuid references public.ai (id) on delete set null,
  sponsored boolean not null default false,
  boost numeric(4, 2) not null default 0 check (boost >= 0 and boost <= 1),
  visits integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ai_category_idx on public.ai (category);
create index if not exists ai_slug_idx on public.ai (slug);

-- ---------- models ----------
create table if not exists public.models (
  id uuid primary key default uuid_generate_v4(),
  ai_id uuid not null references public.ai (id) on delete cascade,
  name text not null,
  slug text not null,
  description text default '',
  launch_date date,
  best_for text default '',
  price_type price_type not null default 'freemium',
  created_at timestamptz not null default now(),
  unique (ai_id, slug)
);

create index if not exists models_ai_idx on public.models (ai_id);

-- ---------- ratings: ek user, ek model, ek rating ----------
create table if not exists public.ratings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  model_id uuid not null references public.models (id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  review text check (char_length(review) <= 600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_edited_at timestamptz,
  unique (user_id, model_id)
);

create index if not exists ratings_model_idx on public.ratings (model_id);
create index if not exists ratings_created_idx on public.ratings (created_at desc);

-- 24 ghante ka edit lock (PRD section 8)
create or replace function public.enforce_rating_edit_lock()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    if old.last_edited_at is not null and now() - old.last_edited_at < interval '24 hours' then
      raise exception 'Rating 24 ghante me ek hi baar edit ho sakti hai';
    end if;
    new.last_edited_at := now();
    new.updated_at := now();
  end if;
  return new;
end $$;

drop trigger if exists rating_edit_lock on public.ratings;
create trigger rating_edit_lock before update on public.ratings
for each row execute function public.enforce_rating_edit_lock();

-- ---------- posts ----------
create table if not exists public.posts (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  slug text not null unique,
  cover_image text default '',
  cover_emoji text default '📰',
  excerpt text default '',
  content text default '',
  type post_type not null default 'news',
  related_ai_ids uuid[] default '{}',
  status post_status not null default 'draft',
  sponsored boolean not null default false,
  author text default 'GigleNode Team',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_status_idx on public.posts (status, created_at desc);

-- ---------- bookmarks / follows ----------
create table if not exists public.bookmarks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  ai_id uuid not null references public.ai (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, ai_id)
);

create table if not exists public.follows (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  ai_id uuid not null references public.ai (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, ai_id)
);

-- ---------- prompts ----------
create table if not exists public.prompts (
  id uuid primary key default uuid_generate_v4(),
  ai_id uuid not null references public.ai (id) on delete cascade,
  title text not null,
  prompt_text text not null
);

-- ---------- rate limit (per IP, per day) ----------
create table if not exists public.rate_events (
  id bigserial primary key,
  ip text not null,
  at timestamptz not null default now()
);
create index if not exists rate_events_ip_idx on public.rate_events (ip, at desc);

-- ---------- ranking view (PRD section 9) ----------
-- Weighted Score = (V/(V+50)) * avg + (50/(V+50)) * globalAvg
-- Recency: 30 din ke andar 1.5x, 90 din tak 1.0 tak decay.
create or replace view public.model_rankings as
with weights as (
  select
    r.model_id,
    r.stars,
    case
      when now() - r.created_at <= interval '30 days' then 1.5
      when now() - r.created_at <= interval '90 days'
        then 1.5 - 0.5 * (extract(epoch from now() - r.created_at) / 86400 - 30) / 60
      else greatest(0.6, 1 - (extract(epoch from now() - r.created_at) / 86400 - 90) / 365 * 0.4)
    end as w
  from public.ratings r
),
totals as (
  select sum(w * stars) / nullif(sum(w), 0) as global_avg from weights
),
per_model as (
  select
    model_id,
    count(*) as votes,
    sum(w) as w_sum,
    sum(w * stars) as w_stars,
    count(*) filter (where now() - (select min(created_at) from public.ratings r2 where r2.model_id = weights.model_id) > interval '0') as _ignore
  from weights
  group by model_id
)
select
  pm.model_id,
  pm.votes,
  pm.w_stars / nullif(pm.w_sum, 0) as avg_rating,
  (pm.votes::numeric / (pm.votes + 50)) * (pm.w_stars / nullif(pm.w_sum, 0))
    + (50::numeric / (pm.votes + 50)) * (select global_avg from totals) as weighted_score
from per_model pm;

-- ---------- row level security ----------
alter table public.profiles enable row level security;
alter table public.ai enable row level security;
alter table public.models enable row level security;
alter table public.ratings enable row level security;
alter table public.posts enable row level security;
alter table public.bookmarks enable row level security;
alter table public.follows enable row level security;
alter table public.prompts enable row level security;
alter table public.rate_events enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

-- public read
create policy "ai public read" on public.ai for select using (true);
create policy "models public read" on public.models for select using (true);
create policy "posts published read" on public.posts for select using (status = 'published' or public.is_admin());
create policy "prompts public read" on public.prompts for select using (true);
create policy "profiles public read" on public.profiles for select using (true);
create policy "ratings public read" on public.ratings for select using (true);

-- users apna data
create policy "own profile update" on public.profiles for update using (id = auth.uid());
create policy "own ratings insert" on public.ratings for insert with check (user_id = auth.uid());
create policy "own ratings update" on public.ratings for update using (user_id = auth.uid());
create policy "own bookmarks" on public.bookmarks for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own follows" on public.follows for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- admin write (admin apni profile role change na kar sake, isliye guard app-layer me)
create policy "admin ai write" on public.ai for all using (public.is_admin()) with check (public.is_admin());
create policy "admin models write" on public.models for all using (public.is_admin()) with check (public.is_admin());
create policy "admin posts write" on public.posts for all using (public.is_admin()) with check (public.is_admin());
create policy "admin prompts write" on public.prompts for all using (public.is_admin()) with check (public.is_admin());
create policy "admin ratings delete" on public.ratings for delete using (public.is_admin() or user_id = auth.uid());

-- naya user aaye to profile auto bane
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, email, avatar)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    upper(left(coalesce(new.raw_user_meta_data ->> 'name', new.email), 1))
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------- AI search cache (app/api/search) ----------
-- The running app keeps this in its JSON/R2 document; these tables are for the
-- Supabase deployment described in the PRD.
create table if not exists public.search_cache (
  id uuid primary key default uuid_generate_v4(),
  query_text text not null,
  normalized_query text not null unique,
  category text,
  budget text,
  use_case text,
  result_json jsonb not null default '{}'::jsonb,
  search_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists search_cache_normalized_idx on public.search_cache (normalized_query);

-- One row per AI search request; ip_hash is a salted SHA-256, never the raw IP.
create table if not exists public.search_logs (
  id bigserial primary key,
  query_text text not null,
  ip_hash text not null,
  cached boolean not null default false,
  source text not null default 'fallback',
  created_at timestamptz not null default now()
);
create index if not exists search_logs_created_idx on public.search_logs (created_at desc);
create index if not exists search_logs_ip_idx on public.search_logs (ip_hash, created_at desc);

alter table public.search_cache enable row level security;
alter table public.search_logs enable row level security;

-- Only the service role (server) reads or writes these; no public policy.
create policy "admin search cache" on public.search_cache
  for all using (public.is_admin()) with check (public.is_admin());
create policy "admin search logs" on public.search_logs
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- app state document (used by lib/store.ts) ----------
-- One JSON document holds the whole site database. `version` gives compare-and-swap
-- writes so two requests cannot overwrite each other. The server uses the service
-- role key, so no public policy is created for this table.
create table if not exists public.giglenode_state (
  id text primary key,
  doc jsonb not null,
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.giglenode_state enable row level security;
revoke all on public.giglenode_state from anon, authenticated;
grant all on public.giglenode_state to service_role;

-- ---------- media storage ----------
-- Create a Storage bucket named `giglenode-media` (or set SUPABASE_STORAGE_BUCKET)
-- for owner avatars and other uploads. Keep it private: reads go through the app's
-- server routes, which use the service role key.
insert into storage.buckets (id, name, public)
values ('giglenode-media', 'giglenode-media', false)
on conflict (id) do nothing;
