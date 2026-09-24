---
name: Sooner Wayfinding & Campus Mobility
colors:
  surface: '#1A1D1F'
  surface-dim: '#121416'
  surface-bright: '#38393c'
  surface-container-lowest: '#0c0e10'
  surface-container-low: '#1a1c1e'
  surface-container: '#1e2022'
  surface-container-high: '#282a2c'
  surface-container-highest: '#333537'
  on-surface: '#e2e2e5'
  on-surface-variant: '#e4bdbc'
  inverse-surface: '#e2e2e5'
  inverse-on-surface: '#2f3133'
  outline: '#ab8887'
  outline-variant: '#5b403f'
  surface-tint: '#ffb3b1'
  primary: '#ffb3b1'
  on-primary: '#680012'
  primary-container: '#d6293c'
  on-primary-container: '#fff2f1'
  inverse-primary: '#bc102d'
  secondary: '#ffb3ac'
  on-secondary: '#680008'
  secondary-container: '#8d1d1d'
  on-secondary-container: '#ff9e96'
  tertiary: '#cfc6b3'
  on-tertiary: '#353023'
  tertiary-container: '#777060'
  on-tertiary-container: '#fff5e1'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad8'
  primary-fixed-dim: '#ffb3b1'
  on-primary-fixed: '#410008'
  on-primary-fixed-variant: '#92001e'
  secondary-fixed: '#ffdad6'
  secondary-fixed-dim: '#ffb3ac'
  on-secondary-fixed: '#410003'
  on-secondary-fixed-variant: '#8a1b1b'
  tertiary-fixed: '#ebe2ce'
  tertiary-fixed-dim: '#cfc6b3'
  on-tertiary-fixed: '#201b0f'
  on-tertiary-fixed-variant: '#4c4638'
  background: '#121416'
  on-background: '#e2e2e5'
  surface-variant: '#333537'
  surface-elevated: '#242729'
  border: '#2E3234'
  text-primary: '#F2F1EF'
  text-secondary: '#A5ABAF'
  text-disabled: '#5C6266'
  report-elevator: '#F2A93B'
  report-construction: '#FF8C42'
  report-event: '#9B87E0'
  report-hazard: '#EF4B4B'
  report-closure: '#7C8B9A'
  report-other: '#4FC3D9'
  poi-buildings: '#8FA3B0'
  poi-dining: '#FF9F5A'
  poi-printers: '#5AA9E6'
  poi-accessibility: '#4ECB71'
  semantic-success: '#4ADE80'
  semantic-error: '#F87171'
  semantic-warning: '#FBBF24'
  semantic-info: '#60A5FA'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0em
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: 0em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  space-2xs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.25rem
  space-2xl: 1.5rem
  space-3xl: 2rem
  space-4xl: 2.5rem
  gutter-mobile: 1rem
  sheet-max-width: 30rem
---

## Brand & Style

The design system powers an interactive mobile GIS wayfinding and real-time situational reporting tool for the University of Oklahoma campus community. The visual language bridges academic tradition with high-velocity urban mobility, borrowing the clarity and responsiveness of contemporary navigation apps (Waze, Google Maps) while celebrating authentic Sooner identity.

The target audience encompasses undergraduate and graduate students, faculty, staff, accessibility-dependent campus visitors, and game-day guests navigating Norman, OK under dynamic constraints (construction, pedestrian closures, elevator outages, parking changes).

The aesthetic direction combines **Dark Modernism** with **Tactile GIS Utility**:
- Deep low-glare obsidian backdrops engineered for bright outdoor sun-to-shadow transitions and nighttime foot travel.
- Tactile, elevated sheet tiers with crisp dark outlines that separate map vectors from rich dynamic overlays.
- Restrained, intentional deployment of OU Crimson (`#841617`) for brand anchors and collegiate authority, paired with dynamic Crimson Bright (`#D6293C`) for high-contrast, immediate interactive targets.
- Functional color segregation across dynamic community reporting and static point-of-interest (POI) discovery, ensuring maximum legibility under rapid glance conditions.

## Colors

