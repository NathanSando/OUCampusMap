# OU Interactive Campus Map — Design Document

**Course:** Software Engineering, University of Oklahoma
**Team size:** 5
**Timeline:** One semester (~14 weeks, September – early December)
**Document version:** 1.0

---

## 0. How to use this document

**For team members:** Sections 1–4 explain what we're building and why. Sections 5–12 are the technical spec. Section 13 has the phase plan. Section 15 lists decisions we deliberately deferred.

**For a Claude Code agent:** This document is the source of truth for scope and architecture. Treat Section 2 (Scope) as a hard boundary — do not implement Tier 3 items. Sections 6–10 define the schema, API surface, and screen inventory; follow them rather than inventing alternatives. When something is genuinely ambiguous, prefer the simplest implementation that satisfies the acceptance criteria in Section 14, and leave a `TODO(team):` comment rather than expanding scope.

---

## 1. Overview

An interactive mobile map of the OU Norman campus. Primary audience is **students**; secondary audiences are visitors, parents, and campus staff.

The app answers questions a paper map or the official campus website can't:

- Where is this building, and how long will it take me to walk there?
- Which entrance is accessible? Does this building have a working elevator *right now*?
- Where's the nearest WEPA printer? Where can I eat?
- Is there anything I should know about campus right now — construction, closures, a broken elevator, an event blocking a walkway?

Two things differentiate it from OU's existing static map:

1. **Crowdsourced, time-limited reports** (Waze-style) contributed by students.
2. **A natural-language assistant** that answers questions using the app's own live data instead of making the user tap through menus.

### Goals

- Ship a working, demoable mobile app by end of semester.
- Every team member has a substantial, describable contribution for their resume.
- The codebase is clean enough to show a recruiter or link on GitHub.

### Non-goals

- Production launch or real user acquisition.
- Covering the OU Health Sciences Center (OKC) or Tulsa campuses. **Norman campus only.**
- Indoor turn-by-turn navigation.
- Integration with OU's registration, ID card, or facilities systems (we will not have API access).

---

## 2. Scope

### Tier 1 — MVP (must ship)

| # | Feature | Summary |
|---|---------|---------|
| T1.1 | Interactive campus map | Pins/markers for every Norman campus building. Tap a building for details. Layer toggles for each POI category. |
| T1.2 | Walking directions | Route, distance, and estimated walking time between two points, via the Mapbox Directions API (walking profile). |
| T1.3 | Dining locations | Campus restaurants, cafes, and dining halls with hours and location. |
| T1.4 | Accessibility information | Per-building accessible entrances, ramps, elevators, accessible restrooms, automatic doors. |
| T1.5 | Crowdsourced reports | Authenticated users submit categorized, time-limited reports (elevator outage, construction, event, hazard, closure). Reports appear on the map, can be upvoted/downvoted, and auto-expire. |
| T1.6 | Printer locations | WEPA kiosk locations, sourced from OU IT (see Section 11.3). |
| T1.7 | AI campus assistant | Chat interface that answers natural-language questions using the app's own data (RAG). |
| T1.8 | Accounts | Open signup with email + password via Supabase Auth. Required only for submitting/voting on reports. |

### Tier 2 — Should have (build only after all of Tier 1 is done and stable)

| # | Feature | Summary |
|---|---------|---------|
| T2.1 | Class schedule | User manually enters course entries (course, building, room, days, times). Map highlights today's buildings; app shows "next class" and walking time to it. |
| T2.2 | Study spaces | Which buildings have study rooms, with hours and a link to the booking page if one exists. Static data only — no live availability. |

### Tier 3 — Explicitly out of scope

Listed so nobody quietly starts building them. Mention as "future work" in the final report if useful.

- Push notifications
- Live study-room availability via a library API
- Live WEPA kiosk status (no public API — the status map is internal to WEPA)
- Report moderation dashboard, user reputation/trust scores
- Campus traffic or crowding heat-maps
- Multi-floor indoor navigation
- Automatic import from OU's registration system
- Offline map tile caching

---

## 3. Users and key use cases

