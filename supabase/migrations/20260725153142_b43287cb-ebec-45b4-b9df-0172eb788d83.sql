-- Deploy latest pending migrations: spotlights, spotlight_events, spotlight_stats, WhatsApp fix, and admin RLS

-- ═════════════════════════════════════════════════════════════════════════════
-- 20260627133549: spotlights + spotlight_events + stats view
-- ═════════════════════════════════════════════════════════════════════════════

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

grant select on public.spotlights to anon, authenticated;
grant insert, update, delete on public.spotlights to authenticated;
grant all on public.spotlights to service_role;

create index if not exists spotlights_published_idx
  on public.spotlights (is_published, sort_order desc, published_at desc);

alter table public.spotlights enable row level security;

drop policy if exists "spotlights_public_read" on public.spotlights;
create policy "spotlights_public_read"
  on public.spotlights for select
  using (is_published = true);

drop policy if exists "spotlights_admin_read_all" on public.spotlights;
create policy "spotlights_admin_read_all"
  on public.spotlights for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "spotlights_admin_insert" on public.spotlights;
create policy "spotlights_admin_insert"
  on public.spotlights for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "spotlights_admin_update" on public.spotlights;
create policy "spotlights_admin_update"
  on public.spotlights for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "spotlights_admin_delete" on public.spotlights;
create policy "spotlights_admin_delete"
  on public.spotlights for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop trigger if exists spotlights_updated_at on public.spotlights;
create trigger spotlights_updated_at
  before update on public.spotlights
  for each row execute function public.update_updated_at_column();

-- Analytics events

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

grant insert on public.spotlight_events to anon, authenticated;
grant select on public.spotlight_events to authenticated;
grant all on public.spotlight_events to service_role;

create index if not exists spotlight_events_idx
  on public.spotlight_events (spotlight_id, event_type, created_at desc);

alter table public.spotlight_events enable row level security;

drop policy if exists "spotlight_events_admin_read" on public.spotlight_events;
create policy "spotlight_events_admin_read"
  on public.spotlight_events for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Aggregation view for the admin report

create or replace view public.spotlight_stats
with (security_invoker = on) as
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

grant select on public.spotlight_stats to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- 20260627143941: stricter spotlight_events anon_insert policy
-- ═════════════════════════════════════════════════════════════════════════════

drop policy if exists "spotlight_events_anon_insert" on public.spotlight_events;

create policy "spotlight_events_anon_insert"
on public.spotlight_events
for insert
to anon, authenticated
with check (
  spotlight_id IS NOT NULL
  AND event_type = ANY (ARRAY['impression','play','click_through','progress_25','progress_50','progress_75','progress_100'])
  AND surface = ANY (ARRAY['home','archive','property'])
  AND locale = ANY (ARRAY['en','ar'])
  AND (session_id IS NULL OR length(session_id) <= 128)
);

-- ═════════════════════════════════════════════════════════════════════════════
-- 20260627144843: fix WhatsApp contact number
-- ═════════════════════════════════════════════════════════════════════════════

UPDATE public.site_settings SET value = jsonb_set(value, '{whatsapp}', '"+971507089543"') WHERE key='contact';

-- ═════════════════════════════════════════════════════════════════════════════
-- 20260627144947: admin-only RLS for spotlights + events
-- ═════════════════════════════════════════════════════════════════════════════

drop policy if exists "spotlights_admin_all" on public.spotlights;
create policy "spotlights_admin_all"
  on public.spotlights for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "spotlight_events_admin_read" on public.spotlight_events;
create policy "spotlight_events_admin_read"
  on public.spotlight_events for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role));