The palette operates in strict dark mode to preserve night adaptation during evening campus travel and conserve battery during active GPS navigation sessions.

### Application Rules
- **Crimson Bright (`#D6293C`) vs. Brand Crimson (`#841617`)**: Authentic institutional crimson (`#841617`) fails WCAG AA minimum contrast when used as a button background behind text on dark surfaces. Consequently, `#841617` is reserved exclusively for non-text brand crests, persistent top header banners, subtle track lines, and inactive state borders. All primary interactive calls to action, floating action buttons (FABs), wayfinding route vectors, and high-priority action badges utilize `crimsonBright` (`#D6293C`).
- **Cream (`#F0E6D2`)**: Functions as the authentic collegiate secondary highlight, applied to pin badges, verified location tags, and subtle typographic ornaments.
- **Surface Elevation Hierarchy**: 
  - Canvas base map renders at `background` (`#101214`).
  - Standard floating elements, search bars, bottom navigation, and docked sheet containers sit at `surface` (`#1A1D1F`).
  - Overlaid dialogs, expanded peek drawers, filter pills, and active sheet items rest on `surfaceElevated` (`#242729`).
  - Structural separators and stroke borders consistently leverage `border` (`#2E3234`).
- **Data Visualization & Layering**: POI category tokens (`poi-*`) and incident report tokens (`report-*`) must never be modified in hue. They provide dual-channel luminance and chromatic contrast against the dark base map, maintaining immediate legibility under transit stress and varying color vision capacities.

## Typography

Typography is set exclusively in **Plus Jakarta Sans**, providing crisp geometric forms, high x-height, and generous counters that remain legible when glancing at a phone mounted on a scooter handlebars or while walking outdoors across the South Oval.

### Hierarchy & Type Governance
- **Headlines (`display-lg`, `headline-lg`, `headline-md`)**: Used for building titles, navigation state readouts, destination announcements, and screen titles. Bold and medium weights feature slightly condensed negative tracking to retain compact structural integrity in tight mobile drawers.
- **Titles & Body Text (`title-md`, `body-lg`, `body-md`, `body-sm`)**: Used for step-by-step navigation cues, route duration notes, incident feed descriptions, and floor-level details. Always set in `textPrimary` (`#F2F1EF`) for primary text and `textSecondary` (`#A5ABAF`) for contextual metadata.
- **Labels (`label-lg`, `label-md`, `label-sm`)**: High-contrast, letter-spaced uppercase or semi-bold forms used for map POI markers, ETA pills, live badge alerts, category pills, and bottom navigation labels.

## Layout & Spacing

The layout system is tailored for a responsive, single-handed mobile navigation experience built on an 8pt base grid (with 4pt sub-increments for compact navigation metrics).

### Screen Ergonomics & Structure
- **Base Canvas**: The interactive MapGL layer occupies a fluid 100vw × 100vh viewport anchored at the `background` level (`#101214`).
- **Floating Overlays**:
  - **Top Anchor**: Floating search header and horizontal category filter rail sit 12px below device status bars with 16px lateral padding (`gutter-mobile`).
  - **Bottom Anchor**: Multi-position swipeable bottom sheet (peek 88px, half 45vh, expanded 85vh) bounded to a maximum width of `30rem` (`sheet-max-width`) centered on larger viewports.
  - **Floating Action Deck**: Placed 16px above the resting bottom sheet, stacked vertically on the right margin with an 8px gutter (Location centering, 3D compass, Report Incident).
- **Touch Target Rules**: Every interactive element adheres to a strict minimum hit target of 44×44px (with 48×48px preferred for critical driving/walking navigation prompts).

## Elevation & Depth

Visual depth utilizes a hybrid model of **Tonal Layering** accompanied by **Subtle Ambient Boundary Glows** and ultra-crisp 1px containment borders (`#2E3234`). Because the canvas is dark, traditional blurred drop-shadows lack sufficient separation; structural borders and surface luminance stepping convey height.