| User | Representative need |
|------|--------------------|
| Student (primary) | "I have 12 minutes between classes — can I make it from Devon to Gaylord, and is there a printer on the way?" |
| Student with a mobility disability | "Which entrance to this building is accessible, and is the elevator working today?" |
| Visitor / parent | "Where do I park, where's the building for my tour, and where can we eat?" |
| Campus staff | "Report that the elevator in my building is out so people stop walking to it." |

### Primary user flows

1. **Find a place** → open map → search or browse by layer → tap marker → building detail → "Directions" → walking route with time/distance.
2. **Report an issue** → tap report FAB → pick category → confirm location (defaults to GPS position) → add short description → submit → report appears on the map for everyone.
3. **Ask the assistant** → open chat tab → type a question in plain English → get an answer grounded in app data, with tappable place references that jump to the map.

---

## 4. Architecture

```
┌─────────────────────────────────────────┐
│   Mobile app — React Native + Expo      │
│   (iOS + Android, single codebase)      │
└───────┬──────────────┬──────────┬───────┘
        │              │          │
        │ supabase-js  │ REST     │ HTTPS
        │ (reads,      │ (writes, │ (routing)
        │  auth,       │  AI)     │
        │  realtime)   │          │
        ▼              ▼          ▼
┌──────────────┐  ┌──────────┐  ┌──────────────┐
│  Supabase    │  │ Node API │  │ Mapbox       │
│  Postgres    │◄─┤ Express  │  │ Directions   │
│  + PostGIS   │  │ TypeScript│ │ API          │
│  + Auth      │  └────┬─────┘  └──────────────┘
│  + Realtime  │       │
│  + Storage   │◄──────┼───────┐
└──────────────┘       │       │
                       ▼       │
              ┌─────────────────┴──┐
              │ AI service         │
              │ Python + FastAPI   │──► OpenAI API
              └────────────────────┘
```

### Boundary rules

These rules keep the three services from bleeding into each other. Follow them.

**Mobile app talks directly to Supabase for:**
- All reads of reference data (buildings, dining, printers, accessibility, study spaces)
- Auth (signup, login, session, logout)
- Realtime subscription to the `reports` table

Reads are safe to do client-side because Row Level Security (Section 6.4) makes reference data public-read and nothing else readable without a session. This avoids writing dozens of pass-through REST endpoints.

**Mobile app talks to the Node API for:**
- Creating and voting on reports (needs server-side validation, rate limiting, and AI spam classification)
- Anything touching the AI assistant

**Mobile app talks to Mapbox directly** using a **public, URL-restricted token** (`pk.*`). Mapbox public tokens are designed for client use; do not proxy routing through the Node API — it adds latency and a failure point for no security benefit. Do not put a secret token (`sk.*`) in the app.

**Node API talks to the AI service.** The mobile app never calls the AI service directly. This keeps the OpenAI key server-side and gives us one place to add rate limiting.

**The AI service reads from Supabase directly** using the service role key, for retrieval context. It does not write.

### Why this shape

- The AI service sits *beside* the Node API rather than behind it in the request chain, so whoever owns the Python work can develop and test independently.
- Supabase absorbs auth, realtime, and storage, which would otherwise be three separate build efforts.
- Nothing here requires managing a server, a message queue, or a container orchestrator.

---

## 5. Tech stack and repo structure

### 5.1 Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Mobile | React Native + **Expo** (SDK 51+), TypeScript | Managed workflow. Use Expo Go for development, EAS Build for demo builds. |
| Navigation | Expo Router | File-based routing. |
| Map rendering | `react-native-maps` | Google Maps provider on Android, Apple Maps on iOS by default. |
| Routing/directions | **Mapbox Directions API**, `walking` profile | Free tier is ~100k requests/month — far beyond our needs. |
| Geocoding (dev only) | Mapbox Geocoding API | For one-time data seeding, not runtime. |
| State/data fetching | TanStack Query (React Query) | Caching + loading/error states for free. |
| Database | **Supabase** — Postgres 15 + **PostGIS** | Free tier. PostGIS gives us real distance/radius queries. |
| Auth | Supabase Auth (email + password) | Open signup, any email address. |
| Realtime | Supabase Realtime | Live report updates on the map. |
| Backend API | Node.js 20 + Express + TypeScript | Thin. Zod for request validation. |
| AI service | Python 3.11 + FastAPI + Pydantic | Uvicorn. |
| LLM | OpenAI API (`gpt-4o-mini` for routine calls) | Only paid component. Use `gpt-4o` only if quality demands it. |
| Hosting (API + AI) | Render or Railway, free tier | Free tiers sleep when idle; first request after idle is slow. Acceptable for a demo — mention it in the presentation. |
| Version control | GitHub, single monorepo | |
| CI | GitHub Actions | Lint + typecheck + tests on PR. |

