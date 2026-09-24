-- 0003 — Read views and spatial helper functions.
--
-- PostgREST returns geography columns as hex WKB, which is awkward on the client.
-- These views expose plain lat/lng numbers. `security_invoker = true` makes the
-- views run with the caller's permissions, so the RLS policies above still apply.

create view v_buildings with (security_invoker = true) as
  select id, name, abbreviation, aliases, description, address,
         extensions.st_y(location::extensions.geometry) as lat,
         extensions.st_x(location::extensions.geometry) as lng,
         hours, image_url
  from buildings;

create view v_accessibility_features with (security_invoker = true) as
  select id, building_id, feature_type, description, floor,
         extensions.st_y(location::extensions.geometry) as lat,
         extensions.st_x(location::extensions.geometry) as lng,
         verified_at
  from accessibility_features;

create view v_dining_locations with (security_invoker = true) as
  select id, name, building_id,
         extensions.st_y(location::extensions.geometry) as lat,
         extensions.st_x(location::extensions.geometry) as lng,
         hours, cuisine_type, accepts_meal_plan, menu_url
  from dining_locations;

create view v_printers with (security_invoker = true) as
  select id, label, building_id, floor_note,
         extensions.st_y(location::extensions.geometry) as lat,
         extensions.st_x(location::extensions.geometry) as lng,
         notes
  from printers;

-- The read-time expiry filter lives here so every client gets it (design doc §6.3).
create view v_active_reports with (security_invoker = true) as
  select id, user_id, category, title, description, building_id,
         extensions.st_y(location::extensions.geometry) as lat,
         extensions.st_x(location::extensions.geometry) as lng,
         status, upvotes, downvotes, created_at, expires_at
  from reports
  where status = 'active' and expires_at > now();

grant select on v_buildings, v_accessibility_features, v_dining_locations, v_printers, v_active_reports
  to anon, authenticated;

-- Nearest-N helpers used by the AI service's retrieval step (design doc §8.1) and by
-- the API to associate a report with the nearest building.

create function nearest_buildings(p_lat double precision, p_lng double precision,
                                  p_limit int default 5, p_max_meters double precision default 2000)
returns table (id uuid, name text, lat double precision, lng double precision, distance_m double precision)
language sql stable security invoker
set search_path = public, extensions
as $$
  select b.id, b.name, st_y(b.location::geometry), st_x(b.location::geometry),
         st_distance(b.location, st_point(p_lng, p_lat)::geography) as distance_m
  from buildings b
  where st_dwithin(b.location, st_point(p_lng, p_lat)::geography, p_max_meters)
  order by distance_m
  limit p_limit;
$$;

create function nearest_dining(p_lat double precision, p_lng double precision,
                               p_limit int default 3, p_max_meters double precision default 2000)
returns table (id uuid, name text, lat double precision, lng double precision, distance_m double precision)
language sql stable security invoker
set search_path = public, extensions
as $$
  select d.id, d.name, st_y(d.location::geometry), st_x(d.location::geometry),
         st_distance(d.location, st_point(p_lng, p_lat)::geography) as distance_m
  from dining_locations d
  where st_dwithin(d.location, st_point(p_lng, p_lat)::geography, p_max_meters)
  order by distance_m
  limit p_limit;
$$;

create function nearest_printers(p_lat double precision, p_lng double precision,
                                 p_limit int default 3, p_max_meters double precision default 2000)
returns table (id uuid, name text, lat double precision, lng double precision, distance_m double precision)
language sql stable security invoker
set search_path = public, extensions
as $$
  select p.id, p.label, st_y(p.location::geometry), st_x(p.location::geometry),
         st_distance(p.location, st_point(p_lng, p_lat)::geography) as distance_m
  from printers p
  where st_dwithin(p.location, st_point(p_lng, p_lat)::geography, p_max_meters)
  order by distance_m
  limit p_limit;
$$;

grant execute on function nearest_buildings, nearest_dining, nearest_printers to anon, authenticated;
