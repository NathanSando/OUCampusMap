-- 0001 — Extensions, enums and tables (design doc §6.1–6.2).
-- All coordinates are geography(Point, 4326) so PostGIS distances are in meters.

create extension if not exists postgis with schema extensions;

-- Enums ----------------------------------------------------------------------

create type report_category as enum (
  'elevator_outage',
  'construction',
  'event',
  'hazard',
  'closure',
  'other'
);

create type accessibility_feature_type as enum (
  'accessible_entrance',
  'ramp',
  'elevator',
  'accessible_restroom',
  'automatic_door',
  'braille_signage'
);

create type report_status as enum ('active', 'expired', 'removed');

-- Reference data -------------------------------------------------------------

create table buildings (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  abbreviation  text,                        -- e.g. 'SEC', 'DEH'
  aliases       text[] default '{}',         -- nicknames for search + AI retrieval
  description   text,
  address       text,
  location      extensions.geography(Point, 4326) not null,
  footprint     extensions.geography(Polygon, 4326),    -- optional; only if we get GIS data
  hours         jsonb,                       -- { "mon": "07:00-22:00", ... }
  image_url     text,
  created_at    timestamptz not null default now()
);
create index buildings_location_idx on buildings using gist (location);

create table accessibility_features (
  id           uuid primary key default gen_random_uuid(),
  building_id  uuid not null references buildings(id) on delete cascade,
  feature_type accessibility_feature_type not null,
  description  text,                          -- 'North entrance, ramp from Elm Ave'
  floor        text,
  location     extensions.geography(Point, 4326),        -- null = applies to whole building
  verified_at  date,                          -- when a team member confirmed it
  created_at   timestamptz not null default now()
);
create index accessibility_building_idx on accessibility_features (building_id);

create table dining_locations (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  building_id        uuid references buildings(id) on delete set null,
  location           extensions.geography(Point, 4326) not null,
  hours              jsonb,
  cuisine_type       text,
  accepts_meal_plan  boolean default false,
  menu_url           text,
  created_at         timestamptz not null default now()
);
create index dining_location_idx on dining_locations using gist (location);

create table printers (
  id           uuid primary key default gen_random_uuid(),
  label        text not null,                 -- 'Bizzell Library — Main Floor'
  building_id  uuid references buildings(id) on delete set null,
  floor_note   text,                          -- 'LL1', 'Main Lobby', 'B15'
  location     extensions.geography(Point, 4326) not null,
  notes        text,                          -- 'Tabloid printing available'
  created_at   timestamptz not null default now()
);
create index printers_location_idx on printers using gist (location);

-- Tier 2
create table study_spaces (
  id           uuid primary key default gen_random_uuid(),
  building_id  uuid not null references buildings(id) on delete cascade,
  name         text not null,
  room         text,
  capacity     int,
  reservable   boolean default false,
  booking_url  text,
  hours        jsonb,
  created_at   timestamptz not null default now()
);

-- User data ------------------------------------------------------------------

create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

create table reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  category     report_category not null,
  title        text not null check (char_length(title) between 3 and 100),
  description  text check (char_length(description) <= 500),
  building_id  uuid references buildings(id) on delete set null,
  location     extensions.geography(Point, 4326) not null,
  status       report_status not null default 'active',
  upvotes      int not null default 0,
  downvotes    int not null default 0,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null
);
create index reports_location_idx on reports using gist (location);
create index reports_active_idx on reports (status, expires_at);

create table report_votes (
  id         uuid primary key default gen_random_uuid(),
  report_id  uuid not null references reports(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  vote       smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  unique (report_id, user_id)
);

-- Tier 2
create table schedule_entries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  course_code   text not null,                -- 'CS 2413'
  course_title  text,
  building_id   uuid references buildings(id) on delete set null,
  room          text,
  days_of_week  smallint[] not null,          -- 0=Sun … 6=Sat
  start_time    time not null,
  end_time      time not null,
  term          text,                         -- 'Fall 2026'
  created_at    timestamptz not null default now()
);
create index schedule_user_idx on schedule_entries (user_id);