### 5.2 Monorepo layout

```
ou-campus-map/
├── README.md
├── docs/
│   └── design-doc.md                 # this file
├── apps/
│   ├── mobile/                       # Expo React Native app
│   │   ├── app/                      # Expo Router routes
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── lib/                  # supabase client, mapbox client
│   │   │   ├── types/
│   │   │   └── constants/
│   │   ├── app.json
│   │   └── package.json
│   ├── api/                          # Node + Express + TS
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   ├── services/
│   │   │   ├── schemas/              # Zod schemas
│   │   │   └── index.ts
│   │   └── package.json
│   └── ai-service/                   # Python + FastAPI
│       ├── app/
│       │   ├── main.py
│       │   ├── retrieval.py
│       │   ├── prompts.py
│       │   ├── classify.py
│       │   └── models.py
│       ├── requirements.txt
│       └── pyproject.toml
├── packages/
│   └── shared-types/                 # TS types shared by mobile + api
├── supabase/
│   ├── migrations/                   # numbered .sql migration files
│   └── seed/                         # seed data scripts + CSVs
└── .github/workflows/ci.yml
```

Use **npm workspaces** for the two TypeScript apps and `packages/shared-types`. The Python service is not part of the npm workspace — it manages its own dependencies via `requirements.txt`.

### 5.3 Environment variables

Every service gets a committed `.env.example`. Never commit real `.env` files.

**`apps/mobile/.env`**
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN=   # pk.* token, URL-restricted
EXPO_PUBLIC_API_BASE_URL=
```

**`apps/api/.env`**
```
PORT=3000
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
AI_SERVICE_URL=
AI_SERVICE_SHARED_SECRET=
```

**`apps/ai-service/.env`**
```
OPENAI_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
AI_SERVICE_SHARED_SECRET=
OPENAI_MODEL=gpt-4o-mini
```

> **Security note for the whole team:** the `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security entirely. It belongs only in the Node API and AI service. It must never appear in the mobile app, in a `EXPO_PUBLIC_*` variable, or in a commit.

---

## 6. Data model

Postgres with the PostGIS extension enabled. All coordinates are `geography(Point, 4326)` (WGS84), which lets PostGIS compute real-world distances in meters.

### 6.1 Enums

```sql
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
```

### 6.2 Tables

```sql
-- Reference data ------------------------------------------------------------

create table buildings (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  abbreviation  text,                        -- e.g. 'SEC', 'DEH'
  aliases       text[] default '{}',         -- nicknames for search + AI retrieval
  description   text,
  address       text,
  location      geography(Point, 4326) not null,
  footprint     geography(Polygon, 4326),    -- optional; only if we get GIS data
  hours         jsonb,                       -- { "mon": "7:00-22:00", ... }
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
  location     geography(Point, 4326),        -- null = applies to whole building
  verified_at  date,                          -- when a team member confirmed it
  created_at   timestamptz not null default now()
);
create index accessibility_building_idx on accessibility_features (building_id);

create table dining_locations (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  building_id        uuid references buildings(id) on delete set null,
  location           geography(Point, 4326) not null,
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
  location     geography(Point, 4326) not null,
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

-- User data -----------------------------------------------------------------

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
  location     geography(Point, 4326) not null,
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
```

### 6.3 Report expiration

Default TTLs by category, applied when a report is created:

