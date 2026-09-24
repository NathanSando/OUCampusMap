# OU Campus Map — Color Palette (Dark Theme)

Single source of truth for color tokens across the app. Built around OU crimson as a sparing accent on a dark base, with distinguishable hues for report categories and map layers.

## Core surfaces

| Token | Hex | Use |
|---|---|---|
| `background` | `#101214` | App background, map container |
| `surface` | `#1A1D1F` | Cards, sheets, bottom nav |
| `surfaceElevated` | `#242729` | Modals, peek sheets, active tab |
| `border` | `#2E3234` | Dividers, card outlines |

## Text

| Token | Hex | Use |
|---|---|---|
| `textPrimary` | `#F2F1EF` | Headings, body |
| `textSecondary` | `#A5ABAF` | Metadata, timestamps |
| `textDisabled` | `#5C6266` | Disabled states |

## Brand / accent

| Token | Hex | Use |
|---|---|---|
| `crimson` | `#841617` | OU brand — logo, header accents, selected tab underline |
| `crimsonBright` | `#D6293C` | Primary buttons, FAB, links — true crimson is too low-contrast as a fill on dark bg |
| `cream` | `#F0E6D2` | Secondary accent, subtle highlights (OU's complementary color) |

## Report categories

Used on map pins, feed icons, and filter chips. Six hues chosen to stay distinguishable, including for common forms of color blindness.

| Category | Hex |
|---|---|
| Elevator outage | `#F2A93B` (amber) |
| Construction | `#FF8C42` (orange) |
| Event | `#9B87E0` (violet) |
| Hazard | `#EF4B4B` (red) |
| Closure | `#7C8B9A` (slate) |
| Other | `#4FC3D9` (teal) |

## Map POI layers

| Layer | Hex |
|---|---|
| Buildings | `#8FA3B0` (cool gray) |
| Dining | `#FF9F5A` |
| Printers | `#5AA9E6` |
| Accessibility | `#4ECB71` |

## Semantic states

| State | Hex |
|---|---|
| Success / upvote | `#4ADE80` |
| Error | `#F87171` |
| Warning | `#FBBF24` |
| Info | `#60A5FA` |

## Notes

- Real OU crimson (`#841617`) fails WCAG AA contrast as a *fill* behind text on `#101214`. Use it for thin accents (underlines, borders, logo) and reach for `crimsonBright` for anything tappable.
- Category colors are separated by both hue and lightness so they hold up under color-blindness simulation, not just on a normal display.
- Keep this as the one file the team references so five people don't invent five different reds — pairs with the `src/constants/categories.ts` plan in the design doc.
