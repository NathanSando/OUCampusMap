# OU Campus Navigation Map

A cross-platform (iOS and Android) mobile app for navigating the University of Oklahoma's Norman campus. It is built primarily for students, with visitors, parents, and campus staff as secondary audiences, and answers questions that a paper map or the official campus website can't:

- Where is this building, and how long will it take me to walk there?
- Which entrance is accessible, and does the building have a working elevator right now?
- Where is the nearest WEPA printer, or somewhere to eat?
- Is anything happening on campus right now, such as construction, closures, a broken elevator, or an event blocking a walkway?

Two things set it apart from OU's existing static map:

1. **Crowdsourced, time-limited reports.** Signed-in users can submit categorized reports (elevator outage, construction, event, hazard, closure) that appear on the map for everyone, can be upvoted or downvoted, and expire automatically.
2. **A natural-language campus assistant.** Users can ask questions in plain English and get answers grounded in the app's own live data, instead of tapping through menus.

The app covers the Norman campus only. It gives walking routes with distance and estimated walk time, but not indoor turn-by-turn navigation.

## Team — Group B

- Andy Henson
- Dorothy Yoon
- Tyler Stageberg
- Nathan Sandoval
- Will Aclin

## Course

CS-3203-001, Fall 2026

## Features

- Interactive campus map with building and room locations
- Campus/building data collection and integration
- Accessibility mapping (ramps, elevators, door buttons)
- Walking navigation with walk time calculations
- AI navigation assistant connected to the map
- Traffic/issue/event/maintenance reporting
- Staff reporting dashboard

## Tech Stack

| Layer                | Technology                                                                    |
| -------------------- | ----------------------------------------------------------------------------- |
| Mobile app           | React Native + Expo (Expo Router for file-based navigation), TypeScript       |
| Map rendering        | `react-native-maps`                                                           |
| Walking directions   | Mapbox Directions API (walking profile)                                       |
| Data fetching        | TanStack Query (React Query)                                                  |
| Database             | Supabase (PostgreSQL + PostGIS), with Row Level Security                      |
| Auth & realtime      | Supabase Auth (email + password) and Supabase Realtime for live report updates |
| Backend API          | Node.js 20+, Express, TypeScript, Zod for request validation                  |
| AI service           | Python 3.11+, FastAPI, Pydantic, OpenAI API (retrieval-augmented assistant and report classification) |
| Testing & tooling    | Jest and Testing Library (mobile), Vitest and Supertest (API), pytest (AI service), ESLint, Prettier, Ruff, Black |
| Repo structure       | npm workspaces monorepo (`apps/mobile`, `apps/api`, `apps/ai-service`, `packages/shared-types`) |

## Getting Started

```bash
git clone [repo URL]
cd campus-map
npm install
npm start
```

## Branching Strategy

We use a three-tier branching model to keep `main` stable and avoid conflicts between team members:

- **`main`** — always deployable. Only updated via merges from `dev` after review.
- **`dev`** — integration branch. All finished features get merged here first and tested together.
- **`feature/*`** — one branch per feature, created off `dev`. Examples based on our current sprint:
  - `feature/campus-data-collection`
  - `feature/map-development`
  - `feature/room-location-info`
  - `feature/accessibility-mapping`
  - `feature/walk-time-calculation`
  - `feature/ai-navigation-assistant`

### Workflow

1. Create a feature branch off `dev`:
   ```bash
   git checkout dev
   git checkout -b feature/your-feature-name
   ```
2. Commit your work in small, frequent commits while developing.
3. Before merging, **squash** your commits into one clean commit:
   ```bash
   git rebase -i HEAD~n   # n = number of commits to squash
   ```
4. **Rebase** onto the latest `dev` to avoid merge conflicts and keep history linear:
   ```bash
   git fetch origin
   git rebase origin/dev
   ```
5. Push your branch and open a Pull Request into `dev`.
6. After review/approval, **merge** into `dev`.
7. Periodically, `dev` is merged into `main` once a stable set of features is confirmed working.

### Why this workflow?

- **Branching** isolates each person's work (e.g. Andy on accessibility mapping, Will on walk time calculations) so no one breaks `main` while experimenting.
- **Squashing** keeps the commit history readable — one commit = one feature, not a dozen "wip" commits.
- **Rebasing** avoids messy merge commits and keeps a linear, easy-to-follow history.
- **Merging** (via PR) brings reviewed, working code into the shared branch safely.

## Project Structure

```
campus-map/
├── src/
├── public/
├── docs/
└── README.md
```