| Category | Default TTL |
|----------|-------------|
| `elevator_outage` | 24 hours |
| `construction` | 7 days |
| `event` | 12 hours |
| `hazard` | 12 hours |
| `closure` | 24 hours |
| `other` | 12 hours |

Two mechanisms, both cheap:

1. **Read-time filter.** All report queries filter `status = 'active' and expires_at > now()`. This is the one that actually matters for correctness.
2. **Sweep job.** A Supabase scheduled function (pg_cron) runs hourly: `update reports set status = 'expired' where status = 'active' and expires_at <= now();` Keeps the table tidy and makes the data honest for the AI service.

Reports with a net score of −5 or worse are auto-hidden by setting `status = 'removed'`. This is our entire moderation system — deliberately.

### 6.4 Row Level Security

RLS is **enabled on every table**. Without this, the mobile app's direct-to-Supabase reads would be a security hole.

| Table | Policy |
|-------|--------|
| `buildings`, `accessibility_features`, `dining_locations`, `printers`, `study_spaces` | `select` allowed to `anon` and `authenticated`. No insert/update/delete for either role — reference data changes via migrations or the service role only. |
| `reports` | `select` allowed to `anon` and `authenticated` where `status = 'active'`. `insert`/`update`/`delete` blocked for both — all writes go through the Node API using the service role. |
| `report_votes` | `select` and `insert` for `authenticated` where `user_id = auth.uid()`. |
| `profiles` | `select` for all; `update` only where `id = auth.uid()`. |
| `schedule_entries` | Full CRUD for `authenticated` where `user_id = auth.uid()`. Never readable by anyone else. |

---

## 7. Node API

Base URL: `${API_BASE_URL}/api`. All responses JSON. Auth via `Authorization: Bearer <supabase_access_token>`; the API verifies the JWT against Supabase and extracts `user_id`.

### 7.1 Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/reports` | Required | Create a report. Validates payload, runs AI spam/category check, computes `expires_at`, inserts via service role. |
| `POST` | `/reports/:id/vote` | Required | Body `{ "vote": 1 \| -1 }`. Upserts into `report_votes`, recomputes `upvotes`/`downvotes`, auto-hides at net ≤ −5. |
| `DELETE` | `/reports/:id` | Required | Soft-delete (`status = 'removed'`). Only the report's author. |
| `POST` | `/assistant/chat` | Optional | Proxies to the AI service. See 7.2. |
| `GET` | `/health` | None | Returns `{ status, uptime, aiService: 'up' \| 'down' }`. Also used to keep the free-tier instance warm. |

Everything else — listing buildings, dining, printers, accessibility, reports — is a **direct Supabase query from the mobile app**. Do not build REST endpoints for reads.

### 7.2 `POST /assistant/chat`

Request:
```json
{
  "message": "where's the closest printer to Gaylord?",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "userLocation": { "lat": 35.2058, "lng": -97.4457 }
}
```

Response:
```json
{
  "reply": "The nearest WEPA kiosk to Gaylord Hall is in Copeland Hall, about a 3 minute walk...",
  "referencedPlaces": [
    { "type": "printer", "id": "uuid", "name": "Copeland Hall", "lat": 35.2, "lng": -97.4 }
  ]
}
```

`referencedPlaces` drives the tappable chips under each assistant message that recenter the map.

### 7.3 Rate limiting

Use `express-rate-limit` with an in-memory store (a single instance — no Redis needed).

| Endpoint | Limit |
|----------|-------|
| `POST /reports` | 5 per user per hour |
| `POST /reports/:id/vote` | 60 per user per hour |
| `POST /assistant/chat` | 20 per user per hour, 60 per IP per hour |

The assistant limit exists to protect the OpenAI bill. Return `429` with a clear message the app can display.

### 7.4 Error format

Every error response uses the same shape:
```json
{ "error": { "code": "RATE_LIMITED", "message": "Human-readable explanation." } }
```

Codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `RATE_LIMITED`, `AI_UNAVAILABLE`, `INTERNAL_ERROR`.

---

## 8. AI service

