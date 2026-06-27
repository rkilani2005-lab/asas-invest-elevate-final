-- ════════════════════════════════════════════════════════════════════════════
-- SECURITY FIX — Spotlight RLS privilege escalation
-- MANUAL DEPLOY STEP: Lovable does NOT run migrations. Apply via
--   supabase db push   (or paste into the Supabase SQL editor).
--
-- The original create_spotlights migration granted ALL writes on
-- public.spotlights and read on public.spotlight_events to any "authenticated"
-- role (using/with check = true). Because the Supabase signup endpoint is
-- reachable with the public anon key, anyone could mint an authenticated JWT
-- and then insert/update/delete spotlights (rendered on the public homepage)
-- or read all analytics. This re-scopes both policies to admins only, matching
-- every other admin table in the project (has_role(auth.uid(),'admin')).
-- Idempotent: safe whether or not the weak policies were already applied.
-- ════════════════════════════════════════════════════════════════════════════

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
