# Mobile app — Expo / React Native

iOS + Android from one TypeScript codebase. See the [root README](../../README.md) for setup.

```bash
npm run mobile            # from the repo root, on port 8095 — then scan the QR code with Expo Go
npm test -w apps/mobile   # Jest
```

## Layout

```
app/                  Expo Router routes (design doc §9.1)
  (tabs)/             Map · Reports · AI Guide · Profile
  building/[id].tsx   Building detail (modal)
  report/new.tsx      Create report (modal, sign-in required)
  directions.tsx      Walking route
  auth/               Sign in / sign up
src/
  components/         UI building blocks (AppText, Button, Chip, PeekSheet, map/…)
  constants/          theme.ts (design tokens), categories.ts (colors + icons), config.ts (env)
  hooks/              TanStack Query data hooks, location, layer prefs, Realtime
  lib/                supabase, api (Node API), mapbox, data (reads), geo, search
  providers/          AuthProvider
  data/               seed.generated.json — bundled data for demo mode (generated; don't edit)
```

## Rules of the road

- **Reads go straight to Supabase** (`src/lib/data.ts`) through the `v_*` views. **Writes and the
  assistant go through the Node API** (`src/lib/api.ts`). **Directions go straight to Mapbox**
  (`src/lib/mapbox.ts`). See design doc §4.
- Colors, fonts and spacing come from `src/constants/theme.ts`; category colors and icons from
  `src/constants/categories.ts`. Don't hard-code new colors in components.
- Every data-driven screen handles loading, empty and error (`src/components/StateView.tsx`).
- Icon-only buttons need an `accessibilityLabel`; tap targets are at least 44×44.
- Add native packages with `npx expo install <pkg>`, not `npm install`, so versions match the SDK.

## Demo mode

With `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` unset, the app reads the bundled
seed data, shows a "Demo mode" banner, and disables accounts and reports. Without a Mapbox token,
directions fall back to a clearly-labelled straight-line estimate.