Python + FastAPI. Two endpoints. Authenticated by a shared secret header (`X-Service-Secret`) — this service is never exposed to the public app.

### 8.1 `POST /chat` — campus assistant (RAG)

The pattern is retrieve → assemble context → call the model → return.

**Step 1: Retrieve.** Given the user's message, pull candidate records from Postgres:

- Keyword match against `buildings.name`, `buildings.abbreviation`, `buildings.aliases`
- Category detection: words like "printer", "print", "wepa" → query `printers`; "eat", "food", "hungry", "dining" → `dining_locations`; "ramp", "wheelchair", "accessible", "elevator" → `accessibility_features`
- If `userLocation` is present, always include the 5 nearest buildings, 3 nearest dining locations, and 3 nearest printers via PostGIS `ST_DWithin` / `ST_Distance`
- Always include all currently active reports (there won't be many)

Cap the retrieved set at roughly 40 records to keep the prompt small.

**Step 2: Assemble.** Serialize retrieved records into a compact text block. Include the current date/time so the model can reason about hours.

**Step 3: Call OpenAI** with a system prompt along these lines:

> You are a campus assistant for the University of Oklahoma's Norman campus. Answer using only the campus data provided below. If the data doesn't contain the answer, say so plainly and suggest what the user could check instead — never guess at a building, room, or set of hours. Keep answers to a few sentences. When you mention a specific place, use its exact name as it appears in the data. Today is {datetime}.

**Step 4: Extract `referencedPlaces`** by matching the exact names appearing in the model's reply back against the retrieved record set. Do not ask the model to emit JSON for this — name-matching against records we already have is more reliable.

**Grounding is the requirement that matters.** A campus assistant that invents a building or makes up dining hours is worse than no assistant. The system prompt must forbid it, and the retrieval step must supply enough context that it doesn't need to.

### 8.2 `POST /classify-report`

Called by the Node API when a report is submitted.

Request: `{ "title": "...", "description": "...", "userCategory": "elevator_outage" }`

Response:
```json
{
  "suggestedCategory": "elevator_outage",
  "isSpam": false,
  "confidence": 0.93,
  "reason": "Describes a specific out-of-service elevator."
}
```

Behavior in the Node API:
- `isSpam = true` with confidence > 0.8 → reject with a `VALIDATION_ERROR`
- `suggestedCategory` differs from `userCategory` with confidence > 0.8 → accept the report but store the suggested category
- AI service unreachable or times out (2s) → **accept the report anyway** with the user's category. The assistant is an enhancement; it must never block core functionality.

### 8.3 Optional: pgvector

If Tier 1 lands early and you want the stronger resume line, add semantic retrieval:

1. Enable the `vector` extension in Supabase.
2. Add `embedding vector(1536)` to `buildings`, `dining_locations`, and `study_spaces`.
3. At seed time, embed a text summary of each record with OpenAI `text-embedding-3-small`.
4. At query time, embed the user's message and retrieve by cosine similarity, combined with the keyword results above.

**Do this only after Tier 1 is complete.** Keyword retrieval over a few hundred records works fine; this is a resume enhancement, not a functional requirement.

### 8.4 Cost control

- Default to `gpt-4o-mini`.
- Cap `max_tokens` at 400 for chat, 100 for classification.
- Truncate conversation history to the last 6 messages.
- Log token usage per request so we can watch the bill.

Realistic estimate: with `gpt-4o-mini` and 5 developers testing, expect a few dollars for the entire semester. Set a hard spend limit in the OpenAI dashboard anyway.

---

## 9. Mobile app

### 9.1 Navigation

Bottom tab navigator with four tabs:

```
app/
├── (tabs)/
│   ├── index.tsx          # Map (default)
│   ├── reports.tsx        # Report feed
│   ├── assistant.tsx      # AI chat
│   └── profile.tsx        # Account / settings / schedule (T2)
├── building/[id].tsx      # Building detail (modal sheet)
├── report/new.tsx         # Create report (modal)
├── directions.tsx         # Route detail
└── auth/
    ├── sign-in.tsx
    └── sign-up.tsx
```

### 9.2 Screens

**Map (home)**
- Full-screen `react-native-maps` centered on Norman campus, with sensible bounds so users can't scroll to Kansas.
- Layer toggle control (a chip row or a bottom-sheet panel): Buildings, Dining, Printers, Accessibility, Reports. Persist selections locally with AsyncStorage.
- Search bar overlay, matching on building name, abbreviation, and aliases.
- "Locate me" button.
- Floating action button → create report.
- Tapping a marker opens a peek sheet; expanding it opens the building detail.
- Subscribe to the `reports` table via Supabase Realtime so new reports appear without a refresh.

**Building detail**
- Name, abbreviation, photo, address, hours.
- Accessibility section: list of features with type icons and descriptions. If there are none recorded, say "No accessibility information recorded yet" — never render an empty section that implies the building has no features.
- Amenities: printers in this building, dining in/near it, study spaces (T2).
- Active reports for this building.
- "Directions" button.

**Directions**
- From (defaults to current location) / To.
- Calls Mapbox Directions with `profile=walking`.
- Displays route polyline on the map, plus total distance and estimated time.
- Note if any active report intersects the route — a nice touch that shows the features working together.

**Report feed**
- Chronological list of active reports, newest first.
- Filter chips by category.
- Each row: category icon, title, building/location, relative time, vote count, up/down buttons.
- Pull to refresh; also live via Realtime.

**Create report**
- Category picker (large tappable tiles, not a dropdown).
- Location: defaults to the user's GPS position, draggable pin to adjust, with automatic nearest-building association.
- Title (required) and description (optional).
- Shows the computed expiration ("This will disappear in 24 hours") so expectations are set.
- Requires sign-in; if signed out, route to sign-in and return here afterward.

**Assistant**
- Standard chat UI: message list, input box, send button.
- Typing indicator while awaiting a response.
- Suggested prompt chips on the empty state ("Where can I eat right now?", "Nearest printer to me", "Accessible entrance to Bizzell").
- Tappable place chips under assistant messages that recenter the map on that location.
- Clear error state when the AI service is unavailable — the rest of the app must still work.

**Profile**
- Signed out: sign in / sign up prompt, with a note that browsing works without an account.
- Signed in: display name, my reports, sign out.
- T2: schedule management (add/edit/delete course entries, "next class" card).

### 9.3 UI conventions

- Handle three states on every data-driven screen: **loading**, **empty**, **error**. TanStack Query makes this straightforward; there is no excuse for a blank screen.
- Category colors and icons are defined once in `src/constants/categories.ts` and used everywhere.
- OU crimson (`#841617`) as the accent color, used sparingly.
- Accessibility of our own app matters given the subject: every icon-only button gets an `accessibilityLabel`, tap targets are at least 44×44pt, and text contrast meets WCAG AA. Test with VoiceOver or TalkBack at least once before the demo.
- Request location permission with a clear rationale string, and degrade gracefully if it's denied — the map still works, "locate me" and distance-sorting don't.

---

## 10. Authentication

Supabase Auth, email + password, **open signup with any email address**.

- Browsing (map, buildings, dining, printers, accessibility, viewing reports, using the assistant) works **signed out**.
- Signing in is required only to submit reports, vote, and use the schedule (T2).
- A row in `profiles` is created via a Postgres trigger on `auth.users` insert.
- Store the session with Expo SecureStore; `supabase-js` handles refresh.
- Disable email confirmation in the Supabase dashboard for development so the team isn't blocked; decide before the demo whether to turn it on.

---

## 11. Data sourcing

This is the most underestimated work in the project. It is manual, it is not glamorous, and it must start in week 2 — not week 8.

### 11.1 Buildings

**First**, check whether OU publishes campus GIS data (Facilities Management, an ArcGIS Online organization, or the campus map's own tile/data endpoints). Many universities do, and it would save days of manual work by giving us names, coordinates, and possibly footprints in one file. **Assign this investigation in week 1.**

If nothing usable exists, fall back to:
1. Compile a building list from OU's official campus map and directory.
2. Batch-geocode the names with the Mapbox Geocoding API in a seeding script.
3. Manually spot-check and correct every result — geocoders are unreliable on campus building names, and a pin in the wrong place is a bug users will notice immediately.

Target roughly 80–120 buildings. Record `abbreviation` and `aliases` generously ("Bizzell", "the library", "Bizzell Memorial Library" should all resolve) — search quality and AI retrieval quality both depend on it.

### 11.2 Accessibility features

No public dataset will cover this. Plan on a combination of:
- OU's ADA/accessibility office resources and any published accessible-route maps
- Building-level information from the Disability Resource Center
- **Physical survey** — split the highest-traffic 20–30 buildings among the team and walk them, recording accessible entrances and elevator locations

Set `verified_at` when a team member confirms a feature in person. Be honest in the UI about what's verified and what isn't; do not present unverified data as authoritative. This is the feature where being wrong has real consequences for a real user.

### 11.3 Printers (WEPA kiosks)

OU IT publishes kiosk locations at `https://itsupport.ou.edu/TDClient/30/Unified/Requests/Service/85/WEPA`. The page lists locations by **building name only** — no coordinates and no API — so each entry needs to be joined to a `buildings` row and geocoded manually. Some entries include a floor note worth preserving (`Bizzell Library – LL1, Main Floor`, `Union – Computer Lab`, `Memorial Stadium – Lab`).

The Norman campus locations, as published, group into:

- **North:** Airport (NC210), Bizzell Library, Buchanan Hall, Carson Engineering Center, Catlett Music Center, Devon Hall, Disability Resource Center, Felgar Hall, Fred Jones Center, Gallogly Hall, Physical Sciences Center, Rawl Engineering Practice Facility, Research Parkway (College of Business), Sarkeys Energy Center, Union, Wagner Hall
- **South:** Coats Hall (Law Library), Collings Hall, Copeland Hall, Cross Village B, Dale Hall, Gould Hall, Farzaneh Hall, Kaufman Hall, Innovation Hub, Memorial Stadium
- **Residence halls:** Adams Center, Boren Hall, Couch Practice Center, Dunham College, Headington College, Headington Hall, Walker Center, S.J. Sarkeys Complex, Traditions Square East Clubhouse, Traditions Square West Clubhouse, OCCCE Forum

Ignore the Oklahoma City locations — out of scope.

Note in `printers.notes` that tabloid printing is only available in Gould Hall B15, since that's the kind of detail the assistant can surface usefully. **Re-check the page before seeding** — locations change between semesters.

### 11.4 Dining

Source from OU's dining services site: name, building or location, hours, whether meal plans are accepted, and a menu link where available. Hours change by semester and by location (some close early on Fridays); store them as structured JSON rather than a free-text string so the assistant can reason about "what's open right now."

### 11.5 Seeding

All seed data lives in `supabase/seed/` as CSVs plus a Node or Python script that loads them. Seeding must be **idempotent** — re-runnable without creating duplicates. Every team member should be able to reset their local database with one command.

---

## 12. Testing and quality

Not a testing-heavy project, but a demo that crashes is a bad grade. Minimum bar:

- **API:** unit tests on validation schemas and the report expiration logic; integration tests for `POST /reports` and voting against a test Supabase project. Use Vitest or Jest + Supertest.
- **AI service:** unit tests for retrieval (given a query, are the right records selected?) and for classification response parsing. Mock the OpenAI call — do not hit the real API in tests.
- **Mobile:** at minimum, smoke tests that each screen renders. Full component testing is optional given the timeline.
- **CI:** GitHub Actions running lint, typecheck, and tests on every PR to `main`.

Conventions:
- ESLint + Prettier for TS; `ruff` + `black` for Python. Enforced in CI.
- Branch protection on `main`: no direct pushes, one approving review per PR.
- Conventional commit prefixes (`feat:`, `fix:`, `chore:`).
- PRs stay small enough that a teammate can actually review them.

---

## 13. Phases and milestones

Rough phases, not a week-by-week schedule. The ordering matters more than the dates.

### Phase 0 — Foundation
Repo scaffolded (all three apps), Supabase project created with PostGIS enabled, initial migration applied, Expo app running on every team member's device, CI green, `.env.example` files committed. **Investigate OU GIS data availability.**

**Exit criteria:** every team member can run all three services locally and see a map on their phone.

### Phase 1 — Map and reference data
Building data seeded and verified. Map renders markers. Layer toggles work. Search works. Building detail screen complete. Dining, printers, and accessibility data seeded and displayed. Mapbox walking directions working end to end.

**Exit criteria:** T1.1, T1.2, T1.3, T1.4, T1.6 are demoable. **This is the single most important milestone — if this slips, cut Tier 2 immediately rather than compressing later phases.**

### Phase 2 — Accounts and reporting
Supabase Auth wired up. Sign-up/sign-in screens. Report creation, voting, feed, expiration sweep, and Realtime updates on the map.

**Exit criteria:** T1.5 and T1.8 complete. Two team members on two phones can see each other's reports appear live.

### Phase 3 — AI assistant
FastAPI service deployed. Retrieval implemented. Chat endpoint working through the Node API. Chat UI in the app with place chips. Report classification wired into report creation with graceful degradation.

**Exit criteria:** T1.7 complete. **Tier 1 is now finished — this is the point where the project is presentable even if nothing else lands.**

### Phase 4 — Tier 2, if and only if Tier 1 is stable
Schedule entry and "next class." Study spaces. Optionally pgvector retrieval.

### Phase 5 — Polish, documentation, demo
Empty/error/loading states everywhere. Accessibility pass on our own UI. README with setup instructions and screenshots. Architecture diagram. Rehearsed demo script. **Record a video of the demo working** — do not stake your grade on live network conditions in a classroom.

### Risk notes

- **Data collection is the top schedule risk.** It's tedious, easy to defer, and blocks Phase 1's exit criteria. Start it in Phase 0 and treat it as real work.
- **Free-tier cold starts.** Render/Railway free instances sleep. Hit `/health` a few minutes before demoing, or use a free uptime pinger.
- **Scope creep via "it'd be cool if…"** Tier 3 exists to give those ideas a home that isn't the codebase.

---

## 14. Definition of done (Tier 1)

The project ships when all of the following are true on a physical device:

1. The map loads with all Norman campus buildings, and every marker is in the correct location.
2. Layer toggles show and hide dining, printers, accessibility features, and reports.
3. Searching a building by name, abbreviation, or common nickname finds it.
4. Tapping any building shows its details, including accessibility features where recorded.
5. Requesting directions between two campus points returns a walking route with distance and time.
6. A signed-in user can submit a report; it appears on another device's map within seconds.
7. Reports expire on schedule and disappear from the map.
8. The assistant answers at least these correctly and without inventing anything: nearest printer, where to eat, accessible entrance to a named building, and a question whose answer is not in our data (it should say so).
9. No screen shows a raw error or an infinite spinner when a service is down.
10. A teammate can clone the repo and run everything locally using only the README.

---

## 15. Deferred decisions

Recorded so they don't get silently re-litigated.

| Decision | Status |
|----------|--------|
| Work breakdown across the 5 team members | Deferred — team will decide separately |
| Email confirmation on signup | Off for development; decide before demo |
| pgvector semantic retrieval | Optional stretch, only after Tier 1 |
| Building footprint polygons vs. point markers | Points for now; polygons only if OU GIS data provides them |
| App name and branding | Not decided |
| Whether to publish to TestFlight / Play Internal Testing | Not required; EAS Build artifacts are sufficient for the demo |

---

## Appendix A — Reference links

- Expo: https://docs.expo.dev
- react-native-maps: https://github.com/react-native-maps/react-native-maps
- Mapbox Directions API: https://docs.mapbox.com/api/navigation/directions/
- Supabase: https://supabase.com/docs
- PostGIS: https://postgis.net/documentation/
- OpenAI API: https://platform.openai.com/docs
- OU WEPA kiosk locations: https://itsupport.ou.edu/TDClient/30/Unified/Requests/Service/85/WEPA
