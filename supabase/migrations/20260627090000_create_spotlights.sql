-- ════════════════════════════════════════════════════════════════════════════
-- "Spotlight" feature — project-video showcase
-- MANUAL DEPLOY STEP: Lovable does NOT run migrations. Apply this via
--   supabase db push   (or paste into the Supabase SQL editor).
-- The frontend references these tables; events fail silently until they exist.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.spotlights (
  id              uuid primary key default gen_random_uuid(),
  title_en        text not null,
  title_ar        text not null,
  hook_en         text,
  hook_ar         text,
  video_url       text not null,
  video_provider  text not null default 'youtube'
                    check (video_provider in ('youtube','instagram','mp4')),
  thumbnail_url   text,
  property_id     uuid references public.properties(id) on delete set null,
  community_en    text,
  community_ar    text,
  sort_order      integer not null default 0,
  is_published    boolean not null default true,
  is_featured     boolean not null default false,
  published_at    timestamptz default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists spotlights_published_idx
  on public.spotlights (is_published, sort_order desc, published_at desc);

alter table public.spotlights enable row level security;

create policy "spotlights_public_read"
  on public.spotlights for select
  using (is_published = true);

create policy "spotlights_admin_all"
  on public.spotlights for all
  to authenticated
  using (true) with check (true);

-- ── Analytics events ────────────────────────────────────────────────────────
create table if not exists public.spotlight_events (
  id            bigint generated always as identity primary key,
  spotlight_id  uuid not null references public.spotlights(id) on delete cascade,
  event_type    text not null
                  check (event_type in ('impression','play','click_through',
                                        'progress_25','progress_50','progress_75','progress_100')),
  surface       text not null default 'home'
                  check (surface in ('home','archive','property')),
  locale        text not null default 'en' check (locale in ('en','ar')),
  session_id    text,
  created_at    timestamptz not null default now()
);

create index if not exists spotlight_events_idx
  on public.spotlight_events (spotlight_id, event_type, created_at desc);

alter table public.spotlight_events enable row level security;

create policy "spotlight_events_anon_insert"
  on public.spotlight_events for insert
  to anon, authenticated
  with check (true);

create policy "spotlight_events_admin_read"
  on public.spotlight_events for select
  to authenticated
  using (true);

-- Aggregation view powering the admin report.
create or replace view public.spotlight_stats as
select
  s.id,
  s.title_en,
  s.title_ar,
  count(*) filter (where e.event_type = 'impression')    as impressions,
  count(*) filter (where e.event_type = 'play')           as plays,
  count(*) filter (where e.event_type = 'click_through')  as click_throughs,
  count(*) filter (where e.event_type = 'progress_100')   as completed,
  round(
    100.0 * count(*) filter (where e.event_type = 'play')
    / nullif(count(*) filter (where e.event_type = 'impression'), 0), 1
  ) as play_rate_pct,
  count(*) filter (where e.event_type = 'play' and e.locale = 'en') as plays_en,
  count(*) filter (where e.event_type = 'play' and e.locale = 'ar') as plays_ar
from public.spotlights s
left join public.spotlight_events e on e.spotlight_id = s.id
group by s.id, s.title_en, s.title_ar;
