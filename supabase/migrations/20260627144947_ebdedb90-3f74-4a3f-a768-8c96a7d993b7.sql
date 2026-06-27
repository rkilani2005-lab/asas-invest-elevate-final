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