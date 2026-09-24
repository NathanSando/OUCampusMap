# Seed data

Everything in the database's reference tables comes from the CSVs in [`data/`](data/). Edit the
CSVs, never the generated files.

```bash
npm run seed:generate   # CSVs → seed.sql + apps/mobile/src/data/seed.generated.json
npm run db:reset        # regenerate, then rebuild the local database (migrations + seed)
```

- **`seed.sql`** is run automatically by `supabase db reset` (see `sql_paths` in
  `supabase/config.toml`). It is idempotent: every row gets a deterministic UUID (v5 of
  `<table>:<slug>`) and uses `insert … on conflict (id) do update`, so re-running never duplicates.
- **`seed.generated.json`** is bundled into the mobile app so it can run in demo mode with no
  Supabase project configured.
- The generator validates everything (campus bounds, building references, hours format, feature
  types) and refuses to write if anything is wrong. CI fails if the generated files are stale.

## CSV conventions

| Column              | Format                                                                                |
| ------------------- | ------------------------------------------------------------------------------------- |
| `slug`              | Stable, unique, kebab-case. **Never rename** — it determines the row's UUID.          |
| `aliases`           | Semicolon-separated: `Bizzell;the library;main library`                               |
| `mon` … `sun`       | `HH:MM-HH:MM`, comma-separate split shifts, `closed`, `24h`, or blank for _unknown_.  |
| `building_slug`     | Must match a `slug` in `buildings.csv`.                                               |
| `lat`/`lng`         | WGS84 decimal degrees. Printers/dining may leave blank to use their building's point. |
| `accepts_meal_plan` | `true`, `false`, or blank for unknown.                                                |

Columns not in the database schema (`source`, `location_verified_by`, `verified_on`,
`surveyed_by`, `region`) are for tracking our own data work and are ignored by the generator.

## Where the data came from

| File                         | Source                                                                                                                                                                                     | Status                                                                                                                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `buildings.csv`              | OpenStreetMap building footprints inside the OU campus boundary (way 392003756), queried via Overpass on 2026-09-24. Coordinates are footprint centroids.                                  | 89 buildings. **Every location still needs a team spot-check** (design doc §11.1) — fill in `location_verified_by` as you go.                                                                                  |
| `printers.csv`               | [OU IT WEPA page](https://itsupport.ou.edu/TDClient/30/Unified/Requests/Service/85/WEPA), checked 2026-09-24. Joined to buildings by name; kiosks are placed at their building's centroid. | 31 of 37 Norman locations. See TODOs below.                                                                                                                                                                    |
| `dining_locations.csv`       | OpenStreetMap `amenity=restaurant/cafe/fast_food` inside the campus boundary. Hours are OSM `opening_hours`.                                                                               | **Hours and meal-plan flags must be re-verified** against OU Housing & Food before the demo — OSM may be stale (e.g. Quiznos/Baja Fresh in the Union). Set `verified_on` when confirmed.                       |
| `accessibility_features.csv` | —                                                                                                                                                                                          | **Empty on purpose.** No public dataset exists; this needs the physical survey (design doc §11.2). Don't add unverified rows — the app shows "No accessibility information recorded yet" rather than guessing. |
| `study_spaces.csv`           | —                                                                                                                                                                                          | Tier 2. Empty.                                                                                                                                                                                                 |

## TODO(team)

- [ ] **Check whether OU publishes campus GIS data** (Facilities Management / ArcGIS Online) — it
      could replace the OSM coordinates and add footprints (design doc §11.1).
- [ ] Spot-check every building pin on a phone, on campus.
- [ ] Add missing buildings OSM didn't name: e.g. Holmberg Hall, Monnet Hall, Sutton Hall, Zarrow
      Hall, Rhyne Hall, Gittinger Hall, Cross Village and Adams Center.
- [ ] Fill in `abbreviation` from OU's class-schedule building codes. Only codes we're confident
      about are filled in so far; a few uncertain ones are in `aliases` instead.
- [ ] WEPA kiosks not yet mapped (no reliable coordinates yet): Airport (NC210), Disability Resource
      Center, Research Parkway (College of Business), Cross Village B, Adams Center, Couch Practice
      Center.
- [ ] Place each kiosk precisely (entrance/floor), not just at the building centroid.
- [ ] The cluster of eateries south of Couch (The Hive, Basic Knead, Credo Kitchen, …) is likely
      Cross Village — confirm and link `building_slug` once that building exists.
- [ ] Physical accessibility survey of the top 20–30 buildings; set `verified_at` per feature.
