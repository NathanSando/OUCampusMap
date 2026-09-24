-- 0004 — Profile trigger, voting, and the report expiry sweep.

-- A profiles row is created whenever someone signs up (design doc §10).
create function handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into profiles (id, display_name)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Cast (or change) a vote and recompute the tallies in one transaction.
-- Reports at net score <= -5 are auto-hidden (design doc §6.3).
-- Called only by the Node API with the service role.
create function cast_report_vote(p_report_id uuid, p_user_id uuid, p_vote smallint)
returns table (up_count int, down_count int, new_status report_status)
language plpgsql security definer
set search_path = public
as $$
declare
  v_up int;
  v_down int;
  v_status report_status;
begin
  if not exists (
    select 1 from reports r
    where r.id = p_report_id and r.status = 'active' and r.expires_at > now()
  ) then
    raise exception 'report not found' using errcode = 'P0002';
  end if;

  insert into report_votes (report_id, user_id, vote)
  values (p_report_id, p_user_id, p_vote)
  on conflict (report_id, user_id) do update set vote = excluded.vote, created_at = now();

  select count(*) filter (where v.vote = 1), count(*) filter (where v.vote = -1)
    into v_up, v_down
  from report_votes v
  where v.report_id = p_report_id;

  update reports r
     set upvotes = v_up,
         downvotes = v_down,
         status = case when v_up - v_down <= -5 then 'removed'::report_status else r.status end
   where r.id = p_report_id
  returning r.status into v_status;

  return query select v_up, v_down, v_status;
end;
$$;

revoke execute on function cast_report_vote from public, anon, authenticated;
grant execute on function cast_report_vote to service_role;

-- Realtime: broadcast report changes so maps update live (design doc §9.2).
alter publication supabase_realtime add table reports;

-- Hourly sweep so the table (and the AI service's view of it) stays honest.
-- The read-time filter in v_active_reports is what guarantees correctness.
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'expire-reports',
  '0 * * * *',
  $$update public.reports set status = 'expired' where status = 'active' and expires_at <= now()$$
);
