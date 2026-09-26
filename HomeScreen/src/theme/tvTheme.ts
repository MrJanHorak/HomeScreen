export const colors = {
  // Backgrounds
  background: '#0F172A',
  surface: '#1E293B',
  surfaceOpacity: 'rgba(30, 41, 59, 0.6)',
  surfaceFocused: '#334155',
  surfaceFocusedOpacity: 'rgba(51, 65, 85, 0.6)',

  // Focus & Accent Indicators
  focusRing: '#38BDF8',
  focusGlow: 'rgba(56, 189, 248, 0.4)',
  accent: '#F59E0B',

  // Text
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textFocused: '#FFFFFF',
} as const;

export const spacing = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
  xxl: 64,
  // TV Safe Area Padding (Overscan Protection)
  safeHorizontal: 56,
  safeVertical: 40,
} as const;

export const typography = {
  headerLg: {
    fontSize: 52,
    lineHeight: 64,
    fontWeight: '700' as const,
  },
  headerMd: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
} as const;

export const tvAnimation = {
  // TV focus transformations should feel instant yet smooth
  focusScale: 1.06,
  durationFast: 150,
} as const;

export const TVTheme = {
  colors,
  spacing,
  typography,
  tvAnimation,
};

export type TVThemeType = typeof TVTheme;