### Elevation Levels
- **Level 0 (Map Base - `#101214`)**: Flat canvas hosting raster tiles, vector paths, geofences, and ground pins.
- **Level 1 (Docked Chrome - `#1A1D1F`)**: Bottom navigation bar, collapsed bottom search sheet, and standard non-modal campus feed cards. Framed by a 1px solid top border in `#2E3234`.
- **Level 2 (Floating Action Layer - `#242729`)**: FABs, dynamic filter chips, ETA chips, and route instruction heads. Elevated by a 1px perimeter border (`#2E3234`) and an ambient tinted drop shadow: `0 8px 24px rgba(0, 0, 0, 0.55), 0 2px 4px rgba(0, 0, 0, 0.4)`.
- **Level 3 (Modal Alerts & Expanded Sheets - `#242729`)**: Urgent community hazard cards, elevator outage reporting modals, and full turn-by-turn lists. Enriched with `0 16px 36px rgba(0, 0, 0, 0.75)` and a subtle `0.5px` inner highlight border (`rgba(255, 255, 255, 0.08)`).

## Shapes

The design system implements **Rounded (Level 2)** geometry:
- **Base Radii (0.5rem / 8px)**: Input fields, POI informational cards, map layer badges, and route segment selectors.
- **Large Radii (1rem / 16px)**: Floating search bar container, modal alert frames, and campus building detail cards.
- **Extra Large Radii (1.5rem / 24px)**: Top corners of draggable bottom sheets, modal drawers, and major navigation panels.
- **Full Pill (`9999px`)**: Interactive filter chips, incident report tags, quick-action chips (e.g., "Find Food", "Open Labs"), and Floating Action Buttons (FABs).

## Components

### 1. Buttons & Floating Actions (FAB)
- **Primary Buttons & FAB**: Filled with `crimsonBright` (`#D6293C`), text and glyphs in `#F2F1EF` (Font: `label-lg`, weight 700). Active state shifts to `#B81D2E`. Tap target minimum 48px height. FAB features circular geometry with a 1px top border in `rgba(255, 255, 255, 0.2)`.
- **Secondary Buttons**: Background in `surfaceElevated` (`#242729`), border 1px solid `border` (`#2E3234`), text in `textPrimary` (`#F2F1EF`).
- **Destructive / Urgent Action**: Background in `report-hazard` (`#EF4B4B`), text in `#FFFFFF`.

### 2. Search Bar & Input Fields
- Floating search header styled with `surface` (`#1A1D1F`), 1px border `#2E3234`, corner radius `1rem`. Includes left search icon in `textSecondary` (`#A5ABAF`) and right voice/filter toggle. 
- Active input state triggers a 1.5px border glow in `crimsonBright` (`#D6293C`) and changes background to `surfaceElevated` (`#242729`).

### 3. Filter Chips & Report Badges
- **POI Layer Chips**: Horizontal scrolling rail. Default state: `surface` (`#1A1D1F`), border `#2E3234`, text `textSecondary` (`#A5ABAF`). Selected state: Border matches layer color (`poi-dining`, `poi-printers`, `poi-accessibility`), text switches to `textPrimary` (`#F2F1EF`) with a 15% opacity layer-color background wash.
- **Incident Report Badges**: Compact pill containing category icon and count. Border and icon color strictly match the category token (`report-elevator`, `report-construction`, etc.).

### 4. Interactive Bottom Sheet
- Surfaces dynamic campus POI and routing step cards. Background is `surface` (`#1A1D1F`), with a centered drag handle bar (36×4px, radius `9999px`, background `border` `#2E3234`) positioned 8px from the top edge.
- Smooth snap points at Peek (88px), Mid (45%), and Full (85%).

### 5. Campus POI Cards & Wayfinding Turn Prompts
- Cards use `surface` (`#1A1D1F`) with 1px `border` (`#2E3234`) and 16px padding.
- Include a prominent title (`title-md`), distance indicator in `cream` (`#F0E6D2`), and wheelchair-accessible tags rendered in `poi-accessibility` (`#4ECB71`).
- Navigation cues highlight next turn direction with `crimsonBright` (`#D6293C`) lane arrows against `surfaceElevated` (`#242729`).