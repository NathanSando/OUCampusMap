# OU Campus Navigation Map

An interactive web app that helps students navigate OU's campus — find buildings, rooms, and accessible routes, with AI-assisted navigation.

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
