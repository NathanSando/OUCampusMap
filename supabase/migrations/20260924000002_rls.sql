-- 0002 — Row Level Security on every table (design doc §6.4).
-- Reference data is public-read; all report writes go through the Node API
-- using the service role, which bypasses RLS.

alter table buildings              enable row level security;
alter table accessibility_features enable row level security;
alter table dining_locations       enable row level security;
alter table printers               enable row level security;
alter table study_spaces           enable row level security;
alter table profiles               enable row level security;
alter table reports                enable row level security;
alter table report_votes           enable row level security;
alter table schedule_entries       enable row level security;

-- Reference data: select for everyone, no writes for anon/authenticated.
create policy "Public read" on buildings              for select to anon, authenticated using (true);
create policy "Public read" on accessibility_features for select to anon, authenticated using (true);
create policy "Public read" on dining_locations       for select to anon, authenticated using (true);
create policy "Public read" on printers               for select to anon, authenticated using (true);
create policy "Public read" on study_spaces           for select to anon, authenticated using (true);

-- Reports: only active reports are visible; no direct writes.
create policy "Read active reports" on reports
  for select to anon, authenticated
  using (status = 'active');

-- Votes: a user can see and cast only their own votes.
create policy "Read own votes" on report_votes
  for select to authenticated
  using (user_id = auth.uid());
create policy "Insert own votes" on report_votes
  for insert to authenticated
  with check (user_id = auth.uid());

-- Profiles: public read, self update.
create policy "Public read" on profiles for select to anon, authenticated using (true);
create policy "Update own profile" on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Schedule (Tier 2): private to its owner.
create policy "Own schedule" on schedule_entries
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
