export const colors = {
  // Backgrounds
  background: '#0F172A',
  backgroundOverlay: 'rgba(15, 23, 42, 0.6)',
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

  // Glassmorphism tokens
  glassSurface: 'rgba(15, 23, 42, 0.58)',
  modalSurface: 'rgba(15, 23, 42, 0.88)',
  glassSurfaceFocused: 'rgba(30, 48, 80, 0.72)',
  glassBorder: 'rgba(255, 255, 255, 0.14)',
  glassBorderTop: 'rgba(255, 255, 255, 0.25)',
  glassHighlight: 'rgba(255, 255, 255, 0.08)',
  glassSubtle: 'rgba(255, 255, 255, 0.05)',
  glassChip: 'rgba(255, 255, 255, 0.1)',
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

export type TVThemeType = Omit<typeof TVTheme, 'colors'> & {
  colors: { -readonly [K in keyof typeof colors]: string };
};

export const PALETTES = {
  night: { label: 'Night Sky', colors: {} },
  forest: {
    label: 'Forest',
    colors: {
      background: '#0C1E1A', backgroundOverlay: 'rgba(7, 32, 26, 0.72)',
      surface: '#18382F', surfaceFocused: '#265244',
      glassSurface: 'rgba(10, 40, 32, 0.74)',
      modalSurface: 'rgba(10, 40, 32, 0.93)',
      glassSurfaceFocused: 'rgba(25, 75, 58, 0.82)',
      focusRing: '#86E3BB', focusGlow: 'rgba(134, 227, 187, 0.42)',
      accent: '#F5CC83', textSecondary: '#BED9CF',
    },
  },
  plum: {
    label: 'Plum',
    colors: {
      background: '#20152E', backgroundOverlay: 'rgba(31, 18, 47, 0.74)',
      surface: '#352443', surfaceFocused: '#503460',
      glassSurface: 'rgba(44, 24, 59, 0.76)',
      modalSurface: 'rgba(44, 24, 59, 0.93)',
      glassSurfaceFocused: 'rgba(72, 43, 90, 0.82)',
      focusRing: '#E3B5FF', focusGlow: 'rgba(227, 181, 255, 0.42)',
      accent: '#FFD39C', textSecondary: '#D7C5DF',
    },
  },
  contrast: {
    label: 'High Contrast',
    colors: {
      background: '#050505', backgroundOverlay: 'rgba(0, 0, 0, 0.88)',
      surface: '#111111', surfaceFocused: '#292929',
      glassSurface: 'rgba(0, 0, 0, 0.94)',
      modalSurface: '#000000',
      glassSurfaceFocused: 'rgba(22, 22, 22, 0.98)',
      glassBorder: '#FFFFFF', glassBorderTop: '#FFFFFF',
      focusRing: '#FDE047', focusGlow: 'rgba(253, 224, 71, 0.5)',
      accent: '#FDE047', textPrimary: '#FFFFFF',
      textSecondary: '#E5E5E5', textFocused: '#FFFFFF',
    },
  },
} as const;

export type PaletteId = keyof typeof PALETTES;

export type PaletteChoice = PaletteId | 'custom';

export function normalizeHexColor(value: string): string | null {
  const hex = value.trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(hex) ? hex : null;
}

function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)) as [number, number, number];
}

function colorFromRgb(channels: number[]): string {
  return `#${channels.map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

function blend(color: string, target: string, amount: number): string {
  const start = rgb(color);
  const end = rgb(target);
  return colorFromRgb(start.map((channel, index) => channel * (1 - amount) + end[index] * amount));
}

function luminance(hex: string): number {
  const [red, green, blue] = rgb(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

export function displayAccentColor(hex: string): string {
  let result = hex;
  const backdrop = luminance('#0F172A');
  for (let step = 0; step < 10 && (luminance(result) + 0.05) / (backdrop + 0.05) < 4.5; step++) {
    result = blend(result, '#FFFFFF', 0.15);
  }
  return result;
}

export function displayBackgroundColor(hex: string): string {
  let result = normalizeHexColor(hex) || '#0F172A';
  for (let step = 0; step < 12 && luminance(result) > 0.05; step++) {
    result = blend(result, '#000000', 0.15);
  }
  return result;
}

export function themeForPalette(
  palette: PaletteChoice,
  customAccent = '#38BDF8',
  backgroundColor = '#0F172A',
  backgroundMode: 'photo' | 'solid' | 'google-photo' = 'photo'
): TVThemeType {
  const paletteColors = palette === 'custom' ? {} : PALETTES[palette].colors;
  const result: TVThemeType['colors'] = { ...colors, ...paletteColors };
  if (palette === 'custom') {
    const accent = displayAccentColor(normalizeHexColor(customAccent) || '#38BDF8');
    const [red, green, blue] = rgb(accent);
    result.focusRing = accent;
    result.accent = accent;
    result.focusGlow = `rgba(${red}, ${green}, ${blue}, 0.45)`;
  }
  if (backgroundMode === 'solid') {
    result.background = displayBackgroundColor(backgroundColor);
  }
  return { ...TVTheme, colors: result };
}
