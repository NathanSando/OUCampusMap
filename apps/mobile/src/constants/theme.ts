/**
 * Design tokens — the single source of truth is docs/color-palette.md and
 * docs/design/design-system.md. Don't invent new colors in components; add them here.
 */

export const colors = {
  // Core surfaces
  background: '#101214',
  surface: '#1A1D1F',
  surfaceElevated: '#242729',
  border: '#2E3234',

  // Text
  textPrimary: '#F2F1EF',
  textSecondary: '#A5ABAF',
  textDisabled: '#5C6266',

  // Brand. crimson fails WCAG AA as a fill behind text on dark — use it for thin accents only.
  crimson: '#841617',
  crimsonBright: '#D6293C',
  crimsonPressed: '#B81D2E',
  cream: '#F0E6D2',

  // Semantic
  success: '#4ADE80',
  error: '#F87171',
  warning: '#FBBF24',
  info: '#60A5FA',

  white: '#FFFFFF',
  scrim: 'rgba(0, 0, 0, 0.55)',
} as const;

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;

/** Type scale from the Stitch design system. */
export const type = {
  displayLg: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 40, letterSpacing: -0.6 },
  headlineLg: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 34, letterSpacing: -0.4 },
  headlineMd: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  headlineSm: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24 },
  titleMd: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 },
  bodyLg: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  bodyMd: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  bodySm: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, letterSpacing: 0.1 },
  labelLg: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18, letterSpacing: 0.1 },
  labelMd: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
  labelSm: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: 0.4 },
} as const;

export type TypeVariant = keyof typeof type;

export const radius = { sm: 4, md: 8, lg: 16, xl: 24, full: 9999 } as const;

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

/** Minimum touch target (design doc §9.3). */
export const MIN_TAP = 44;

export const elevation = {
  level2: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 8,
  },
  level3: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.75,
    shadowRadius: 18,
    elevation: 16,
  },
} as const;
